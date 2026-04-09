import { basename, join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export interface RunCrossAuditCommandInput {
  cwd: string;
  primaryModel?: string;
  crossModel: string;
  scope?: string[];
  from?: string[];
}

export interface RunCrossAuditCommandResult {
  reportPath: string;
  reportJsonPath: string;
  verdict: "PASS" | "CONDITIONAL" | "BLOCK";
  agreementRate: number;
  conflicts: number;
  unresolvedCriticalOrHigh: number;
}

interface FindingSummary {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  filePath: string;
  rule: string;
  description: string;
}

interface AuditReconciliation {
  agreed: Array<{ key: string; primary: FindingSummary; cross: FindingSummary }>;
  conflicts: Array<{ key: string; primary: FindingSummary; cross: FindingSummary }>;
  primaryOnly: Array<{ key: string; finding: FindingSummary }>;
  crossOnly: Array<{ key: string; finding: FindingSummary }>;
}

interface StructuredAuditFinding {
  id?: string;
  severity: "critical" | "high" | "medium" | "low";
  filePath: string;
  rule: string;
  description: string;
}

interface StructuredAuditDocument {
  findings: StructuredAuditFinding[];
}

function datedPrefix(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:]/g, "-").slice(0, 19);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSeverity(value: unknown): value is StructuredAuditFinding["severity"] {
  return value === "critical" || value === "high" || value === "medium" || value === "low";
}

function isStructuredAuditFinding(value: unknown): value is StructuredAuditFinding {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value.id === undefined || typeof value.id === "string") &&
    isSeverity(value.severity) &&
    typeof value.filePath === "string" &&
    typeof value.rule === "string" &&
    typeof value.description === "string"
  );
}

function isStructuredAuditDocument(value: unknown): value is StructuredAuditDocument {
  if (!isRecord(value) || !Array.isArray(value.findings)) {
    return false;
  }
  return value.findings.every((finding) => isStructuredAuditFinding(finding));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9./:_-]+/g, " ")
    .trim();
}

function inferSeverity(text: string): FindingSummary["severity"] | null {
  const normalized = text.toLowerCase();
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";
  return null;
}

function inferFilePath(text: string): string {
  const matches = text.match(/[a-zA-Z0-9._/-]+\.[a-zA-Z0-9]+/g) ?? [];
  const candidate = matches.find((match) => match.includes("/")) ?? matches[0];
  return candidate ?? "unknown";
}

function inferRule(text: string): string {
  const bracketRule = text.match(/\[([a-z0-9._-]{2,})\]/i)?.[1];
  if (bracketRule) {
    return bracketRule.toLowerCase();
  }
  const known = text.match(/(sql-injection|xss|path-traversal|auth|validation|null-check|error-handling)/i)?.[1];
  return known ? known.toLowerCase() : "general";
}

function buildFindingKey(finding: Omit<FindingSummary, "id">): string {
  const normalizedDesc = normalizeText(
    finding.description
      .replace(/\bcritical\b/gi, "")
      .replace(/\bhigh\b/gi, "")
      .replace(/\bmedium\b/gi, "")
      .replace(/\blow\b/gi, ""),
  ).slice(0, 120);
  return [finding.filePath.toLowerCase(), finding.rule.toLowerCase(), normalizedDesc].join("|");
}

function parseTableRowFinding(line: string, source: string): FindingSummary | null {
  if (!line.trim().startsWith("|")) {
    return null;
  }
  const cells = line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  if (cells.length < 3) {
    return null;
  }
  const joined = cells.join(" ");
  const severity = inferSeverity(joined);
  if (!severity) {
    return null;
  }
  const filePath = inferFilePath(joined);
  const rule = inferRule(joined);
  const description = cells.at(-1) ?? joined;
  const key = buildFindingKey({ severity, source, filePath, rule, description });
  return {
    id: `${source}:${key}`,
    severity,
    source,
    filePath,
    rule,
    description,
  };
}

function parseBulletFinding(line: string, source: string): FindingSummary | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("-") && !trimmed.startsWith("*")) {
    return null;
  }
  const severity = inferSeverity(trimmed);
  if (!severity) {
    return null;
  }
  const filePath = inferFilePath(trimmed);
  const rule = inferRule(trimmed);
  const description = trimmed.replace(/^[-*]\s*/, "").trim();
  const key = buildFindingKey({ severity, source, filePath, rule, description });
  return {
    id: `${source}:${key}`,
    severity,
    source,
    filePath,
    rule,
    description,
  };
}

function extractFindings(markdown: string, source: string): FindingSummary[] {
  const lines = markdown.split(/\r?\n/);
  const findings: FindingSummary[] = [];
  for (const line of lines) {
    const parsed = parseTableRowFinding(line, source) ?? parseBulletFinding(line, source);
    if (parsed) {
      findings.push(parsed);
    }
  }
  return findings;
}

function extractStructuredFindings(document: StructuredAuditDocument, source: string): FindingSummary[] {
  return document.findings.map((finding) => {
    const key = buildFindingKey({
      severity: finding.severity,
      source,
      filePath: finding.filePath || "unknown",
      rule: finding.rule || "general",
      description: finding.description || "",
    });

    return {
      id: finding.id && finding.id.trim().length > 0 ? finding.id : `${source}:${key}`,
      severity: finding.severity,
      source,
      filePath: finding.filePath || "unknown",
      rule: finding.rule || "general",
      description: finding.description || "",
    };
  });
}

function compareSeverity(left: FindingSummary["severity"], right: FindingSummary["severity"]): "agreed" | "conflict" {
  return left === right ? "agreed" : "conflict";
}

function reconcileFindings(primary: FindingSummary[], cross: FindingSummary[]): AuditReconciliation {
  const primaryMap = new Map<string, FindingSummary>();
  const crossMap = new Map<string, FindingSummary>();

  for (const finding of primary) {
    const key = buildFindingKey(finding);
    if (!primaryMap.has(key)) {
      primaryMap.set(key, finding);
    }
  }
  for (const finding of cross) {
    const key = buildFindingKey(finding);
    if (!crossMap.has(key)) {
      crossMap.set(key, finding);
    }
  }

  const agreed: AuditReconciliation["agreed"] = [];
  const conflicts: AuditReconciliation["conflicts"] = [];
  const primaryOnly: AuditReconciliation["primaryOnly"] = [];
  const crossOnly: AuditReconciliation["crossOnly"] = [];

  const allKeys = new Set<string>([...primaryMap.keys(), ...crossMap.keys()]);
  for (const key of allKeys) {
    const primaryFinding = primaryMap.get(key);
    const crossFinding = crossMap.get(key);
    if (primaryFinding && crossFinding) {
      if (compareSeverity(primaryFinding.severity, crossFinding.severity) === "agreed") {
        agreed.push({ key, primary: primaryFinding, cross: crossFinding });
      } else {
        conflicts.push({ key, primary: primaryFinding, cross: crossFinding });
      }
      continue;
    }
    if (primaryFinding) {
      primaryOnly.push({ key, finding: primaryFinding });
    }
    if (crossFinding) {
      crossOnly.push({ key, finding: crossFinding });
    }
  }

  return { agreed, conflicts, primaryOnly, crossOnly };
}

function summarizeVerdict(findings: FindingSummary[], conflicts: number): "PASS" | "CONDITIONAL" | "BLOCK" {
  const unresolvedCriticalOrHigh = findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length;
  if (unresolvedCriticalOrHigh > 0 || conflicts > 0) {
    return unresolvedCriticalOrHigh > 0 ? "BLOCK" : "CONDITIONAL";
  }
  return "PASS";
}

export async function runCrossAuditCommand(input: RunCrossAuditCommandInput): Promise<RunCrossAuditCommandResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }
  parseConfig(await readTextFile(configPath));

  const primaryModel = (input.primaryModel ?? "auto").trim();
  const crossModel = input.crossModel.trim();
  if (crossModel.length === 0) {
    throw new Error("cross-audit requires --cross-model.");
  }
  if (primaryModel.toLowerCase() === crossModel.toLowerCase()) {
    throw new Error("cross-audit requires different primary and cross models.");
  }

  const sources = input.from ?? [];
  const artifacts = await Promise.all(
    sources.map(async (relativePath) => {
      const absolutePath = join(input.cwd, relativePath);
      if (!(await exists(absolutePath))) {
        throw new Error(`cross-audit source not found: ${relativePath}`);
      }
      return {
        source: relativePath,
        content: await readTextFile(absolutePath),
      };
    }),
  );

  const findingsBySource = artifacts.map((artifact) => ({
    source: basename(artifact.source),
    findings: (() => {
      if (artifact.source.toLowerCase().endsWith(".json")) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(artifact.content) as unknown;
        } catch {
          throw new Error(`Invalid JSON audit source: ${artifact.source}`);
        }
        if (!isStructuredAuditDocument(parsed)) {
          throw new Error(`Invalid structured audit format: ${artifact.source}`);
        }
        return extractStructuredFindings(parsed, basename(artifact.source));
      }

      return extractFindings(artifact.content, basename(artifact.source));
    })(),
  }));

  const primaryFindings = findingsBySource[0]?.findings ?? [];
  const crossFindings = findingsBySource.slice(1).flatMap((entry) => entry.findings);
  const fallbackCrossFindings = crossFindings.length > 0 ? crossFindings : primaryFindings;
  const reconciliation = reconcileFindings(primaryFindings, fallbackCrossFindings);

  const considered =
    reconciliation.agreed.length +
    reconciliation.conflicts.length +
    reconciliation.primaryOnly.length +
    reconciliation.crossOnly.length;
  const agreementRate = Number((reconciliation.agreed.length / Math.max(1, considered)).toFixed(3));
  const allFindings = [...primaryFindings, ...fallbackCrossFindings];
  const unresolvedCriticalOrHigh = allFindings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length;
  const conflicts = reconciliation.conflicts.length;
  const verdict = summarizeVerdict(allFindings, conflicts);

  const prefix = datedPrefix();
  const slug = `cross-audit-${timestampSlug()}`;
  const reportPath = `docs/reports/${prefix}/${slug}.md`;
  const reportJsonPath = `docs/reports/${prefix}/${slug}.json`;
  const report = [
    "# Cross Audit Report",
    "",
    `- Date: ${new Date().toISOString()}`,
    `- Primary model: ${primaryModel}`,
    `- Cross model: ${crossModel}`,
    `- Scope: ${(input.scope ?? ["code-review", "security-scan"]).join(", ")}`,
    "",
    "## Summary",
    "",
    `- Agreement rate: ${agreementRate}`,
    `- Agreed: ${reconciliation.agreed.length}`,
    `- Primary only: ${reconciliation.primaryOnly.length}`,
    `- Cross only: ${reconciliation.crossOnly.length}`,
    `- Conflicts: ${reconciliation.conflicts.length}`,
    `- Unresolved critical/high: ${unresolvedCriticalOrHigh}`,
    `- Verdict: ${verdict}`,
    "",
    "## Reconciliation Matrix",
    "",
    "| Category | Count |",
    "| --- | --- |",
    `| agreed | ${reconciliation.agreed.length} |`,
    `| primary-only | ${reconciliation.primaryOnly.length} |`,
    `| cross-only | ${reconciliation.crossOnly.length} |`,
    `| conflict | ${reconciliation.conflicts.length} |`,
    "",
    "## Conflicts",
    "",
    "| Key | Primary Severity | Cross Severity | File | Rule |",
    "| --- | --- | --- | --- | --- |",
    ...(reconciliation.conflicts.length > 0
      ? reconciliation.conflicts.map(
          (item) =>
            `| ${item.key.slice(0, 60)} | ${item.primary.severity} | ${item.cross.severity} | ${item.primary.filePath} | ${item.primary.rule} |`,
        )
      : ["| (none) | - | - | - | - |"]),
    "",
    "## Inputs",
    "",
    ...(sources.length > 0 ? sources.map((item) => `- ${item}`) : ["- (none provided)"]),
    "",
  ].join("\n");

  const jsonReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    models: {
      primary: primaryModel,
      cross: crossModel,
    },
    scope: input.scope ?? ["code-review", "security-scan"],
    summary: {
      agreementRate,
      conflicts,
      unresolvedCriticalOrHigh,
      verdict,
      agreed: reconciliation.agreed.length,
      primaryOnly: reconciliation.primaryOnly.length,
      crossOnly: reconciliation.crossOnly.length,
    },
    reconciliation: {
      agreed: reconciliation.agreed.map((item) => ({
        key: item.key,
        primary: item.primary,
        cross: item.cross,
      })),
      conflicts: reconciliation.conflicts.map((item) => ({
        key: item.key,
        primary: item.primary,
        cross: item.cross,
      })),
      primaryOnly: reconciliation.primaryOnly,
      crossOnly: reconciliation.crossOnly,
    },
    inputs: sources,
  };

  await writeTextFile(join(input.cwd, reportPath), report);
  await writeTextFile(join(input.cwd, reportJsonPath), `${JSON.stringify(jsonReport, null, 2)}\n`);

  return {
    reportPath,
    reportJsonPath,
    verdict,
    agreementRate,
    conflicts,
    unresolvedCriticalOrHigh,
  };
}
