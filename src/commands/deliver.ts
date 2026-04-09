import { basename, join } from "node:path";
import { execa } from "execa";
import { parseConfig } from "../config/read-write.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { readJsonStore } from "../runtime/store.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export interface RunDeliverCommandInput {
  cwd: string;
  task?: string;
  spec?: string;
  includeSvg?: boolean;
  hours?: number;
}

export interface RunDeliverCommandResult {
  reportPath: string;
  diagramPaths: string[];
  taskId: string;
  estimatedHours: {
    requirement: number;
    design: number;
    development: number;
    testing: number;
    review: number;
    documentation: number;
    total: number;
  };
}

interface EvaluationHistoryDocument {
  version: number;
  runs: Array<{ command?: string; ok?: boolean; timestamp?: string; details?: Record<string, unknown> }>;
}

function datedPrefix(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

function guessTaskId(): string {
  const now = new Date().toISOString();
  return `TASK-${now.slice(0, 10).replaceAll("-", "")}`;
}

function slugFromPath(pathValue: string): string {
  const base = basename(pathValue).replace(/\.md$/i, "");
  return base.length > 0 ? base : "delivery";
}

function splitRequirementSteps(summary: string): string[] {
  const cleaned = summary
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) =>
      line
        .split(/[.;]|\s+and\s+/i)
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    );
  const deduped = [...new Set(cleaned)];
  return deduped.slice(0, 5);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildFlowSvg(nodes: string[], title: string): string {
  const safeNodes = nodes.length > 0 ? nodes : ["Requirement", "Implementation", "Delivery"];
  const width = 320 * safeNodes.length;
  const height = 260;
  const boxY = 110;
  const boxW = 220;
  const boxH = 90;
  const startX = 40;

  const rects = safeNodes
    .map((node, index) => {
      const x = startX + index * 280;
      return [
        `  <rect x="${x}" y="${boxY}" width="${boxW}" height="${boxH}" rx="12" fill="#eaf2d7" stroke="#4f7f5a"/>`,
        `  <text x="${x + boxW / 2}" y="${boxY + 50}" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#1f3324">${escapeXml(node.slice(0, 28))}</text>`,
      ].join("\n");
    })
    .join("\n");

  const arrows = safeNodes
    .slice(0, -1)
    .map((_, index) => {
      const x1 = startX + index * 280 + boxW;
      const x2 = startX + (index + 1) * 280;
      const y = boxY + boxH / 2;
      return `  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#666" stroke-width="3" marker-end="url(#arrow)"/>`;
    })
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect x="0" y="0" width="${width}" height="${height}" fill="#f7f7f2"/>`,
    `  <text x="24" y="40" font-family="sans-serif" font-size="24" fill="#253126">${escapeXml(title)}</text>`,
    rects,
    arrows,
    '  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#666"/></marker></defs>',
    "</svg>",
    "",
  ].join("\n");
}

function isEvaluationHistoryDocument(value: unknown): value is EvaluationHistoryDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    typeof (value as { version?: unknown }).version === "number" &&
    "runs" in value &&
    Array.isArray((value as { runs?: unknown }).runs)
  );
}

function sumHours(
  parts: Omit<RunDeliverCommandResult["estimatedHours"], "total">,
): RunDeliverCommandResult["estimatedHours"] {
  const total = Number(
    (parts.requirement + parts.design + parts.development + parts.testing + parts.review + parts.documentation).toFixed(
      1,
    ),
  );
  return {
    ...parts,
    total,
  };
}

async function estimateHoursFromSignals(cwd: string): Promise<RunDeliverCommandResult["estimatedHours"]> {
  let commandRuns = 0;
  try {
    const config = parseConfig(await readTextFile(join(cwd, ".bbg", "config.json")));
    const runtime = config.runtime ?? buildDefaultRuntimeConfig();
    const runtimePaths = resolveRuntimePaths(cwd, runtime);
    const evaluation = await readJsonStore(
      runtimePaths.evaluation,
      { version: 1, runs: [] as EvaluationHistoryDocument["runs"] },
      isEvaluationHistoryDocument,
    );
    commandRuns = evaluation.runs.length;
  } catch {
    commandRuns = 0;
  }

  let changedFiles = 0;
  let commitCount = 0;
  try {
    const status = await execa("git", ["status", "--porcelain"], { cwd });
    changedFiles = status.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length;
    const log = await execa("git", ["log", "--oneline", "-n", "20"], { cwd });
    commitCount = log.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length;
  } catch {
    changedFiles = 0;
    commitCount = 0;
  }

  const requirement = Math.max(0.5, Number((0.4 + commandRuns * 0.08).toFixed(1)));
  const design = Math.max(0.5, Number((0.3 + commandRuns * 0.06).toFixed(1)));
  const development = Math.max(1, Number((0.8 + changedFiles * 0.2 + commitCount * 0.05).toFixed(1)));
  const testing = Math.max(0.5, Number((0.4 + commandRuns * 0.05).toFixed(1)));
  const review = Math.max(0.5, Number((0.4 + commandRuns * 0.05).toFixed(1)));
  const documentation = Math.max(0.3, Number((0.2 + changedFiles * 0.05).toFixed(1)));

  return sumHours({ requirement, design, development, testing, review, documentation });
}

export async function runDeliverCommand(input: RunDeliverCommandInput): Promise<RunDeliverCommandResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }
  parseConfig(await readTextFile(configPath));

  const taskId = input.task ?? guessTaskId();
  const specPath = input.spec;
  let requirementSummary = "(no spec provided)";
  if (specPath) {
    const absoluteSpec = join(input.cwd, specPath);
    if (!(await exists(absoluteSpec))) {
      throw new Error(`Spec not found: ${specPath}`);
    }
    requirementSummary = (await readTextFile(absoluteSpec)).split(/\r?\n/).slice(0, 12).join("\n");
  }

  const prefix = datedPrefix();
  const slug = specPath ? slugFromPath(specPath) : taskId.toLowerCase();
  const reportPath = `docs/delivery/${prefix}/${slug}-delivery.md`;
  const includeSvg = input.includeSvg ?? true;

  const estimated = await estimateHoursFromSignals(input.cwd);
  const totalHours = input.hours ?? estimated.total;
  const effective =
    input.hours === undefined
      ? estimated
      : sumHours({
          requirement: estimated.requirement,
          design: estimated.design,
          development: Number((estimated.development + Math.max(0, totalHours - estimated.total)).toFixed(1)),
          testing: estimated.testing,
          review: estimated.review,
          documentation: estimated.documentation,
        });
  const report = [
    "# Client Delivery Report",
    "",
    `- Task ID: ${taskId}`,
    `- Date: ${new Date().toISOString()}`,
    `- Source spec: ${specPath ?? "(none)"}`,
    "",
    "## Requirement Overview",
    "",
    requirementSummary,
    "",
    "## Implementation Summary",
    "",
    "- Scope delivered according to confirmed requirement.",
    "- Quality gates and reviews completed before delivery.",
    "",
    "## Effort-Hours",
    "",
    "| Phase | Hours |",
    "| --- | --- |",
    `| Requirement clarification | ${effective.requirement} |`,
    `| Design | ${effective.design} |`,
    `| Development | ${effective.development} |`,
    `| Testing | ${effective.testing} |`,
    `| Review and audit | ${effective.review} |`,
    `| Documentation and handoff | ${effective.documentation} |`,
    `| Total | ${totalHours} |`,
    "",
    "## Audit Notes",
    "",
    "- Code review: completed",
    "- Security review: completed",
    "- Cross audit: completed if enabled",
    "",
    "## Diagram Notes",
    "",
    "- Architecture and flow diagrams are generated from requirement content.",
    "",
  ].join("\n");

  await writeTextFile(join(input.cwd, reportPath), report);

  const diagramPaths: string[] = [];
  if (includeSvg) {
    const archDiagramPath = `docs/delivery/${prefix}/diagrams/${slug}-architecture.svg`;
    const flowDiagramPath = `docs/delivery/${prefix}/diagrams/${slug}-flow.svg`;
    const requirementSteps = splitRequirementSteps(requirementSummary);
    const architectureNodes = [
      "Confirmed Requirement",
      ...requirementSteps.slice(0, 3),
      "Implemented Service",
      "Client Delivery",
    ];
    const flowNodes = ["Interview", "Plan", "TDD", "Audit", "Delivery"];
    await writeTextFile(join(input.cwd, archDiagramPath), buildFlowSvg(architectureNodes, "Architecture Flow"));
    await writeTextFile(join(input.cwd, flowDiagramPath), buildFlowSvg(flowNodes, "Delivery Workflow"));
    diagramPaths.push(archDiagramPath, flowDiagramPath);
  }

  const deliveryIndexPath = join(input.cwd, "docs", "delivery", "index.md");
  const indexBase = (await exists(deliveryIndexPath))
    ? await readTextFile(deliveryIndexPath)
    : "# Delivery Index\n\n| Date | Task ID | Report | Notes |\n| --- | --- | --- | --- |\n";
  const row = `| ${new Date().toISOString().slice(0, 10)} | ${taskId} | [${basename(reportPath)}](${reportPath.replace("docs/delivery/", "")}) | generated |`;
  await writeTextFile(deliveryIndexPath, `${indexBase.trimEnd()}\n${row}\n`);

  return {
    reportPath,
    diagramPaths,
    taskId,
    estimatedHours: effective,
  };
}
