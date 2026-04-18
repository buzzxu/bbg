import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { collectWorkspaceFiles } from "./workspace-files.js";
import { writeJsonStore } from "./store.js";
import { exists, readTextFile } from "../utils/fs.js";

export interface DocGardenFinding {
  docPath: string;
  type: "stale-reference" | "missing-reference";
  reference: string;
  message: string;
}

export interface DocGardenReport {
  version: number;
  generatedAt: string;
  docsScanned: number;
  findings: DocGardenFinding[];
}

const DOC_GARDEN_REPORT_PATH = ".bbg/doc-garden/latest.json";
const DOC_ROOTS = ["docs"];
const ROOT_DOC_FILES = ["AGENTS.md", "RULES.md", "README.md", "CLAUDE.md"];

function normalizeRelativePath(cwd: string, filePath: string): string {
  return relative(cwd, filePath).split("\\").join("/");
}

function extractLocalReferences(content: string): string[] {
  const refs = new Set<string>();
  const markdownLinks = /\]\(([^)]+)\)/g;
  const codePaths = /`([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)`/g;

  for (const pattern of [markdownLinks, codePaths]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];
      if (!ref || ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("#")) {
        continue;
      }
      refs.add(ref);
    }
  }

  return [...refs];
}

async function collectDocFiles(cwd: string): Promise<string[]> {
  const files = (await collectWorkspaceFiles(cwd)).filter((filePath) => extname(filePath).toLowerCase() === ".md");
  return files.filter((filePath) => {
    const rel = normalizeRelativePath(cwd, filePath);
    return ROOT_DOC_FILES.includes(basename(rel)) || DOC_ROOTS.some((root) => rel.startsWith(`${root}/`));
  });
}

async function resolveReference(cwd: string, docPath: string, reference: string): Promise<string | null> {
  const candidates = [resolve(join(docPath, ".."), reference), resolve(cwd, reference)];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function runDocGardenScan(cwd: string): Promise<DocGardenReport> {
  const findings: DocGardenFinding[] = [];
  const docs = await collectDocFiles(cwd);

  for (const docPath of docs) {
    const content = await readTextFile(docPath);
    const docStats = await stat(docPath);

    for (const reference of extractLocalReferences(content)) {
      const resolved = await resolveReference(cwd, docPath, reference);
      if (resolved === null) {
        findings.push({
          docPath: normalizeRelativePath(cwd, docPath),
          type: "missing-reference",
          reference,
          message: `Referenced path does not exist: ${reference}`,
        });
        continue;
      }

      const targetStats = await stat(resolved);
      if (targetStats.mtimeMs > docStats.mtimeMs) {
        findings.push({
          docPath: normalizeRelativePath(cwd, docPath),
          type: "stale-reference",
          reference,
          message: `Referenced path changed after the document was last updated: ${reference}`,
        });
      }
    }
  }

  const report: DocGardenReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    docsScanned: docs.length,
    findings: findings.sort((left, right) => left.docPath.localeCompare(right.docPath) || left.reference.localeCompare(right.reference)),
  };

  await writeJsonStore(join(cwd, DOC_GARDEN_REPORT_PATH), report);
  return report;
}

export async function readLatestDocGardenReport(cwd: string): Promise<DocGardenReport | null> {
  const pathValue = join(cwd, DOC_GARDEN_REPORT_PATH);
  if (!(await exists(pathValue))) {
    return null;
  }

  return JSON.parse(await readTextFile(pathValue)) as DocGardenReport;
}

export async function listDocGardenReports(cwd: string): Promise<string[]> {
  const root = join(cwd, ".bbg", "doc-garden");
  if (!(await exists(root))) {
    return [];
  }

  return (await readdir(root)).sort();
}
