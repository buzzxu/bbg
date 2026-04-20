import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runHermesCommand } from "../../../src/commands/hermes.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-hermes-command-"));
  tempDirs.push(dir);
  return dir;
}

describe("hermes command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("returns local-memory guidance for query", async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, "commands", "hermes-query.md"), "# /hermes-query\n\nUse local memory first.\n");

    const result = await runHermesCommand({ cwd, kind: "query", topic: "rollout process" });

    expect(result).toEqual({
      kind: "query",
      topic: "rollout process",
      commandSpecPath: "commands/hermes-query.md",
      summary: "Use local memory first. Canonical wiki index is available as the primary local memory entrypoint.",
      references: ["AGENTS.md", "commands/hermes-query.md", "skills/hermes-memory-router/SKILL.md", "docs/wiki/index.md"],
    });
  });

  it("augments Hermes query results with analyze knowledge references", async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, "commands", "hermes-query.md"), "# /hermes-query\n\nUse local memory first.\n");
    await writeTextFile(
      join(cwd, "docs", "business", "capability-map.md"),
      [
        "# Capability Map",
        "",
        "- checkout orchestration and poster fulfillment",
        "- campaign management",
        "",
      ].join("\n"),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "change-impact.json"),
      JSON.stringify(
        {
          impactedCapabilities: ["checkout orchestration"],
          impactedContracts: ["POST /api/checkout"],
          rationale: "checkout touches poster generation and callback handling",
        },
        null,
        2,
      ),
    );

    const result = await runHermesCommand({ cwd, kind: "query", topic: "checkout flow" });

    expect(result.summary).toContain("Use local memory first.");
    expect(result.summary).toContain("Canonical wiki index is available as the primary local memory entrypoint.");
    expect(result.summary).toContain("Analyze knowledge references for this task:");
    expect(result.summary).toContain("capabilities");
    expect(result.summary).toContain("change impact");
    expect(result.references).toContain("docs/business/capability-map.md");
    expect(result.references).toContain(".bbg/knowledge/workspace/change-impact.json");
  });

  it("fails before init when canonical Hermes doc is missing", async () => {
    const cwd = await makeTempDir();

    await expect(runHermesCommand({ cwd, kind: "distill" })).rejects.toThrow(
      "commands/hermes-distill.md not found. Run `bbg init` first.",
    );
  });
});
