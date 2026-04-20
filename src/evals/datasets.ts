import { join } from "node:path";
import { execa } from "execa";
import { serializeConfig } from "../config/read-write.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { writeTextFile } from "../utils/fs.js";
import type { EvalDatasetDocument, EvalExperimentDocument, EvalSuiteDocument } from "./schema.js";

export interface SeedEvalArtifactsResult {
  datasetFile: string;
  experimentFile: string;
  taskflowDatasetFile: string;
  taskflowExperimentFile: string;
  recoveryTaskflowDatasetFile: string;
  recoveryTaskflowExperimentFile: string;
  autonomyTaskflowDatasetFile: string;
  autonomyTaskflowExperimentFile: string;
  hermesControlTaskflowDatasetFile: string;
  hermesControlTaskflowExperimentFile: string;
  hermesTreatmentTaskflowDatasetFile: string;
  hermesTreatmentTaskflowExperimentFile: string;
  hermesStrategySuiteFile: string;
  suiteFile: string;
  fixtureDirectory: string;
  workspaceFixtureDirectory: string;
}

export function createStarterDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
    kind: "command",
    name: "starter-runtime",
    description: "Deterministic offline evals for runtime-backed BBG commands.",
    cases: [
      {
        id: "quality-gate-pass",
        description: "quality-gate passes in the seeded fixture workspace",
        workspace: "./fixtures/runtime-starter",
        command: {
          name: "quality-gate",
        },
        expect: {
          ok: true,
          failedChecks: [],
        },
      },
      {
        id: "checkpoint-creates-baseline",
        description: "checkpoint creates a named baseline in the seeded fixture workspace",
        workspace: "./fixtures/runtime-starter",
        command: {
          name: "checkpoint",
          options: {
            name: "baseline",
          },
        },
        expect: {
          ok: true,
          checkpointFile: ".bbg/checkpoints/baseline.json",
        },
      },
      {
        id: "verify-detects-readme-drift",
        description: "verify reports drift after the fixture README changes",
        workspace: "./fixtures/runtime-starter",
        setup: [
          {
            type: "run-command",
            command: {
              name: "checkpoint",
              options: {
                name: "baseline",
              },
            },
          },
          {
            type: "write-file",
            path: "README.md",
            content: "# Runtime starter changed\n",
          },
        ],
        command: {
          name: "verify",
          options: {
            checkpoint: "baseline",
          },
        },
        expect: {
          ok: false,
          changedFiles: ["README.md"],
        },
      },
      {
        id: "analyze-fuses-workspace-multi-repo-artifacts",
        description: "analyze produces workspace-level docs and knowledge for a multi-repo fixture",
        workspace: "./fixtures/workspace-starter",
        command: {
          name: "analyze",
        },
        expect: {
          ok: true,
          scope: "workspace",
          analyzedRepos: ["web", "api"],
          docsUpdated: [
            "docs/architecture/technical-architecture.md",
            "docs/architecture/business-architecture.md",
            "docs/architecture/repo-dependency-graph.md",
            "docs/business/capability-map.md",
            "docs/business/critical-flows.md",
            "docs/architecture/integration-contracts.md",
            "docs/architecture/runtime-constraints.md",
            "docs/architecture/risk-surface.md",
            "docs/architecture/decision-history.md",
            "docs/architecture/change-impact-map.md",
            "docs/architecture/workspace-topology.md",
            "docs/architecture/integration-map.md",
            "docs/business/module-map.md",
            "docs/business/core-flows.md",
            "docs/business/project-context.md",
            "docs/business/domain-model.md",
            "docs/architecture/repos/web.md",
            "docs/repositories/web.md",
            "docs/architecture/repos/api.md",
            "docs/repositories/api.md",
            "docs/architecture/index.md",
            "docs/architecture/languages/README.md",
            "docs/architecture/languages/typescript/application-patterns.md",
            "docs/architecture/languages/typescript/type-boundaries.md",
            "docs/architecture/languages/typescript/testing-and-runtime-boundaries.md",
            "docs/wiki/index.md",
            "docs/wiki/log.md",
            "docs/wiki/reports/workspace-analysis-summary.md",
            "docs/wiki/concepts/repo-web-overview.md",
            "docs/wiki/concepts/repo-api-overview.md",
            "docs/wiki/concepts/project-context.md",
          ],
          knowledgeUpdated: [
            ".bbg/knowledge/repos/web/technical.json",
            ".bbg/knowledge/repos/web/business.json",
            ".bbg/knowledge/repos/web/patterns.json",
            ".bbg/knowledge/repos/api/technical.json",
            ".bbg/knowledge/repos/api/business.json",
            ".bbg/knowledge/repos/api/patterns.json",
            ".bbg/knowledge/workspace/topology.json",
            ".bbg/knowledge/workspace/integration-map.json",
            ".bbg/knowledge/workspace/business-modules.json",
            ".bbg/knowledge/workspace/capabilities.json",
            ".bbg/knowledge/workspace/critical-flows.json",
            ".bbg/knowledge/workspace/contracts.json",
            ".bbg/knowledge/workspace/domain-model.json",
            ".bbg/knowledge/workspace/business-context.json",
            ".bbg/knowledge/workspace/constraints.json",
            ".bbg/knowledge/workspace/risk-surface.json",
            ".bbg/knowledge/workspace/decisions.json",
            ".bbg/knowledge/workspace/change-impact.json",
          ],
        },
      },
    ],
  };
}

export function createStarterExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "starter-runtime",
    dataset: "./starter.dataset.json",
    reportFile: "./reports/starter-runtime.report.json",
  };
}

export function createStarterTaskflowDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
    kind: "taskflow",
    name: "starter-taskflow",
    description: "Taskflow evals covering start/resume/status and recovery behavior.",
    cases: [
      {
        id: "start-creates-primary-task-session",
        description: "start creates a prepared task session and status can observe it",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Fix checkout timeout",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "prepared",
            currentStep: "handoff",
          },
        },
      },
      {
        id: "resume-recovers-observation-evidence-path",
        description: "resume with missing observation evidence recreates observation state",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Fix checkout timeout",
              },
            },
          },
          {
            type: "mutate-task-session",
            patch: {
              status: "retrying",
              currentStep: "verify",
              observeSessionIds: [],
              nextActions: ["collect-evidence", "verify"],
              lastError: "observation-empty: no UI or log artifacts were collected",
            },
          },
          {
            type: "command",
            command: {
              name: "resume",
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "verifying",
            currentStep: "verify",
            lastRecoveryAction: {
              kind: "auto-observe-start",
            },
          },
        },
      },
      {
        id: "loop-and-verify-complete-runtime-lifecycle",
        description: "loop binding and verify complete a long-running runtime task lifecycle",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Stabilize checkout verification",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "checkpoint",
              options: {
                name: "baseline",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "loop-start",
              options: {
                maxIterations: "1",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "loop-status",
            },
          },
          {
            type: "command",
            command: {
              name: "verify",
              options: {
                checkpoint: "baseline",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "completed",
            currentStep: "complete",
            lastVerification: {
              ok: true,
            },
          },
          finalLoop: {
            status: "completed",
            taskId: "stabilize-checkout-verification",
            taskEnvId: "stabilize-checkout-verification",
          },
        },
      },
      {
        id: "cross-tool-resume-updates-runtime-owner",
        description: "resume can hand off a task from one tool context to another",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Fix checkout timeout",
              },
            },
          },
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "codex",
            },
          },
          {
            type: "command",
            command: {
              name: "resume",
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            entrypoint: "resume",
            tool: "codex",
            status: "implementing",
          },
        },
      },
      {
        id: "hermes-query-is-carried-into-task-context",
        description: "tasks that recommend Hermes query persist the query into runtime context",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Investigate recurring cross-repo checkout integration failure",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalContext: {
            hermesQuery: {
              executed: true,
            },
          },
        },
      },
      {
        id: "workspace-analyze-prepares-cross-repo-task-context",
        description: "workspace analysis can precede a cross-repo task and carry workspace context forward",
        workspace: "./fixtures/workspace-starter",
        steps: [
          {
            type: "command",
            command: {
              name: "analyze",
            },
          },
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Investigate recurring cross-repo checkout integration failure",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "implementing",
            currentStep: "implement",
          },
          finalContext: {
            hermesQuery: {
              executed: true,
            },
          },
        },
      },
    ],
  };
}

export function createStarterTaskflowExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "starter-taskflow",
    dataset: "./taskflow.dataset.json",
    reportFile: "./reports/starter-taskflow.report.json",
  };
}

export function createHermesControlTaskflowDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
    kind: "taskflow",
    name: "hermes-control-taskflow",
    description: "Baseline taskflow evals with Hermes explicitly disabled.",
    cases: [
      {
        id: "control-start-disables-hermes-query",
        description: "baseline flow keeps Hermes disabled for a recurring cross-repo task",
        workspace: "./fixtures/workspace-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
              BBG_DISABLE_HERMES: "1",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Investigate recurring cross-repo checkout integration failure",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalContext: {
            hermesQuery: {
              executed: false,
              strategy: "disabled",
              influencedWorkflow: false,
            },
          },
        },
      },
      {
        id: "control-verify-does-not-inherit-hermes-influence",
        description: "baseline retry flow does not attach Hermes recovery or verification influence",
        workspace: "./fixtures/workspace-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
              BBG_DISABLE_HERMES: "1",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Investigate recurring cross-repo checkout integration failure",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "checkpoint",
              options: {
                name: "baseline",
              },
            },
          },
          {
            type: "write-file",
            path: "README.md",
            content: "# Hermes control verification drift\n",
          },
          {
            type: "command",
            command: {
              name: "verify",
              options: {
                checkpoint: "baseline",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "retrying",
          },
          finalContext: {
            hermesQuery: {
              executed: false,
              influencedRecovery: false,
              influencedVerification: false,
            },
          },
        },
      },
    ],
  };
}

export function createHermesControlTaskflowExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "hermes-control-taskflow",
    dataset: "./hermes-control.taskflow.dataset.json",
    reportFile: "./reports/hermes-control-taskflow.report.json",
  };
}

export function createHermesTreatmentTaskflowDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
    kind: "taskflow",
    name: "hermes-treatment-taskflow",
    description: "Treatment taskflow evals with Hermes enabled and forced into task recovery.",
    cases: [
      {
        id: "treatment-start-carries-hermes-query-and-workflow-influence",
        description: "treatment flow records Hermes query execution and workflow influence",
        workspace: "./fixtures/workspace-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
              BBG_FORCE_HERMES: "1",
              BBG_DISABLE_HERMES: null,
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Investigate recurring cross-repo checkout integration failure",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalContext: {
            hermesQuery: {
              executed: true,
              strategy: "forced",
              influencedWorkflow: true,
            },
          },
        },
      },
      {
        id: "treatment-verify-records-hermes-recovery-and-verification-influence",
        description: "treatment retry flow records Hermes influence on verify and recovery",
        workspace: "./fixtures/workspace-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
              BBG_FORCE_HERMES: "1",
              BBG_DISABLE_HERMES: null,
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Investigate recurring cross-repo checkout integration failure",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "checkpoint",
              options: {
                name: "baseline",
              },
            },
          },
          {
            type: "write-file",
            path: "README.md",
            content: "# Hermes treatment verification drift\n",
          },
          {
            type: "command",
            command: {
              name: "verify",
              options: {
                checkpoint: "baseline",
              },
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "retrying",
          },
          finalContext: {
            hermesQuery: {
              executed: true,
              influencedRecovery: true,
              influencedVerification: true,
            },
          },
        },
      },
    ],
  };
}

export function createHermesTreatmentTaskflowExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "hermes-treatment-taskflow",
    dataset: "./hermes-treatment.taskflow.dataset.json",
    reportFile: "./reports/hermes-treatment-taskflow.report.json",
  };
}

export function createHermesStrategySuiteDocument(): EvalSuiteDocument {
  return {
    version: 1,
    name: "hermes-strategy-suite",
    experiments: [
      "./hermes-control.taskflow.experiment.json",
      "./hermes-treatment.taskflow.experiment.json",
    ],
    reportFile: "./reports/hermes-strategy-suite.report.json",
  };
}

export function createRecoveryTaskflowDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
    kind: "taskflow",
    name: "recovery-taskflow",
    description: "Taskflow evals focused on recovery plan quality and recovery-path execution.",
    cases: [
      {
        id: "recovery-collect-evidence-resume",
        description: "resume recreates observation flow when evidence is missing",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Fix checkout timeout",
              },
            },
          },
          {
            type: "mutate-task-session",
            patch: {
              status: "retrying",
              currentStep: "verify",
              observeSessionIds: [],
              nextActions: ["collect-evidence", "verify"],
              lastError: "observation-empty: no UI or log artifacts were collected",
            },
          },
          {
            type: "command",
            command: {
              name: "resume",
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "verifying",
            currentStep: "verify",
            lastRecoveryAction: {
              kind: "auto-observe-start",
            },
          },
          finalContext: {
            recovery: {
              recoveryPlan: {
                kind: "collect-evidence",
              },
            },
          },
        },
      },
      {
        id: "recovery-retry-implement-resume",
        description: "resume returns runtime verification retries to implementation work",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Fix checkout timeout",
              },
            },
          },
          {
            type: "mutate-task-session",
            patch: {
              status: "retrying",
              currentStep: "implement",
              nextActions: ["investigate-failures", "implement", "verify"],
              lastError: "checkpoint-or-runtime-verification-failed",
            },
          },
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "codex",
            },
          },
          {
            type: "command",
            command: {
              name: "resume",
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            entrypoint: "resume",
            tool: "codex",
            status: "implementing",
            currentStep: "implement",
          },
          finalContext: {
            recovery: {
              recoveryPlan: {
                kind: "retry-implement",
              },
            },
          },
        },
      },
      {
        id: "recovery-manual-review-is-surfaced",
        description: "status keeps manual-review plans visible when task-env recovery has failed",
        workspace: "./fixtures/runtime-starter",
        steps: [
          {
            type: "set-env",
            values: {
              BBG_CURRENT_TOOL: "claude",
            },
          },
          {
            type: "command",
            command: {
              name: "start",
              options: {
                task: "Fix checkout timeout",
              },
            },
          },
          {
            type: "mutate-task-session",
            patch: {
              status: "blocked",
              blockedReason: "task-env recovery failed",
              lastError: "worktree missing",
              currentStep: "verify",
              nextActions: ["repair-task-env", "resume"],
            },
          },
          {
            type: "command",
            command: {
              name: "status",
            },
          },
        ],
        expect: {
          finalTask: {
            status: "blocked",
            blockedReason: "task-env recovery failed",
          },
          finalContext: {
            recovery: {
              recoveryPlan: {
                kind: "manual-review",
              },
            },
          },
        },
      },
    ],
  };
}

export function createRecoveryTaskflowExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "recovery-taskflow",
    dataset: "./recovery.taskflow.dataset.json",
    reportFile: "./reports/recovery-taskflow.report.json",
  };
}

export function createAutonomyTaskflowDatasetDocument(): EvalDatasetDocument {
  return {
    version: 1,
    kind: "taskflow",
    name: "autonomy-guardrails-taskflow",
    description: "Taskflow evals covering attempt, verification, and duration guardrails.",
    cases: [
      {
        id: "autonomy-attempt-budget-escalates-to-manual-review",
        description: "resume escalates to manual review when attempt budget is exceeded",
        workspace: "./fixtures/runtime-starter",
        steps: [
          { type: "set-env", values: { BBG_CURRENT_TOOL: "claude" } },
          { type: "command", command: { name: "start", options: { task: "Fix checkout timeout" } } },
          { type: "mutate-task-session", patch: { attemptCount: 6, status: "retrying", currentStep: "implement", nextActions: ["implement", "verify"] } },
          { type: "command", command: { name: "resume" } },
        ],
        expect: {
          finalTask: {
            status: "blocked",
            blockedReason: "autonomy budget exceeded",
          },
          finalContext: {
            recovery: {
              recoveryPlan: {
                kind: "manual-review",
              },
            },
            taskState: {
              autonomy: {
                escalated: true,
              },
            },
          },
        },
      },
      {
        id: "autonomy-verify-failure-budget-escalates-on-verify",
        description: "verify escalates to manual review when verification failure budget is exceeded",
        workspace: "./fixtures/runtime-starter",
        steps: [
          { type: "set-env", values: { BBG_CURRENT_TOOL: "claude" } },
          { type: "command", command: { name: "start", options: { task: "Fix checkout timeout" } } },
          { type: "mutate-task-session", patch: { autonomy: { maxAttempts: 5, maxVerifyFailures: 1, maxDurationMs: 3600000, verifyFailureCount: 0, escalated: false, escalationReason: null, escalatedAt: null } } },
          { type: "command", command: { name: "checkpoint", options: { name: "baseline" } } },
          { type: "write-file", path: "README.md", content: "# Runtime starter changed\n" },
          { type: "command", command: { name: "verify", options: { checkpoint: "baseline" } } },
        ],
        expect: {
          finalTask: {
            status: "blocked",
            blockedReason: "autonomy budget exceeded",
            lastRecoveryAction: {
              kind: "autonomy-budget-escalation",
            },
          },
          finalContext: {
            recovery: {
              recoveryPlan: {
                kind: "manual-review",
              },
            },
          },
        },
      },
      {
        id: "autonomy-duration-budget-escalates-on-resume",
        description: "resume escalates when task runtime exceeds duration budget",
        workspace: "./fixtures/runtime-starter",
        steps: [
          { type: "set-env", values: { BBG_CURRENT_TOOL: "claude" } },
          { type: "command", command: { name: "start", options: { task: "Fix checkout timeout" } } },
          {
            type: "mutate-task-session",
            patch: {
              startedAt: "2020-01-01T00:00:00.000Z",
              status: "retrying",
              currentStep: "implement",
            },
          },
          { type: "command", command: { name: "resume" } },
        ],
        expect: {
          finalTask: {
            status: "blocked",
            blockedReason: "autonomy budget exceeded",
          },
          finalContext: {
            recovery: {
              recoveryPlan: {
                kind: "manual-review",
              },
            },
          },
        },
      },
    ],
  };
}

export function createAutonomyTaskflowExperimentDocument(): EvalExperimentDocument {
  return {
    version: 1,
    name: "autonomy-guardrails-taskflow",
    dataset: "./autonomy.taskflow.dataset.json",
    reportFile: "./reports/autonomy-guardrails-taskflow.report.json",
  };
}

export function createStarterSuiteDocument(): EvalSuiteDocument {
  return {
    version: 1,
    name: "starter-runtime-suite",
    experiments: [
      "./starter.experiment.json",
      "./taskflow.experiment.json",
      "./recovery.taskflow.experiment.json",
      "./autonomy.taskflow.experiment.json",
      "./hermes-control.taskflow.experiment.json",
      "./hermes-treatment.taskflow.experiment.json",
    ],
    reportFile: "./reports/starter-suite.report.json",
  };
}

async function seedRuntimeFixture(cwd: string, fixtureDirectory: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  const fixtureRoot = join(cwd, fixtureDirectory);

  await writeTextFile(join(fixtureRoot, "README.md"), "# Runtime starter\n");
  await writeTextFile(join(fixtureRoot, "AGENTS.md"), "# Eval Fixture\n\nPrimary task entrypoint is `bbg start`.\n");
  await writeTextFile(join(fixtureRoot, "RULES.md"), "# Rules\n\nUse deterministic eval-friendly workflows.\n");
  await writeTextFile(join(fixtureRoot, "commands", "plan.md"), "# Plan\n\nCreate an implementation plan from canonical repo guidance before making changes.\n");
  await writeTextFile(join(fixtureRoot, "commands", "hermes-query.md"), "# Hermes Query\n\nAnswer task questions using local Hermes context before re-deriving solutions.\n");
  await writeTextFile(join(fixtureRoot, "skills", "tdd-workflow", "SKILL.md"), "# TDD Workflow\n\nFollow RED -> GREEN -> IMPROVE.\n");
  await writeTextFile(join(fixtureRoot, "package.json"), `${JSON.stringify({
    name: "bbg-eval-runtime-starter",
    private: true,
    type: "module",
    scripts: {
      build: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
      lint: 'node -e "process.exit(0)"',
    },
  }, null, 2)}\n`);
  await writeTextFile(join(fixtureRoot, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "runtime-starter",
    projectDescription: "deterministic runtime eval fixture",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repos: [],
    governance: {
      riskThresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
      enableRedTeam: true,
      enableCrossAudit: true,
    },
    context: {},
    runtime,
  }));

  await execa("git", ["init"], { cwd: fixtureRoot });
  await execa("git", ["config", "user.name", "BBG Eval"], { cwd: fixtureRoot });
  await execa("git", ["config", "user.email", "eval@bbg.local"], { cwd: fixtureRoot });
  await execa("git", ["add", "."], { cwd: fixtureRoot });
  await execa("git", ["commit", "-m", "chore: seed eval fixture"], { cwd: fixtureRoot });
}

async function seedWorkspaceFixture(cwd: string, fixtureDirectory: string): Promise<void> {
  const runtime = buildDefaultRuntimeConfig();
  const fixtureRoot = join(cwd, fixtureDirectory);

  await writeTextFile(join(fixtureRoot, "README.md"), "# Workspace starter\n");
  await writeTextFile(join(fixtureRoot, "AGENTS.md"), "# Workspace Eval Fixture\n\nPrimary task entrypoint is `bbg start`.\n");
  await writeTextFile(join(fixtureRoot, "RULES.md"), "# Rules\n\nFavor deterministic multi-repo workflows.\n");
  await writeTextFile(join(fixtureRoot, "commands", "plan.md"), "# Plan\n\nUse workspace context before starting cross-repo tasks.\n");
  await writeTextFile(join(fixtureRoot, "commands", "hermes-query.md"), "# Hermes Query\n\nPrefer existing workspace knowledge when tasks span multiple repos.\n");
  await writeTextFile(join(fixtureRoot, "skills", "tdd-workflow", "SKILL.md"), "# TDD Workflow\n\nFollow RED -> GREEN -> IMPROVE.\n");
  await writeTextFile(join(fixtureRoot, "package.json"), `${JSON.stringify({
    name: "bbg-eval-workspace-starter",
    private: true,
    type: "module",
  }, null, 2)}\n`);

  await writeTextFile(join(fixtureRoot, "web", "package.json"), `${JSON.stringify({
    name: "workspace-web",
    private: true,
    type: "module",
    dependencies: {
      next: "^15.2.0",
    },
    devDependencies: {
      typescript: "^5.8.2",
    },
    scripts: {
      build: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
      lint: 'node -e "process.exit(0)"',
    },
  }, null, 2)}\n`);
  await writeTextFile(join(fixtureRoot, "web", "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Node",
      strict: true,
    },
    include: ["src"],
  }, null, 2)}\n`);
  await writeTextFile(join(fixtureRoot, "web", "src", "checkout.ts"), "export const checkout = true;\n");

  await writeTextFile(join(fixtureRoot, "api", "package.json"), `${JSON.stringify({
    name: "workspace-api",
    private: true,
    type: "module",
    devDependencies: {
      typescript: "^5.8.2",
    },
    scripts: {
      build: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
      lint: 'node -e "process.exit(0)"',
    },
  }, null, 2)}\n`);
  await writeTextFile(join(fixtureRoot, "api", "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Node",
      strict: true,
    },
    include: ["src"],
  }, null, 2)}\n`);
  await writeTextFile(join(fixtureRoot, "api", "src", "checkout-route.ts"), "export const checkoutRoute = true;\n");

  await writeTextFile(join(fixtureRoot, ".bbg", "config.json"), serializeConfig({
    version: "0.1.0",
    projectName: "workspace-starter",
    projectDescription: "deterministic workspace eval fixture",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    repos: [
      {
        name: "web",
        gitUrl: "https://example.com/web.git",
        branch: "main",
        type: "frontend-web",
        description: "checkout web frontend",
        stack: {
          language: "typescript",
          framework: "nextjs",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
      },
      {
        name: "api",
        gitUrl: "https://example.com/api.git",
        branch: "main",
        type: "backend",
        description: "checkout api backend",
        stack: {
          language: "typescript",
          framework: "node",
          buildTool: "npm",
          testFramework: "vitest",
          packageManager: "npm",
        },
      },
    ],
    governance: {
      riskThresholds: {
        high: { grade: "A+", minScore: 99 },
        medium: { grade: "A", minScore: 95 },
        low: { grade: "B", minScore: 85 },
      },
      enableRedTeam: true,
      enableCrossAudit: true,
    },
    context: {},
    runtime,
  }));

  await execa("git", ["init"], { cwd: fixtureRoot });
  await execa("git", ["config", "user.name", "BBG Eval"], { cwd: fixtureRoot });
  await execa("git", ["config", "user.email", "eval@bbg.local"], { cwd: fixtureRoot });
  await execa("git", ["add", "."], { cwd: fixtureRoot });
  await execa("git", ["commit", "-m", "chore: seed workspace eval fixture"], { cwd: fixtureRoot });
}

export async function seedEvalArtifacts(input: { cwd: string }): Promise<SeedEvalArtifactsResult> {
  const datasetFile = "evals/starter.dataset.json";
  const experimentFile = "evals/starter.experiment.json";
  const taskflowDatasetFile = "evals/taskflow.dataset.json";
  const taskflowExperimentFile = "evals/taskflow.experiment.json";
  const recoveryTaskflowDatasetFile = "evals/recovery.taskflow.dataset.json";
  const recoveryTaskflowExperimentFile = "evals/recovery.taskflow.experiment.json";
  const autonomyTaskflowDatasetFile = "evals/autonomy.taskflow.dataset.json";
  const autonomyTaskflowExperimentFile = "evals/autonomy.taskflow.experiment.json";
  const hermesControlTaskflowDatasetFile = "evals/hermes-control.taskflow.dataset.json";
  const hermesControlTaskflowExperimentFile = "evals/hermes-control.taskflow.experiment.json";
  const hermesTreatmentTaskflowDatasetFile = "evals/hermes-treatment.taskflow.dataset.json";
  const hermesTreatmentTaskflowExperimentFile = "evals/hermes-treatment.taskflow.experiment.json";
  const hermesStrategySuiteFile = "evals/hermes-strategy.suite.json";
  const suiteFile = "evals/starter.suite.json";
  const fixtureDirectory = "evals/fixtures/runtime-starter";
  const workspaceFixtureDirectory = "evals/fixtures/workspace-starter";

  await writeTextFile(join(input.cwd, datasetFile), `${JSON.stringify(createStarterDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, experimentFile), `${JSON.stringify(createStarterExperimentDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, taskflowDatasetFile), `${JSON.stringify(createStarterTaskflowDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, taskflowExperimentFile), `${JSON.stringify(createStarterTaskflowExperimentDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, recoveryTaskflowDatasetFile), `${JSON.stringify(createRecoveryTaskflowDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, recoveryTaskflowExperimentFile), `${JSON.stringify(createRecoveryTaskflowExperimentDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, autonomyTaskflowDatasetFile), `${JSON.stringify(createAutonomyTaskflowDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, autonomyTaskflowExperimentFile), `${JSON.stringify(createAutonomyTaskflowExperimentDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, hermesControlTaskflowDatasetFile), `${JSON.stringify(createHermesControlTaskflowDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, hermesControlTaskflowExperimentFile), `${JSON.stringify(createHermesControlTaskflowExperimentDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, hermesTreatmentTaskflowDatasetFile), `${JSON.stringify(createHermesTreatmentTaskflowDatasetDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, hermesTreatmentTaskflowExperimentFile), `${JSON.stringify(createHermesTreatmentTaskflowExperimentDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, hermesStrategySuiteFile), `${JSON.stringify(createHermesStrategySuiteDocument(), null, 2)}\n`);
  await writeTextFile(join(input.cwd, suiteFile), `${JSON.stringify(createStarterSuiteDocument(), null, 2)}\n`);
  await seedRuntimeFixture(input.cwd, fixtureDirectory);
  await seedWorkspaceFixture(input.cwd, workspaceFixtureDirectory);

  return {
    datasetFile,
    experimentFile,
    taskflowDatasetFile,
    taskflowExperimentFile,
    recoveryTaskflowDatasetFile,
    recoveryTaskflowExperimentFile,
    autonomyTaskflowDatasetFile,
    autonomyTaskflowExperimentFile,
    hermesControlTaskflowDatasetFile,
    hermesControlTaskflowExperimentFile,
    hermesTreatmentTaskflowDatasetFile,
    hermesTreatmentTaskflowExperimentFile,
    hermesStrategySuiteFile,
    suiteFile,
    fixtureDirectory,
    workspaceFixtureDirectory,
  };
}
