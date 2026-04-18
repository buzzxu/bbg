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

  it("fails before init when canonical Hermes doc is missing", async () => {
    const cwd = await makeTempDir();

    await expect(runHermesCommand({ cwd, kind: "distill" })).rejects.toThrow(
      "commands/hermes-distill.md not found. Run `bbg init` first.",
    );
  });
});
