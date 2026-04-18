import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runWorkflowCommand } from "../../../src/commands/workflow.js";
import { writeTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bbg-workflow-command-"));
  tempDirs.push(dir);
  return dir;
}

describe("workflow command", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("returns canonical workflow guidance for plan", async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, "commands", "plan.md"), "# /plan\n\nPlan the change from repo guidance.\n");

    const result = await runWorkflowCommand({ cwd, kind: "plan", task: "ship adapter work" });

    expect(result).toEqual({
      kind: "plan",
      task: "ship adapter work",
      commandSpecPath: "commands/plan.md",
      summary: "Plan the change from repo guidance.",
      references: ["AGENTS.md", "RULES.md", "skills/tdd-workflow/SKILL.md"],
      hermesRecommendations: ["If similar work may already exist, run `bbg hermes query` before planning from scratch."],
      decisions: {
        taskEnv: { decision: "not-required", reasons: [] },
        observe: { decision: "not-required", reasons: [] },
        tdd: { decision: "optional", reasons: [] },
        security: { decision: "not-required", reasons: [] },
        loop: { decision: "not-required", reasons: [] },
        hermesQuery: { decision: "recommended", reasons: ["plan-benefits-from-local-history"] },
      },
      nextActions: ["implement"],
    });
  });

  it("fails before init when canonical command doc is missing", async () => {
    const cwd = await makeTempDir();

    await expect(runWorkflowCommand({ cwd, kind: "review" })).rejects.toThrow(
      "commands/code-review.md not found. Run `bbg init` first.",
    );
  });
});
