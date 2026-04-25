import { join } from "node:path";
import { exists, readTextFile } from "../utils/fs.js";
import { buildAnalyzeKnowledgeQueryAugmentation } from "../runtime/wiki.js";
import { buildWorkflowDecisions } from "../workflow/decisions.js";
import type { WorkflowDecisionSet, WorkflowKind } from "../workflow/types.js";

export interface RunWorkflowCommandInput {
  cwd: string;
  kind: WorkflowKind;
  task?: string;
}

export interface RunWorkflowCommandResult {
  kind: WorkflowKind;
  task: string | null;
  commandSpecPath: string;
  summary: string;
  references: string[];
  hermesRecommendations: string[];
  decisions: WorkflowDecisionSet;
  nextActions: string[];
}

const WORKFLOW_SPECS: Record<
  WorkflowKind,
  { commandSpecPath: string; summary: string; references: string[]; hermesRecommendations: string[] }
> = {
  plan: {
    commandSpecPath: ".bbg/harness/commands/plan.md",
    summary: "Create an implementation plan from canonical repo guidance before making changes.",
    references: ["AGENTS.md", "RULES.md", ".bbg/harness/skills/tdd-workflow/SKILL.md"],
    hermesRecommendations: [
      "If similar work may already exist, use `.bbg/harness/skills/hermes/SKILL.md` query before planning from scratch.",
    ],
  },
  review: {
    commandSpecPath: ".bbg/harness/commands/code-review.md",
    summary: "Run a structured review focused on correctness, tests, and security.",
    references: ["AGENTS.md", "RULES.md", ".bbg/harness/skills/code-review-checklist/SKILL.md"],
    hermesRecommendations: [
      "If review findings reveal a reusable fix pattern, use `.bbg/harness/skills/hermes/SKILL.md` distill.",
      "If the pattern should become a reusable execution recipe, use `.bbg/harness/skills/hermes/SKILL.md` draft-skill.",
    ],
  },
  security: {
    commandSpecPath: ".bbg/harness/commands/security-scan.md",
    summary: "Follow the repo security workflow and verify sensitive surfaces before shipping.",
    references: ["AGENTS.md", "RULES.md", ".bbg/harness/skills/security-review/SKILL.md"],
    hermesRecommendations: [
      "If repeated security findings imply a durable policy boundary, use `.bbg/harness/skills/hermes/SKILL.md` draft-rule.",
      "If the evidence needs consolidation before drafting, use `.bbg/harness/skills/hermes/SKILL.md` distill.",
    ],
  },
  tdd: {
    commandSpecPath: ".bbg/harness/commands/tdd.md",
    summary: "Follow RED -> GREEN -> IMPROVE using the repo test-driven workflow.",
    references: ["AGENTS.md", "RULES.md", ".bbg/harness/skills/tdd-workflow/SKILL.md"],
    hermesRecommendations: [
      "If the test-and-fix loop becomes a reusable engineering pattern, use `.bbg/harness/skills/hermes/SKILL.md` draft-skill.",
      "If you need to inspect prior local learning before refining the loop, use `.bbg/harness/skills/hermes/SKILL.md` query.",
    ],
  },
};

export async function runWorkflowCommand(input: RunWorkflowCommandInput): Promise<RunWorkflowCommandResult> {
  const workflow = WORKFLOW_SPECS[input.kind];
  const workspaceSpecPath = join(input.cwd, workflow.commandSpecPath);
  if (!(await exists(workspaceSpecPath))) {
    throw new Error(`${workflow.commandSpecPath} not found. Run \`bbg init\` first.`);
  }

  const commandSpec = await readTextFile(workspaceSpecPath);
  const firstParagraph = commandSpec
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith("#"));
  const analyzeAugmentation = await buildAnalyzeKnowledgeQueryAugmentation({
    cwd: input.cwd,
    topic: input.task,
  });
  const hasAnalyzeContext = analyzeAugmentation.references.length > 0;

  return {
    kind: input.kind,
    task: input.task?.trim().length ? input.task.trim() : null,
    commandSpecPath: workflow.commandSpecPath,
    summary: [firstParagraph ?? workflow.summary, analyzeAugmentation.summary]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" "),
    references: [...new Set([...workflow.references, ...analyzeAugmentation.references])],
    hermesRecommendations: [
      ...new Set([
        ...workflow.hermesRecommendations,
        ...(hasAnalyzeContext ? ["Review Analyze knowledge references before splitting implementation work."] : []),
      ]),
    ],
    decisions: buildWorkflowDecisions(input.kind, input.task),
    nextActions: [
      ...(hasAnalyzeContext ? ["review-analyze-context"] : []),
      ...(input.kind === "plan" ? ["implement"] : []),
      ...(input.kind === "review" ? ["address-findings", "verify"] : []),
      ...(input.kind === "tdd" ? ["write-test", "implement", "refactor"] : []),
      ...(input.kind === "security" ? ["audit-sensitive-surfaces", "verify"] : []),
    ],
  };
}
