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
    await writeTextFile(join(cwd, ".bbg", "harness", "commands", "plan.md"), "# /plan\n\nPlan the change from repo guidance.\n");

    const result = await runWorkflowCommand({ cwd, kind: "plan", task: "ship adapter work" });

    expect(result).toEqual({
      kind: "plan",
      task: "ship adapter work",
      commandSpecPath: ".bbg/harness/commands/plan.md",
      summary: "Plan the change from repo guidance.",
      references: ["AGENTS.md", "RULES.md", ".bbg/harness/skills/tdd-workflow/SKILL.md"],
      hermesRecommendations: [
        "If similar work may already exist, use `.bbg/harness/skills/hermes/SKILL.md` query before planning from scratch.",
      ],
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

  it("injects analyze knowledge references when task terms match prior project analysis", async () => {
    const cwd = await makeTempDir();
    await writeTextFile(join(cwd, ".bbg", "harness", "commands", "plan.md"), "# /plan\n\nPlan the change from repo guidance.\n");
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "domain-lexicon.json"),
      JSON.stringify(
        {
          terms: [
            {
              term: "Checkout",
              sourceKinds: ["route", "api-endpoint"],
              examples: ["src/pages/checkout/index.tsx"],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeTextFile(
      join(cwd, ".bbg", "knowledge", "workspace", "evidence-graph.json"),
      JSON.stringify(
        {
          apiEndpoints: [{ repo: "repo-a", path: "/api/checkout", file: "src/api/checkout.ts" }],
        },
        null,
        2,
      ),
    );

    const result = await runWorkflowCommand({ cwd, kind: "plan", task: "change checkout flow" });

    expect(result.summary).toContain("Analyze knowledge references for this task:");
    expect(result.summary).toContain("domain lexicon");
    expect(result.references).toContain(".bbg/knowledge/workspace/domain-lexicon.json");
    expect(result.references).toContain(".bbg/knowledge/workspace/evidence-graph.json");
    expect(result.nextActions).toEqual(["review-analyze-context", "implement"]);
    expect(result.hermesRecommendations).toContain(
      "Review Analyze knowledge references before splitting implementation work.",
    );
  });

  it("fails before init when canonical command doc is missing", async () => {
    const cwd = await makeTempDir();

    await expect(runWorkflowCommand({ cwd, kind: "review" })).rejects.toThrow(
      ".bbg/harness/commands/code-review.md not found. Run `bbg init` first.",
    );
  });
});
