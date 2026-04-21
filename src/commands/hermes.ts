import { join } from "node:path";
import { buildAnalyzeKnowledgeQueryAugmentation, buildWikiQueryAugmentation } from "../runtime/wiki.js";
import { exists, readTextFile } from "../utils/fs.js";

export type HermesKind = "query" | "candidates" | "distill" | "draft-skill" | "draft-rule" | "verify" | "promote";

export interface RunHermesCommandInput {
  cwd: string;
  kind: HermesKind;
  topic?: string;
}

export interface RunHermesCommandResult {
  kind: HermesKind;
  topic: string | null;
  commandSpecPath: string;
  summary: string;
  references: string[];
}

const HERMES_SPECS: Record<HermesKind, { commandSpecPath: string; summary: string; references: string[] }> = {
  query: {
    commandSpecPath: "commands/hermes-query.md",
    summary: "Query local Hermes memory before reinventing a workflow or explanation.",
    references: ["AGENTS.md", "commands/hermes-query.md", "skills/hermes-memory-router/SKILL.md"],
  },
  candidates: {
    commandSpecPath: "commands/hermes-candidates.md",
    summary: "Review local Hermes candidate objects before drafting or resolving them.",
    references: ["AGENTS.md", "commands/hermes-candidates.md", "skills/hermes-evaluation/SKILL.md"],
  },
  distill: {
    commandSpecPath: "commands/hermes-distill.md",
    summary: "Distill evaluated Hermes candidates into local draft outputs.",
    references: ["AGENTS.md", "commands/hermes-distill.md", "skills/hermes-distillation/SKILL.md"],
  },
  "draft-skill": {
    commandSpecPath: "commands/hermes-draft-skill.md",
    summary: "Draft a local reusable skill from evaluated Hermes evidence.",
    references: ["AGENTS.md", "commands/hermes-draft-skill.md", "skills/hermes-skill-drafting/SKILL.md"],
  },
  "draft-rule": {
    commandSpecPath: "commands/hermes-draft-rule.md",
    summary: "Draft a local reusable rule from recurring Hermes evidence.",
    references: ["AGENTS.md", "commands/hermes-draft-rule.md", "skills/hermes-rule-drafting/SKILL.md"],
  },
  verify: {
    commandSpecPath: "commands/hermes-verify.md",
    summary: "Verify candidate evidence before any promotion decision.",
    references: ["AGENTS.md", "commands/hermes-verify.md", "skills/hermes-verification/SKILL.md"],
  },
  promote: {
    commandSpecPath: "commands/hermes-promote.md",
    summary: "Record governed promotion decisions for verified Hermes candidates.",
    references: ["AGENTS.md", "commands/hermes-promote.md", "skills/hermes-promotion/SKILL.md"],
  },
};

export async function runHermesCommand(input: RunHermesCommandInput): Promise<RunHermesCommandResult> {
  const hermes = HERMES_SPECS[input.kind];
  const workspaceSpecPath = join(input.cwd, hermes.commandSpecPath);
  if (!(await exists(workspaceSpecPath))) {
    throw new Error(`${hermes.commandSpecPath} not found. Run \`bbg init\` first.`);
  }

  const commandSpec = await readTextFile(workspaceSpecPath);
  const firstParagraph = commandSpec
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith("#"));
  const wikiAugmentation =
    input.kind === "query"
      ? await buildWikiQueryAugmentation({ cwd: input.cwd, topic: input.topic })
      : { references: [] as string[], summary: null as string | null };
  const analyzeAugmentation =
    input.kind === "query"
      ? await buildAnalyzeKnowledgeQueryAugmentation({ cwd: input.cwd, topic: input.topic })
      : { references: [] as string[], summary: null as string | null };
  let candidateSummary: string | null = null;
  let candidateReferences: string[] = [];
  if (input.kind === "candidates") {
    const analyzeCandidatesPath = join(input.cwd, ".bbg", "knowledge", "hermes", "analyze-candidates.json");
    if (await exists(analyzeCandidatesPath)) {
      try {
        const parsed = JSON.parse(await readTextFile(analyzeCandidatesPath)) as { candidates?: unknown[] };
        const count = Array.isArray(parsed.candidates) ? parsed.candidates.length : 0;
        candidateSummary =
          count > 0
            ? `Analyze-origin candidate knowledge objects available: ${count}.`
            : "Analyze-origin candidate knowledge objects available: 0.";
      } catch {
        candidateSummary = "Analyze-origin candidate knowledge objects are available for review.";
      }
      candidateReferences = [".bbg/knowledge/hermes/analyze-candidates.json"];
    }
  }

  return {
    kind: input.kind,
    topic: input.topic?.trim().length ? input.topic.trim() : null,
    commandSpecPath: hermes.commandSpecPath,
    summary: [firstParagraph ?? hermes.summary, wikiAugmentation.summary, analyzeAugmentation.summary, candidateSummary]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" "),
    references: [
      ...new Set([
        ...hermes.references,
        ...wikiAugmentation.references,
        ...analyzeAugmentation.references,
        ...candidateReferences,
      ]),
    ],
  };
}
