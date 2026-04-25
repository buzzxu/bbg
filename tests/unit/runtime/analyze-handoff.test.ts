import { mkdtemp, mkdir, readdir, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ANALYZE_QUARANTINE_RETENTION_DAYS,
  detectCurrentAnalyzeAgentTool,
  listAnalyzeAgentTools,
  markAnalyzeAgentHandoffConsumed,
  readLatestAnalyzeAgentHandoff,
  readPendingAnalyzeAgentHandoff,
  writeAnalyzeAgentHandoff,
} from "../../../src/runtime/analyze-handoff.js";
import { pruneAnalyzeQuarantine } from "../../../src/runtime/analyze-quarantine.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-analyze-handoff-"));
  tempDirs.push(dir);
  return dir;
}

describe("runtime/analyze-handoff", () => {
  beforeEach(() => {
    delete process.env.BBG_CURRENT_TOOL;
    delete process.env.CODEX_THREAD_ID;
    delete process.env.CODEX_CI;
    delete process.env.CODEX_MANAGED_BY_NPM;
    delete process.env.CODEX_SANDBOX;
    delete process.env.CODEX_SANDBOX_NETWORK_DISABLED;
  });

  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
    delete process.env.BBG_CURRENT_TOOL;
    delete process.env.CODEX_THREAD_ID;
    delete process.env.CODEX_CI;
    delete process.env.CODEX_MANAGED_BY_NPM;
    delete process.env.CODEX_SANDBOX;
    delete process.env.CODEX_SANDBOX_NETWORK_DISABLED;
  });

  it("lists configured agent tools with fallback coverage", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, ".bbg"), { recursive: true });
    await writeTextFile(
      join(cwd, ".bbg", "config.json"),
      JSON.stringify({
        version: "1.0.0",
        projectName: "sample",
        projectDescription: "sample",
        createdAt: "2026-04-19T12:00:00.000Z",
        updatedAt: "2026-04-19T12:00:00.000Z",
        repos: [],
        governance: {
          riskThresholds: {
            high: { grade: "A+", minScore: 99 },
            medium: { grade: "A", minScore: 95 },
            low: { grade: "B", minScore: 85 },
          },
          enableRedTeam: false,
          enableCrossAudit: false,
        },
        context: {},
        agentRunner: {
          defaultTool: "opencode",
          tools: {
            opencode: { type: "cli", command: "opencode" },
            claude: { type: "cli", command: "claude" },
          },
        },
      }, null, 2),
    );

    const result = await listAnalyzeAgentTools(cwd);

    expect(result.defaultTool).toBe("opencode");
    expect(result.tools).toContain("opencode");
    expect(result.tools).toContain("claude");
    expect(result.tools).toContain("codex");
  });

  it("writes and consumes analyze handoff state", async () => {
    const cwd = await makeTempDir();

    const writeResult = await writeAnalyzeAgentHandoff({
      cwd,
      preferredTool: "Claude",
      availableTools: ["claude", "codex"],
      reasons: ["deep analysis needs ai"],
      request: {
        repos: ["backend"],
        refresh: true,
        focus: null,
        interviewMode: "guided",
      },
    });

    expect(writeResult.jsonPath).toBe(".bbg/analyze/handoff/latest.json");
    expect(writeResult.markdownPath).toBe(".bbg/analyze/handoff/latest.md");
    expect(writeResult.handoff.command).toBe("bbg analyze-agent --repo backend --refresh --interview guided");

    const stored = await readLatestAnalyzeAgentHandoff(cwd);
    expect(stored?.status).toBe("pending");
    expect(stored?.preferredTool).toBe("claude");
    expect(stored?.request.repos).toEqual(["backend"]);
    expect(stored?.request.focus).toBeNull();

    const consumed = await markAnalyzeAgentHandoffConsumed(cwd, "Codex");
    expect(consumed?.status).toBe("consumed");
    expect(consumed?.consumedBy).toBe("codex");

    const reread = await readLatestAnalyzeAgentHandoff(cwd);
    expect(reread?.status).toBe("consumed");
    expect(reread?.consumedBy).toBe("codex");
    expect(await readPendingAnalyzeAgentHandoff(cwd)).toBeNull();
  });

  it("detects the current AI agent tool from the environment", () => {
    process.env.BBG_CURRENT_TOOL = "OpenCode";
    expect(detectCurrentAnalyzeAgentTool()).toBe("opencode");
  });

  it("detects codex from native CODEX environment variables", () => {
    process.env.CODEX_THREAD_ID = "thread-123";
    expect(detectCurrentAnalyzeAgentTool()).toBe("codex");
  });

  it("includes focus in analyze replay command when present", async () => {
    const cwd = await makeTempDir();

    const writeResult = await writeAnalyzeAgentHandoff({
      cwd,
      preferredTool: "Codex",
      availableTools: ["codex"],
      reasons: ["focused analysis needs ai"],
      request: {
        repos: ["backend"],
        refresh: false,
        focus: "checkout flow",
        interviewMode: "auto",
      },
    });

    expect(writeResult.handoff.command).toBe('bbg analyze-agent "checkout flow" --repo backend');
  });

  it("ignores invalid persisted handoff state", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, ".bbg", "analyze", "handoff"), { recursive: true });
    await writeTextFile(join(cwd, ".bbg", "analyze", "handoff", "latest.json"), '{"status":"pending"}');

    await expect(readLatestAnalyzeAgentHandoff(cwd)).resolves.toBeNull();
    await expect(readPendingAnalyzeAgentHandoff(cwd)).resolves.toBeNull();
    expect(await readdir(join(cwd, ".bbg", "quarantine", "analyze"))).toHaveLength(1);
  });

  it("prunes quarantined analyze files older than the retention window", async () => {
    const cwd = await makeTempDir();
    const quarantineDir = join(cwd, ".bbg", "quarantine", "analyze");
    await mkdir(quarantineDir, { recursive: true });
    const oldEntry = join(quarantineDir, "old-entry.json");
    await writeTextFile(oldEntry, "{}\n");
    const staleTime = new Date(Date.now() - ((ANALYZE_QUARANTINE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000));
    await utimes(oldEntry, staleTime, staleTime);
    const entryStat = await stat(oldEntry);

    await pruneAnalyzeQuarantine(
      cwd,
      new Date(entryStat.mtime.getTime() + (ANALYZE_QUARANTINE_RETENTION_DAYS * 24 * 60 * 60 * 1000) + 60_000),
    );
    expect(await readdir(quarantineDir)).toEqual([]);
  });
});
