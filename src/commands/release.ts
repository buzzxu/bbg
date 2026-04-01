import { basename, join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { generateChangelog, appendToChangelog } from "../release/changelog.js";
import { readTextFile, writeTextFile } from "../utils/fs.js";
import { promptConfirm, promptInput } from "../utils/prompts.js";
import { runDoctor } from "./doctor.js";
import { runSync } from "./sync.js";

export interface RunReleaseInput {
  cwd: string;
  skipDoctor?: boolean;
  skipSync?: boolean;
  skipChangelog?: boolean;
}

export interface RunReleaseResult {
  version: string;
  checklistConfirmed: boolean;
  releaseFile: string;
  changelogGenerated: boolean;
  changelogPath?: string;
}

interface ChecklistItem {
  label: string;
  confirmed: boolean;
}

async function ensureChecklistFile(cwd: string): Promise<string> {
  const checklistPath = join(cwd, "docs", "workflows", "release-checklist.md");

  try {
    await readTextFile(checklistPath);
    return checklistPath;
  } catch {
    const config = parseConfig(await readTextFile(join(cwd, ".bbg", "config.json")));
    const repoItemLabels =
      config.repos.length > 0
        ? config.repos.map((repo, index) => {
            const safeName = repo.name.trim();
            return safeName.length > 0 ? safeName : `Repository #${index + 1}`;
          })
        : ["Confirm repository list is configured."];

    const repoItems = repoItemLabels.map((label) => `- [ ] ${label}`).join("\n");
    const fallback = [
      "# Release Checklist",
      "",
      "Run this checklist for each release cut.",
      "",
      "## Repository Set",
      "",
      repoItems,
      "",
      "## Preflight",
      "",
      "- [ ] Confirm doctor status",
      "- [ ] Confirm sync status",
      "- [ ] Confirm release notes are ready",
      "",
    ].join("\n");

    await writeTextFile(checklistPath, fallback);
    return checklistPath;
  }
}

function parseChecklistItems(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s*\[(?: |x|X)\]\s+(.+)$/)?.[1]?.trim() ?? "")
    .filter((line) => line.length > 0);
}

function toDateYmd(value: Date): string {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sanitizeVersionForFile(version: string): string {
  return version.trim().replace(/[^A-Za-z0-9._-]/g, "-") || "unknown";
}

function buildReleaseRecord(version: string, notes: string, items: ChecklistItem[]): string {
  const lines = [
    `# Release ${version}`,
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "## Notes",
    "",
    notes.trim().length > 0 ? notes.trim() : "(none)",
    "",
    "## Checklist",
    "",
    ...items.map((item) => `- [${item.confirmed ? "x" : " "}] ${item.label}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export async function runRelease(input: RunReleaseInput): Promise<RunReleaseResult> {
  if (input.skipDoctor) {
    // eslint-disable-next-line no-console
    console.warn("[bbg release] warning: skipDoctor=true, doctor gate is bypassed.");
  }

  if (input.skipSync) {
    // eslint-disable-next-line no-console
    console.warn("[bbg release] warning: skipSync=true, sync drift gate is bypassed.");
  }

  if (!input.skipDoctor) {
    const doctor = await runDoctor({ cwd: input.cwd });
    if (!doctor.ok) {
      throw new Error("Release blocked: bbg doctor reported errors.");
    }
  }

  if (!input.skipSync) {
    const sync = await runSync({ cwd: input.cwd });
    if (sync.drift.length > 0) {
      const acknowledged = await promptConfirm({
        message: `Sync detected ${sync.drift.length} drift entries. Continue release anyway?`,
        default: false,
      });
      if (!acknowledged) {
        throw new Error("Release blocked: sync drift requires explicit acknowledgement.");
      }
    }
  }

  const checklistPath = await ensureChecklistFile(input.cwd);
  const checklistItems = parseChecklistItems(await readTextFile(checklistPath));
  const confirmations: ChecklistItem[] = [];

  for (const item of checklistItems) {
    const confirmed = await promptConfirm({ message: `${item} completed?`, default: true });
    confirmations.push({ label: item, confirmed });
  }

  const config = parseConfig(await readTextFile(join(input.cwd, ".bbg", "config.json")));
  const version = (await promptInput({ message: "Release version", default: config.version })).trim() || config.version;
  const releaseNotes = (await promptInput({ message: "Release notes", default: "" })).trim();
  const safeVersion = sanitizeVersionForFile(version);
  const releaseRelativePath = join("docs", "changes", `${toDateYmd(new Date())}-release-${safeVersion}.md`);
  await writeTextFile(join(input.cwd, releaseRelativePath), buildReleaseRecord(version, releaseNotes, confirmations));

  let changelogGenerated = false;
  let changelogPath: string | undefined;

  if (!input.skipChangelog) {
    const today = toDateYmd(new Date());
    const { entry, commitCount } = await generateChangelog(input.cwd, version, today);
    if (commitCount > 0) {
      const clPath = "CHANGELOG.md";
      await appendToChangelog(input.cwd, entry, clPath);
      changelogGenerated = true;
      changelogPath = clPath;
    }
  }

  return {
    version,
    checklistConfirmed: confirmations.every((item) => item.confirmed),
    releaseFile: join("docs", "changes", basename(releaseRelativePath)).split("\\").join("/"),
    changelogGenerated,
    changelogPath,
  };
}
