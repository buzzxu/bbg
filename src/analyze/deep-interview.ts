import { promptInput, sanitizePromptValue } from "../utils/prompts.js";
import { detectCurrentAgentToolFromEnv } from "../runtime/agent-tool.js";
import {
  clearAnalyzeInterviewPendingState,
  getAnalyzeInterviewPendingPath,
  readAnalyzeInterviewPendingState,
  writeAnalyzeInterviewPendingState,
} from "../runtime/analyze-interview.js";
import type {
  AnalyzeConfidenceScores,
  AnalyzeInterviewAssumption,
  AnalyzeInterviewQuestionKey,
  AnalyzeInterviewSummary,
  AnalyzeKnowledgeGap,
  AnalyzePhaseSummary,
  AnalyzeProjectContext,
  RepoBusinessAnalysis,
  RepoTechnicalAnalysis,
  RunAnalyzeCommandInput,
  WorkspaceFusionResult,
} from "./types.js";

const CONFIDENCE_THRESHOLD = 0.65;
const SENSITIVE_BOUNDARY_PATTERN =
  /(auth|tenant|security|transaction|permission|token|secret|credential|privacy|pii|compliance|encryption|audit)/;

const QUESTION_ORDER: AnalyzeInterviewQuestionKey[] = [
  "businessGoal",
  "criticalFlows",
  "nonNegotiableConstraints",
  "failureHotspots",
  "decisionHistory",
  "systemBoundaries",
];

const QUESTION_TEXT: Record<AnalyzeInterviewQuestionKey, string> = {
  businessGoal: "What is the core business goal of this system?",
  criticalFlows: "List the 2-5 most critical user or business flows this system must support.",
  systemBoundaries: "What are the main system boundaries and responsibilities across repos/apps/services?",
  nonNegotiableConstraints:
    "What non-negotiable constraints must future changes respect (security, compliance, latency, compatibility, release windows)?",
  failureHotspots: "Which modules or workflows are most failure-prone or risky today?",
  decisionHistory:
    "Are there historical design decisions, legacy constraints, or repeated mistakes we should remember?",
};

function splitStructuredAnswer(answer: string): string[] {
  return answer
    .split(/\n|;/g)
    .map((entry) => entry.replace(/^[\s*-]+/, "").trim())
    .filter((entry) => entry.length > 0);
}

function clampConfidence(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function inferProjectContext(input: {
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
}): AnalyzeProjectContext {
  const businessGoalCandidates = input.business
    .flatMap((entry) => [entry.description.trim(), ...entry.capabilities])
    .filter((entry) => entry.length > 0);
  const criticalFlows = input.business
    .flatMap((entry) => [...entry.flowHints, ...entry.entrypoints, ...entry.apiSignals])
    .filter((hint) => hint.length > 0)
    .slice(0, 5);
  const systemBoundaries = input.fusion.repos.map((repo) => {
    const summary = repo.description?.trim().length ? repo.description.trim() : repo.type;
    return `${repo.name}: ${summary}`;
  });
  const failureHotspots = input.technical
    .flatMap((technical) => {
      const hotspots: string[] = [];
      const combinedSignals = [technical.repo.description, ...technical.structure, ...technical.deps]
        .join(" ")
        .toLowerCase();
      if (!technical.testing.hasTestDir) {
        hotspots.push(`${technical.repo.name}: missing dedicated test directory`);
      }
      if (SENSITIVE_BOUNDARY_PATTERN.test(combinedSignals)) {
        hotspots.push(
          `${technical.repo.name}: sensitive domain boundary (${technical.repo.description || technical.repo.type})`,
        );
      }
      return hotspots;
    })
    .slice(0, 5);

  return {
    businessGoal: businessGoalCandidates[0] ?? null,
    criticalFlows,
    systemBoundaries,
    nonNegotiableConstraints: [],
    failureHotspots,
    decisionHistory: [],
  };
}

function scoreProjectContext(context: AnalyzeProjectContext, fusion: WorkspaceFusionResult): AnalyzeConfidenceScores {
  return {
    businessGoal: clampConfidence(context.businessGoal ? 0.78 : 0.28),
    criticalFlows: clampConfidence(0.2 + Math.min(context.criticalFlows.length, 5) * 0.14),
    systemBoundaries: clampConfidence(
      0.3 + Math.min(context.systemBoundaries.length, Math.max(fusion.repos.length, 1)) * 0.16,
    ),
    nonNegotiableConstraints: clampConfidence(0.18 + Math.min(context.nonNegotiableConstraints.length, 5) * 0.16),
    failureHotspots: clampConfidence(0.25 + Math.min(context.failureHotspots.length, 5) * 0.14),
    decisionHistory: clampConfidence(0.12 + Math.min(context.decisionHistory.length, 4) * 0.18),
  };
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function collectEvidenceSignals(input: {
  technical: RepoTechnicalAnalysis[];
  fusion: WorkspaceFusionResult;
}): string[] {
  const signals: string[] = [];
  for (const repo of input.fusion.repos) {
    signals.push(`repo:${repo.name}`);
    signals.push(`stack:${repo.name}:${repo.stack.language}/${repo.stack.framework}`);
  }
  for (const technical of input.technical) {
    for (const structure of technical.structure.slice(0, 3)) {
      signals.push(`structure:${technical.repo.name}:${structure}`);
    }
    for (const dep of technical.deps.slice(0, 3)) {
      signals.push(`dependency:${technical.repo.name}:${dep}`);
    }
    if (!technical.testing.hasTestDir) {
      signals.push(`testing:${technical.repo.name}:missing-test-dir`);
    }
  }
  return uniqueValues(signals);
}

function inferAssumptions(input: {
  gaps: AnalyzeKnowledgeGap[];
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
}): AnalyzeInterviewAssumption[] {
  const assumptions: AnalyzeInterviewAssumption[] = [];
  const combinedSignals = input.technical
    .map((technical) => [technical.repo.description, ...technical.structure, ...technical.deps].join(" ").toLowerCase())
    .join(" ");
  const hasSensitiveBoundary = SENSITIVE_BOUNDARY_PATTERN.test(combinedSignals);
  const hasFrontendAndBackend =
    input.fusion.repos.some(
      (repo) => /(react|vue|next|taro|frontend|web)/i.test(repo.stack.framework) || repo.type === "frontend",
    ) &&
    input.fusion.repos.some(
      (repo) =>
        /(spring|backend|service|api|java|node|fastapi|django)/i.test(repo.stack.framework) || repo.type === "backend",
    );
  const multiRepo = input.fusion.repos.length > 1;
  const hasWeakTesting = input.technical.some((technical) => !technical.testing.hasTestDir);
  const flowCandidates = uniqueValues(
    input.business
      .flatMap((entry) => [...entry.flowHints, ...entry.responsibilities, ...entry.entrypoints, ...entry.apiSignals])
      .slice(0, 8),
  );
  const boundaryCandidates = uniqueValues(
    input.fusion.repos.map(
      (repo) =>
        `${repo.name}: ${repo.description?.trim().length ? repo.description.trim() : `${repo.type} responsibility`}`,
    ),
  );
  const hotspotCandidates = uniqueValues(
    input.technical.flatMap((technical) => {
      const hotspots: string[] = [];
      if (!technical.testing.hasTestDir) {
        hotspots.push(`${technical.repo.name}: limited dedicated test coverage`);
      }
      if (
        SENSITIVE_BOUNDARY_PATTERN.test(
          [technical.repo.description, ...technical.structure, ...technical.deps].join(" ").toLowerCase(),
        )
      ) {
        hotspots.push(`${technical.repo.name}: sensitive business and security boundary`);
      }
      return hotspots;
    }),
  );
  const evidenceSignals = collectEvidenceSignals({
    technical: input.technical,
    fusion: input.fusion,
  });

  for (const gap of input.gaps) {
    if (gap.key === "businessGoal") {
      const values = uniqueValues([
        input.business.map((entry) => entry.description.trim()).find((entry) => entry.length > 0) ?? "",
        multiRepo ? "Coordinate frontend, admin, and backend capabilities as one product surface." : "",
      ]);
      if (values.length > 0) {
        assumptions.push({
          key: gap.key,
          values: [values[0]],
          rationale: "Derived from repository descriptions and overall workspace topology.",
          evidence: evidenceSignals
            .filter((signal) => signal.startsWith("repo:") || signal.startsWith("stack:"))
            .slice(0, 4),
        });
      }
      continue;
    }

    if (gap.key === "criticalFlows") {
      const values = uniqueValues([
        ...flowCandidates,
        ...input.fusion.businessModules.map((module) => module.description).filter((value) => value.length > 0),
        "Build, test, and release flows should remain stable while deeper business flow validation is gathered.",
      ]).slice(0, 5);
      if (values.length > 0) {
        assumptions.push({
          key: gap.key,
          values,
          rationale: "Composed from inferred flow hints, business responsibilities, and workspace module summaries.",
          evidence: evidenceSignals
            .filter((signal) => signal.startsWith("repo:") || signal.startsWith("structure:"))
            .slice(0, 5),
        });
      }
      continue;
    }

    if (gap.key === "systemBoundaries") {
      const values = uniqueValues([
        ...boundaryCandidates,
        multiRepo ? "Cross-repo changes should preserve explicit client/server and operational boundaries." : "",
      ]);
      if (values.length > 0) {
        assumptions.push({
          key: gap.key,
          values,
          rationale: "Built from repo-level descriptions and workspace ownership boundaries.",
          evidence: evidenceSignals
            .filter((signal) => signal.startsWith("repo:") || signal.startsWith("stack:"))
            .slice(0, 5),
        });
      }
      continue;
    }

    if (gap.key === "nonNegotiableConstraints") {
      const values = uniqueValues([
        multiRepo ? "Must preserve existing cross-repo contracts and coordinate client/server changes together." : "",
        hasSensitiveBoundary
          ? "Must not weaken authentication, authorization, tenant isolation, or other security-sensitive controls."
          : "",
        hasFrontendAndBackend
          ? "Must keep production-facing user journeys compatible across frontend and backend boundaries during rollout."
          : "",
        "Must avoid breaking externally visible behavior without explicit versioning or coordinated migration.",
      ]);
      if (values.length > 0) {
        assumptions.push({
          key: gap.key,
          values,
          rationale:
            "Inferred from multi-repo topology, client/server separation, and security-sensitive dependency signals.",
          evidence: evidenceSignals
            .filter(
              (signal) => signal.startsWith("repo:") || signal.startsWith("dependency:") || signal.startsWith("stack:"),
            )
            .slice(0, 6),
        });
      }
      continue;
    }

    if (gap.key === "failureHotspots") {
      const values = uniqueValues([
        ...hotspotCandidates,
        hasFrontendAndBackend ? "Client/server integration seams should be regression-tested before rollout." : "",
        "Integration and release boundaries should be treated as likely failure hotspots until production incident history is documented.",
      ]);
      if (values.length > 0) {
        assumptions.push({
          key: gap.key,
          values,
          rationale: "Inferred from testing signals, sensitive dependency markers, and integration boundaries.",
          evidence: evidenceSignals
            .filter(
              (signal) =>
                signal.startsWith("testing:") || signal.startsWith("dependency:") || signal.startsWith("repo:"),
            )
            .slice(0, 6),
        });
      }
      continue;
    }

    if (gap.key === "decisionHistory") {
      const values = uniqueValues([
        multiRepo
          ? "This workspace is intentionally split across multiple repos, so contract drift and unsynchronized changes are a recurring risk to avoid."
          : "",
        hasSensitiveBoundary
          ? "Sensitive domain boundaries should be regression-tested before refactors because identity, transaction, permission, or compliance flows are historically brittle."
          : "",
        hasWeakTesting
          ? "Areas without dedicated tests should be treated cautiously during refactors and require stronger verification before rollout."
          : "",
        "Until explicit project history is documented, preserve current module boundaries and avoid broad refactors that change behavior across integration seams.",
      ]);
      if (values.length > 0) {
        assumptions.push({
          key: gap.key,
          values,
          rationale:
            "Derived from repository boundaries, sensitive domain markers, and observed testing coverage gaps.",
          evidence: evidenceSignals
            .filter(
              (signal) =>
                signal.startsWith("repo:") || signal.startsWith("testing:") || signal.startsWith("dependency:"),
            )
            .slice(0, 6),
        });
      }
    }
  }

  return assumptions;
}

function detectKnowledgeGaps(confidence: AnalyzeConfidenceScores): AnalyzeKnowledgeGap[] {
  return QUESTION_ORDER.filter((key) => confidence[key] < CONFIDENCE_THRESHOLD).map((key, index) => ({
    key,
    question: QUESTION_TEXT[key],
    reason: `confidence ${confidence[key]} is below ${CONFIDENCE_THRESHOLD}`,
    priority: index + 1,
  }));
}

function applyAnswer(
  context: AnalyzeProjectContext,
  key: AnalyzeInterviewQuestionKey,
  answer: string,
): AnalyzeProjectContext {
  const value = sanitizePromptValue(answer, "");
  if (value.length === 0) {
    return context;
  }

  switch (key) {
    case "businessGoal":
      return { ...context, businessGoal: value };
    case "criticalFlows":
      return { ...context, criticalFlows: splitStructuredAnswer(value) };
    case "systemBoundaries":
      return { ...context, systemBoundaries: splitStructuredAnswer(value) };
    case "nonNegotiableConstraints":
      return { ...context, nonNegotiableConstraints: splitStructuredAnswer(value) };
    case "failureHotspots":
      return { ...context, failureHotspots: splitStructuredAnswer(value) };
    case "decisionHistory":
      return { ...context, decisionHistory: splitStructuredAnswer(value) };
  }
}

function shouldUseInteractiveInterview(input: RunAnalyzeCommandInput): boolean {
  if (input.interview?.mode === "off") {
    return false;
  }
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function chooseInterviewMode(
  requested: RunAnalyzeCommandInput["interview"] | undefined,
  interactive: boolean,
  gaps: AnalyzeKnowledgeGap[],
  fusion: WorkspaceFusionResult,
): "off" | "passive" | "guided" | "deep" {
  const mode = requested?.mode ?? "auto";
  if (mode === "off") {
    return "off";
  }
  if (gaps.length === 0) {
    return "passive";
  }
  if (mode === "guided" || mode === "deep") {
    return interactive || (requested?.answers && Object.keys(requested.answers).length > 0) ? mode : "passive";
  }
  if (!interactive && (!requested?.answers || Object.keys(requested.answers).length === 0)) {
    return "passive";
  }
  return fusion.scope === "workspace" || gaps.length >= 4 ? "deep" : "guided";
}

async function collectAnswers(input: {
  mode: "guided" | "deep";
  interactive: boolean;
  gaps: AnalyzeKnowledgeGap[];
  answers?: Partial<Record<AnalyzeInterviewQuestionKey, string>>;
}): Promise<Partial<Record<AnalyzeInterviewQuestionKey, string>>> {
  const requestedCount = input.mode === "guided" ? 3 : 5;
  const selectedGaps = input.gaps.slice(0, requestedCount);
  const answers: Partial<Record<AnalyzeInterviewQuestionKey, string>> = {
    ...(input.answers ?? {}),
  };

  if (!input.interactive) {
    return answers;
  }

  for (const gap of selectedGaps) {
    if (sanitizePromptValue(answers[gap.key] ?? "", "").length > 0) {
      continue;
    }
    const response = await promptInput({
      message: gap.question,
      default: "",
    });
    if (sanitizePromptValue(response, "").length > 0) {
      answers[gap.key] = response;
    }
  }

  return answers;
}

export async function runAnalyzeDeepInterview(input: {
  cwd: string;
  technical: RepoTechnicalAnalysis[];
  business: RepoBusinessAnalysis[];
  fusion: WorkspaceFusionResult;
  command: RunAnalyzeCommandInput;
}): Promise<{ summary: AnalyzeInterviewSummary; phase: AnalyzePhaseSummary }> {
  const terminalInteractive = shouldUseInteractiveInterview(input.command);
  const currentTool = detectCurrentAgentToolFromEnv();
  const aiInteractive = currentTool !== null;
  const pendingState = await readAnalyzeInterviewPendingState(input.cwd);
  const pendingAnswers = pendingState?.answers ?? {};
  const explicitAnswers = input.command.interview?.answers ?? {};
  const providedAnswers = {
    ...pendingAnswers,
    ...explicitAnswers,
  };
  const hasProvidedAnswers = Object.values(providedAnswers).some(
    (value) => sanitizePromptValue(value ?? "", "").length > 0,
  );
  let context = inferProjectContext(input);
  const confidenceBefore = scoreProjectContext(context, input.fusion);
  const gaps = detectKnowledgeGaps(confidenceBefore);
  const mode = chooseInterviewMode(
    hasProvidedAnswers
      ? {
          ...input.command.interview,
          answers: providedAnswers,
        }
      : input.command.interview,
    terminalInteractive || aiInteractive,
    gaps,
    input.fusion,
  );

  let asked = 0;
  let answered = 0;
  let assumptionsApplied: AnalyzeInterviewAssumption[] = [];
  let pendingQuestions: AnalyzeKnowledgeGap[] = [];
  if (mode === "guided" || mode === "deep") {
    const answers = await collectAnswers({
      mode,
      interactive: terminalInteractive,
      gaps,
      answers: providedAnswers,
    });
    const selectedGaps = gaps.slice(0, mode === "guided" ? 3 : 5);
    asked = selectedGaps.length;
    for (const gap of selectedGaps) {
      const answer = sanitizePromptValue(answers[gap.key] ?? "", "");
      if (answer.length === 0) {
        continue;
      }
      context = applyAnswer(context, gap.key, answer);
      answered += 1;
    }
    for (const key of QUESTION_ORDER) {
      if (selectedGaps.some((gap) => gap.key === key)) {
        continue;
      }
      const answer = sanitizePromptValue(answers[key] ?? "", "");
      if (answer.length === 0) {
        continue;
      }
      context = applyAnswer(context, key, answer);
      answered += 1;
    }

    if (!terminalInteractive && aiInteractive) {
      const unansweredGaps = selectedGaps.filter((gap) => sanitizePromptValue(answers[gap.key] ?? "", "").length === 0);
      assumptionsApplied = inferAssumptions({
        gaps: unansweredGaps,
        technical: input.technical,
        business: input.business,
        fusion: input.fusion,
      });
      for (const assumption of assumptionsApplied) {
        context = applyAnswer(context, assumption.key, assumption.values.join("\n"));
      }
      const assumedKeys = new Set(assumptionsApplied.map((assumption) => assumption.key));
      pendingQuestions = unansweredGaps.filter((gap) => !assumedKeys.has(gap.key));
    }
  }

  const confidenceAfter = scoreProjectContext(context, input.fusion);
  const unresolvedGaps = detectKnowledgeGaps(confidenceAfter).map((gap) => gap.key);
  if (pendingQuestions.length > 0 && (mode === "guided" || mode === "deep")) {
    const now = new Date().toISOString();
    await writeAnalyzeInterviewPendingState(input.cwd, {
      version: 1,
      mode,
      createdAt: pendingState?.createdAt ?? now,
      updatedAt: now,
      questions: pendingQuestions,
      answers: providedAnswers,
    });
  } else {
    await clearAnalyzeInterviewPendingState(input.cwd);
  }

  const summary: AnalyzeInterviewSummary = {
    mode,
    interactive: terminalInteractive || aiInteractive,
    asked,
    answered,
    gaps,
    assumptionsApplied,
    pendingQuestions,
    pendingQuestionsPath: pendingQuestions.length > 0 ? getAnalyzeInterviewPendingPath(input.cwd) : null,
    unresolvedGaps,
    confidenceBefore,
    confidenceAfter,
    context,
    artifactsUpdated: [],
  };

  const phase: AnalyzePhaseSummary = {
    name: "deep-interview",
    status: pendingQuestions.length > 0 ? "pending" : mode === "off" || mode === "passive" ? "skipped" : "completed",
    details: [
      `mode=${mode}`,
      `interactive=${terminalInteractive || aiInteractive}`,
      `gaps=${gaps.map((gap) => gap.key).join(", ") || "none"}`,
      `answered=${answered}/${asked}`,
      `assumptions=${assumptionsApplied.map((assumption) => assumption.key).join(", ") || "none"}`,
      `pending=${pendingQuestions.map((gap) => gap.key).join(", ") || "none"}`,
      `unresolved=${unresolvedGaps.join(", ") || "none"}`,
    ],
  };

  return { summary, phase };
}
