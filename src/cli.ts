#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { fileURLToPath } from "node:url";
import { CLI_NAME, CLI_VERSION } from "./constants.js";
import { runAddRepo } from "./commands/add-repo.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runRelease } from "./commands/release.js";
import { runCheckpointCommand } from "./commands/checkpoint.js";
import { runQualityGateCommand } from "./commands/quality-gate.js";
import { runSessionsCommand } from "./commands/sessions.js";
import { runSync } from "./commands/sync.js";
import { runUpgrade } from "./commands/upgrade.js";
import { runVerifyCommand } from "./commands/verify.js";
import { runReviewRecordCommand } from "./commands/review-record.js";
import { runEvalCommand } from "./commands/eval.js";
import { runHarnessAuditCommand } from "./commands/harness-audit.js";
import { runModelRouteCommand } from "./commands/model-route.js";
import { runTaskStartCommand } from "./commands/task-start.js";
import { runAnalyzeCommand } from "./commands/analyze.js";
import { runAnalyzeRepoCommand } from "./commands/analyze-repo.js";
import { runDeliverCommand } from "./commands/deliver.js";
import { runCrossAuditCommand } from "./commands/cross-audit.js";
import { runRepairAdapters } from "./commands/repair-adapters.js";
import { runHermesCommand, type HermesKind } from "./commands/hermes.js";
import { runTaskEnvCommand } from "./commands/task-env.js";
import { runDocGardenCommand } from "./commands/doc-garden.js";
import { runObserveCommand } from "./commands/observe.js";
import { runLoopStartCommand } from "./commands/loop-start.js";
import { runLoopStatusCommand } from "./commands/loop-status.js";
import { runWorkflowCommand } from "./commands/workflow.js";
import { runStartCommand } from "./commands/start.js";
import { runResumeCommand } from "./commands/resume.js";
import { runStatusCommand } from "./commands/status.js";
import { ConfigParseError, ConfigValidationError } from "./config/read-write.js";
import { BbgConfigError, BbgError, BbgGitError, BbgTemplateError } from "./utils/errors.js";
import type { WorkflowDecisionSet, WorkflowKind } from "./workflow/types.js";

const mapCliErrorToExitCode = (error: unknown): number => {
  if (error instanceof BbgConfigError) {
    return 2;
  }

  if (error instanceof ConfigParseError || error instanceof ConfigValidationError) {
    return 2;
  }

  if (error instanceof BbgGitError) {
    return 3;
  }

  if (error instanceof BbgTemplateError) {
    return 4;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "name" in error) &&
    ((error as { code?: string }).code === "SIGINT" ||
      (error as { code?: string }).code === "ABORT_ERR" ||
      (error as { name?: string }).name === "AbortError")
  ) {
    return 130;
  }

  return 1;
};

const printWorkflowResult = (result: {
  kind: WorkflowKind;
  task: string | null;
  commandSpecPath: string;
  summary: string;
  references: string[];
  hermesRecommendations: string[];
  decisions: WorkflowDecisionSet;
  nextActions: string[];
}): void => {
  process.stdout.write(`Workflow: ${result.kind}\n`);
  if (result.task) {
    process.stdout.write(`Task: ${result.task}\n`);
  }
  process.stdout.write(`Spec: ${result.commandSpecPath}\n`);
  process.stdout.write(`Summary: ${result.summary}\n`);
  process.stdout.write(`References: ${result.references.join(", ")}\n`);
  if (result.hermesRecommendations.length > 0) {
    process.stdout.write("Hermes recommendations:\n");
    for (const recommendation of result.hermesRecommendations) {
      process.stdout.write(`- ${recommendation}\n`);
    }
  }
  process.stdout.write("Decisions:\n");
  for (const [name, decision] of Object.entries(result.decisions)) {
    const suffix = decision.reasons.length > 0 ? ` (${decision.reasons.join(", ")})` : "";
    process.stdout.write(`- ${name}: ${decision.decision}${suffix}\n`);
  }
  if (result.nextActions.length > 0) {
    process.stdout.write(`Next: ${result.nextActions.join(", ")}\n`);
  }
};

const printHermesResult = (result: {
  kind: HermesKind;
  topic: string | null;
  commandSpecPath: string;
  summary: string;
  references: string[];
}): void => {
  process.stdout.write(`Hermes: ${result.kind}\n`);
  if (result.topic) {
    process.stdout.write(`Topic: ${result.topic}\n`);
  }
  process.stdout.write(`Spec: ${result.commandSpecPath}\n`);
  process.stdout.write(`Summary: ${result.summary}\n`);
  process.stdout.write(`References: ${result.references.join(", ")}\n`);
};

const printTaskEnvResult = (result: Awaited<ReturnType<typeof runTaskEnvCommand>>): void => {
  if (result.mode === "status") {
    process.stdout.write(`Task environments: ${result.envs?.length ?? 0}\n`);
    for (const env of result.envs ?? []) {
      process.stdout.write(`- ${env.id}: ${env.status} (${env.worktreePath})\n`);
    }
    return;
  }

  if (!result.env) {
    return;
  }

  process.stdout.write(`Task environment: ${result.env.id}\n`);
  process.stdout.write(`Status: ${result.env.status}\n`);
  process.stdout.write(`Worktree: ${result.env.worktreePath}\n`);
  process.stdout.write(`Artifacts: ${result.env.artifactRoot}\n`);
};

const printDocGardenResult = (result: Awaited<ReturnType<typeof runDocGardenCommand>>): void => {
  if (!result.report) {
    process.stdout.write("Doc garden report: none\n");
    return;
  }

  process.stdout.write(`Doc garden docs: ${result.report.docsScanned}\n`);
  process.stdout.write(`Doc garden findings: ${result.report.findings.length}\n`);
  for (const finding of result.report.findings.slice(0, 10)) {
    process.stdout.write(`- ${finding.docPath}: ${finding.message}\n`);
  }
};

const printObserveResult = (result: Awaited<ReturnType<typeof runObserveCommand>>): void => {
  if (result.mode === "start" && result.session) {
    process.stdout.write(`Observation: ${result.session.id}\n`);
    process.stdout.write(`Artifacts: ${result.session.rootPath}\n`);
    return;
  }

  if (result.report) {
    process.stdout.write(`Observation: ${result.report.id}\n`);
    process.stdout.write(`UI artifacts: ${result.report.uiArtifacts}\n`);
    process.stdout.write(`Log artifacts: ${result.report.logArtifacts}\n`);
    process.stdout.write(`Metric artifacts: ${result.report.metricArtifacts}\n`);
    process.stdout.write(`Trace artifacts: ${result.report.traceArtifacts}\n`);
    process.stdout.write(`Evidence kinds: ${result.report.evidenceKinds.length > 0 ? result.report.evidenceKinds.join(", ") : "none"}\n`);
    process.stdout.write(`Readiness: ${result.report.readiness}\n`);
  }
};

const printTaskSessionResult = (label: "Start" | "Resume", result: Awaited<ReturnType<typeof runStartCommand>>): void => {
  const runner = result.session.runner ?? { mode: "prepare", tool: result.session.tool ?? null, launched: false };
  const currentStep = result.session.currentStep ?? "none";
  const attemptCount = result.session.attemptCount ?? 0;
  process.stdout.write(`${label}: ${result.session.taskId}\n`);
  process.stdout.write(`Status: ${result.session.status}\n`);
  process.stdout.write(`Task: ${result.session.task}\n`);
  process.stdout.write(`Workflow: ${result.session.workflowKind}\n`);
  process.stdout.write(`Tool: ${result.session.tool ?? "none"}\n`);
  process.stdout.write(`Step: ${currentStep}\n`);
  process.stdout.write(`Attempts: ${attemptCount}\n`);
  process.stdout.write(
    `Autonomy: attempts=${result.session.attemptCount}/${result.session.autonomy.maxAttempts}, verify-failures=${result.session.autonomy.verifyFailureCount}/${result.session.autonomy.maxVerifyFailures}, escalated=${result.session.autonomy.escalated ? "yes" : "no"}\n`,
  );
  if (result.session.autonomy.escalationReason) {
    process.stdout.write(`Autonomy reason: ${result.session.autonomy.escalationReason}\n`);
  }
  process.stdout.write(
    `Runner: ${runner.mode} (tool=${runner.tool ?? "none"}, launched=${runner.launched ? "yes" : "no"}, command=${runner.command ?? "none"})\n`,
  );
  if (result.session.taskEnvId) {
    process.stdout.write(`Task environment: ${result.session.taskEnvId}\n`);
  }
  if (result.session.observeSessionIds.length > 0) {
    process.stdout.write(`Observations: ${result.session.observeSessionIds.join(", ")}\n`);
  }
  if (result.context.modelRoute) {
    process.stdout.write(
      `Route: ${result.context.modelRoute.recommendation.modelClass} (${result.context.modelRoute.classification.domain}/${result.context.modelRoute.classification.complexity})\n`,
    );
    if (result.context.modelRoute.recommendation.reviewerAgents.length > 0) {
      process.stdout.write(`Route reviewers: ${result.context.modelRoute.recommendation.reviewerAgents.join(", ")}\n`);
    }
  }
  if (result.context.reviewGate.level !== "none") {
    process.stdout.write(`Review gate: ${result.context.reviewGate.level}\n`);
    process.stdout.write(`Review gate reason: ${result.context.reviewGate.reason}\n`);
  }
  if (result.context.languageGuidance?.reviewHint) {
    process.stdout.write(`Language review: ${result.context.languageGuidance.reviewHint}\n`);
  }
  process.stdout.write(`Handoff: ${result.handoffPath}\n`);
  if (result.session.lastError) {
    process.stdout.write(`Last error: ${result.session.lastError}\n`);
  }
  if (result.session.blockedReason) {
    process.stdout.write(`Blocked: ${result.session.blockedReason}\n`);
  }
  process.stdout.write(`Next: ${result.session.nextActions.join(", ")}\n`);
};

const printStatusResult = (result: Awaited<ReturnType<typeof runStatusCommand>>): void => {
  process.stdout.write(
    `Analyze: ${result.analyze.status ?? "none"} (${result.analyze.scope ?? "n/a"}, ${result.analyze.runId ?? "latest-none"})\n`,
  );
  process.stdout.write(`Tasks: ${result.tasks.length}\n`);
  for (const task of result.tasks) {
    const currentStep = task.currentStep ?? "none";
    const attemptCount = task.attemptCount ?? 0;
    const runner = task.runner ?? { mode: "prepare", tool: task.tool ?? null, launched: false };
    process.stdout.write(
      `- ${task.taskId}: ${task.status} (step=${currentStep}, attempts=${attemptCount}, tool=${task.tool ?? "unknown"}, env=${task.taskEnvId ?? "none"})\n`,
    );
    process.stdout.write(
      `  autonomy: attempts=${task.attemptCount}/${task.autonomy.maxAttempts}, verify-failures=${task.autonomy.verifyFailureCount}/${task.autonomy.maxVerifyFailures}, escalated=${task.autonomy.escalated ? "yes" : "no"}\n`,
    );
    if (task.autonomy.escalationReason) {
      process.stdout.write(`  autonomy reason: ${task.autonomy.escalationReason}\n`);
    }
    process.stdout.write(
      `  runner: ${runner.mode} (tool=${runner.tool ?? "none"}, launched=${runner.launched ? "yes" : "no"}, command=${runner.command ?? "none"})\n`,
    );
    if (runner.lastLaunchError) {
      process.stdout.write(`  runner error: ${runner.lastLaunchError}\n`);
    }
    process.stdout.write(
      `  resume: ${task.resumeStrategy.kind} (preferred=${task.resumeStrategy.preferredTool ?? "none"}, fallback=${task.resumeStrategy.fallbackTool ?? "none"})\n`,
    );
    process.stdout.write(`  resume reason: ${task.resumeStrategy.reason}\n`);
    process.stdout.write(
      `  recovery: ${task.recoveryPlan.kind} (${task.recoveryPlan.actions.length > 0 ? task.recoveryPlan.actions.join(", ") : "none"})\n`,
    );
    process.stdout.write(`  recovery reason: ${task.recoveryPlan.reason}\n`);
    if (task.modelRoute) {
      process.stdout.write(
        `  route: ${task.modelRoute.recommendation.modelClass} (${task.modelRoute.classification.domain}/${task.modelRoute.classification.complexity})\n`,
      );
      if (task.modelRoute.recommendation.reviewerAgents.length > 0) {
        process.stdout.write(`  route reviewers: ${task.modelRoute.recommendation.reviewerAgents.join(", ")}\n`);
      }
    }
    if (task.reviewGate.level !== "none") {
      process.stdout.write(`  review gate: ${task.reviewGate.level}\n`);
      process.stdout.write(`  review gate reason: ${task.reviewGate.reason}\n`);
    }
    if (task.languageGuidance?.reviewHint) {
      process.stdout.write(`  language review: ${task.languageGuidance.reviewHint}\n`);
    }
    process.stdout.write(`  next: ${task.nextActions.length > 0 ? task.nextActions.join(", ") : "(none)"}\n`);
    if (task.lastVerification) {
      process.stdout.write(
        `  verification: ${task.lastVerification.ok ? "pass" : "fail"} (readiness=${task.lastVerification.observationReadiness}, missing=${task.lastVerification.missingEvidence.length > 0 ? task.lastVerification.missingEvidence.join(", ") : "none"})\n`,
      );
    }
    if (task.lastRecoveryAction) {
      process.stdout.write(`  recovery action: ${task.lastRecoveryAction.kind} (${task.lastRecoveryAction.detail})\n`);
    }
    if (task.lastError) {
      process.stdout.write(`  last error: ${task.lastError}\n`);
    }
    if (task.blockedReason) {
      process.stdout.write(`  blocked: ${task.blockedReason}\n`);
    }
  }
  process.stdout.write(`Task envs: ${result.taskEnvs.length}\n`);
  for (const env of result.taskEnvs) {
    process.stdout.write(`- ${env.id}: ${env.status} (base=${env.baseRef}, worktree=${env.worktreePath})\n`);
  }
  process.stdout.write(`Observations: ${result.observations.length}\n`);
  for (const observation of result.observations) {
    process.stdout.write(
      `- ${observation.id}: readiness=${observation.readiness}, total=${observation.totalArtifacts}, ui=${observation.uiArtifacts}, logs=${observation.logArtifacts}, metrics=${observation.metricArtifacts}, traces=${observation.traceArtifacts}, env=${observation.envId ?? "none"}\n`,
    );
  }
  process.stdout.write(`Loops: ${result.loops.length}\n`);
  for (const loop of result.loops) {
    process.stdout.write(
      `- ${loop.id}: ${loop.status} (iterations=${loop.iterations}, task=${loop.taskId ?? "none"}, env=${loop.taskEnvId ?? "none"})\n`,
    );
  }
};

export const buildProgram = (): Command => {
  const program = new Command();

  program.name(CLI_NAME).description("BadBoy Genesis CLI").version(CLI_VERSION);

  program
    .command("init")
    .description("Initialize bbg project files in current directory")
    .option("-y, --yes", "Accept defaults and skip prompts", false)
    .option("--dry-run", "Show files that would be created", false)
    .action(async (options: { yes?: boolean; dryRun?: boolean }) => {
      const result = await runInit({
        cwd: process.cwd(),
        yes: options.yes ?? false,
        dryRun: options.dryRun ?? false,
      });

      process.stdout.write(`Created files (${result.createdFiles.length}):\n`);
      for (const filePath of result.createdFiles) {
        process.stdout.write(`- ${filePath}\n`);
      }

      process.stdout.write(`Cloned repositories (${result.clonedRepos.length}):\n`);
      for (const repoPath of result.clonedRepos) {
        process.stdout.write(`- ${repoPath}\n`);
      }

      process.stdout.write(`Doctor status: ${result.doctor.ok ? "OK" : "FAIL"} (${result.doctor.mode})\n`);
    });

  program
    .command("add-repo")
    .description("Add a repository to current workspace")
    .option("--url <url>", "Repository git URL")
    .option("--branch <branch>", "Repository branch")
    .option("--no-analyze", "Skip automatic analysis after registration")
    .action(async (options: { url?: string; branch?: string; analyze?: boolean }) => {
      const result = await runAddRepo({
        cwd: process.cwd(),
        url: options.url,
        branch: options.branch,
        analyze: options.analyze,
      });

      process.stdout.write(`Added repository: ${result.addedRepoName}\n`);
    });

  program
    .command("start [task...]")
    .description("Start a task using the primary workflow entrypoint")
    .option("--json", "Output task session as JSON", false)
    .action(async (task: string[] | undefined, options?: { json?: boolean }) => {
      const result = await runStartCommand({
        cwd: process.cwd(),
        task: task?.join(" ") ?? "",
      });
      if (options?.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      printTaskSessionResult("Start", result);
    });

  program
    .command("resume <taskId>")
    .description("Resume a prepared or in-progress task session")
    .option("--json", "Output task session as JSON", false)
    .action(async (taskId: string, options?: { json?: boolean }) => {
      const result = await runResumeCommand({
        cwd: process.cwd(),
        taskId,
      });
      if (options?.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      printTaskSessionResult("Resume", result);
    });

  program
    .command("status")
    .description("Show the current analyze and task session status")
    .option("--json", "Output status as JSON", false)
    .action(async (options?: { json?: boolean }) => {
      const result = await runStatusCommand({ cwd: process.cwd() });
      if (options?.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      printStatusResult(result);
    });

  program
    .command("doctor")
    .description("Validate governance and workspace health")
    .option("--json", "Output as JSON", false)
    .option("--fix", "Apply safe auto-fixes", false)
    .option("--governance-only", "Skip repo directory checks", false)
    .option("--workspace", "Include workspace checks", false)
    .option("--self", "Validate bbg's own governance content integrity", false)
    .option("--tool-matrix", "Include supported tool adapter status", false)
    .action(
      async (options: {
        json?: boolean;
        fix?: boolean;
        governanceOnly?: boolean;
        workspace?: boolean;
        self?: boolean;
        toolMatrix?: boolean;
      }) => {
        const report = await runDoctor({
          cwd: process.cwd(),
          json: options.json ?? false,
          fix: options.fix ?? false,
          governanceOnly: options.governanceOnly ?? false,
          workspace: options.workspace ?? false,
          self: options.self ?? false,
          toolMatrix: options.toolMatrix ?? false,
        });

        if (options.json) {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(`Doctor status: ${report.ok ? "OK" : "FAIL"} (${report.mode})\n`);
          process.stdout.write(`Errors: ${report.errors.length}\n`);
          process.stdout.write(`Warnings: ${report.warnings.length}\n`);
          process.stdout.write(`Checks: ${report.checks.length}\n`);
          if (report.fixesApplied.length > 0) {
            process.stdout.write(`Fixes applied (${report.fixesApplied.length}):\n`);
            for (const fixedPath of report.fixesApplied) {
              process.stdout.write(`- ${fixedPath}\n`);
            }
          }
          if (report.toolMatrix) {
            process.stdout.write(`Tool adapters (${report.toolMatrix.length}):\n`);
            for (const entry of report.toolMatrix) {
              process.stdout.write(`- ${entry.label}: ${entry.status}\n`);
            }
          }
        }

        if (!report.ok) {
          process.exitCode = report.exitCode;
        }
      },
    );

  program
    .command("sync")
    .description("Synchronize configured repositories and detect drift")
    .option("--json", "Output as JSON", false)
    .option("--update", "Update config with detected stack drift", false)
    .action(async (options: { json?: boolean; update?: boolean }) => {
      const result = await runSync({
        cwd: process.cwd(),
        json: options.json ?? false,
        update: options.update ?? false,
      });

      if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(`Repo statuses: ${result.repoStatuses.length}\n`);
      process.stdout.write(`Orphan repos: ${result.orphanRepos.length}\n`);
      process.stdout.write(`Stack drift entries: ${result.drift.length}\n`);
    });

  program
    .command("release")
    .description("Run governed release checklist and record release")
    .option("--skip-doctor", "Skip doctor check", false)
    .option("--skip-sync", "Skip sync check", false)
    .option("--skip-changelog", "Skip changelog generation", false)
    .action(async (options: { skipDoctor?: boolean; skipSync?: boolean; skipChangelog?: boolean }) => {
      const result = await runRelease({
        cwd: process.cwd(),
        skipDoctor: options.skipDoctor ?? false,
        skipSync: options.skipSync ?? false,
        skipChangelog: options.skipChangelog ?? false,
      });

      process.stdout.write(`Release version: ${result.version}\n`);
      process.stdout.write(`Checklist confirmed: ${result.checklistConfirmed ? "yes" : "no"}\n`);
      process.stdout.write(`Release record: ${result.releaseFile}\n`);
      if (result.changelogGenerated) {
        process.stdout.write(`Changelog updated: ${result.changelogPath}\n`);
      }
    });

  program
    .command("upgrade")
    .description("Upgrade generated governance files safely")
    .option("--dry-run", "Show planned changes without writing", false)
    .option("--force", "Overwrite modified files without patching", false)
    .option("--interactive", "Step through conflicts interactively", false)
    .action(async (options: { dryRun?: boolean; force?: boolean; interactive?: boolean }) => {
      const result = await runUpgrade({
        cwd: process.cwd(),
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        interactive: options.interactive ?? false,
      });

      process.stdout.write(`Overwritten: ${result.overwritten.length}\n`);
      process.stdout.write(`Merged: ${result.merged.length}\n`);
      process.stdout.write(`Conflicted: ${result.conflicted.length}\n`);
      process.stdout.write(`Patches: ${result.patches.length}\n`);
      process.stdout.write(`Skipped: ${result.skipped.length}\n`);
      process.stdout.write(`Skipped with notice: ${result.skippedWithNotice.length}\n`);
      process.stdout.write(`Skipped deleted template: ${result.skippedDeletedTemplate.length}\n`);
      process.stdout.write(`Created: ${result.created.length}\n`);
    });

  program
    .command("repair-adapters")
    .description("Repair generated AI tool adapter files")
    .action(async () => {
      const result = await runRepairAdapters({ cwd: process.cwd() });

      process.stdout.write(`Repaired: ${result.repaired.length}\n`);
      process.stdout.write(`Created: ${result.created.length}\n`);
    });

  const taskEnvCommand = program.command("task-env").description("Manage git worktree task environments");

  taskEnvCommand
    .command("start [task...]")
    .description("Create a task-scoped worktree with artifact directories")
    .option("--base <ref>", "Base git ref for the worktree")
    .action(async (task: string[] | undefined, options: { base?: string }) => {
      const result = await runTaskEnvCommand({
        cwd: process.cwd(),
        mode: "start",
        task: task?.join(" "),
        baseRef: options.base,
      });
      printTaskEnvResult(result);
    });

  taskEnvCommand
    .command("attach <id>")
    .description("Load an existing task environment without creating a new worktree")
    .action(async (id: string) => {
      const result = await runTaskEnvCommand({ cwd: process.cwd(), mode: "attach", id });
      printTaskEnvResult(result);
    });

  taskEnvCommand
    .command("repair <id>")
    .description("Repair a stale task environment worktree")
    .action(async (id: string) => {
      const result = await runTaskEnvCommand({ cwd: process.cwd(), mode: "repair", id });
      printTaskEnvResult(result);
    });

  taskEnvCommand
    .command("finish <id>")
    .description("Remove a task environment worktree and mark it finished")
    .action(async (id: string) => {
      const result = await runTaskEnvCommand({ cwd: process.cwd(), mode: "finish", id });
      printTaskEnvResult(result);
    });

  taskEnvCommand
    .command("status")
    .description("List known task environments")
    .action(async () => {
      const result = await runTaskEnvCommand({ cwd: process.cwd(), mode: "status" });
      printTaskEnvResult(result);
    });

  program
    .command("doc-garden")
    .description("Scan governance and workflow docs for stale local references")
    .option("--status", "Read the latest doc garden report instead of rescanning", false)
    .action(async (options: { status?: boolean }) => {
      const result = await runDocGardenCommand({ cwd: process.cwd(), mode: options.status ? "status" : "scan" });
      printDocGardenResult(result);
    });

  const observeCommand = program.command("observe").description("Manage UI and observability artifact sessions");

  observeCommand
    .command("start [topic...]")
    .description("Create an observation session or attach one to a task environment")
    .option("--env <id>", "Attach to an existing task environment")
    .action(async (topic: string[] | undefined, options: { env?: string }) => {
      const result = await runObserveCommand({
        cwd: process.cwd(),
        mode: "start",
        topic: topic?.join(" "),
        envId: options.env,
      });
      printObserveResult(result);
    });

  observeCommand
    .command("report <id>")
    .description("Summarize captured UI, log, metric, and trace artifacts")
    .action(async (id: string) => {
      const result = await runObserveCommand({ cwd: process.cwd(), mode: "report", id });
      printObserveResult(result);
    });

  const workflowCommand = program.command("workflow").description("Run repo-level workflow guidance");

  const hermesCommand = program.command("hermes").description("Run explicit Hermes learning guidance");

  hermesCommand
    .command("query [topic...]")
    .description("Show local-memory-first Hermes query guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "query", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  hermesCommand
    .command("candidates [topic...]")
    .description("Show Hermes candidate review guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "candidates", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  hermesCommand
    .command("distill [topic...]")
    .description("Show Hermes distillation guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "distill", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  hermesCommand
    .command("draft-skill [topic...]")
    .description("Show Hermes local skill drafting guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "draft-skill", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  hermesCommand
    .command("draft-rule [topic...]")
    .description("Show Hermes local rule drafting guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "draft-rule", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  hermesCommand
    .command("verify [topic...]")
    .description("Show Hermes verification guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "verify", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  hermesCommand
    .command("promote [topic...]")
    .description("Show Hermes promotion guidance")
    .action(async (topic: string[] | undefined) => {
      const result = await runHermesCommand({ cwd: process.cwd(), kind: "promote", topic: topic?.join(" ") });
      printHermesResult(result);
    });

  workflowCommand
    .command("plan [task...]")
    .description("Show canonical planning workflow guidance")
    .option("--json", "Output workflow result as JSON", false)
    .action(async (task: string[] | undefined, options?: { json?: boolean }) => {
      const result = await runWorkflowCommand({ cwd: process.cwd(), kind: "plan", task: task?.join(" ") });
      if (options?.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      printWorkflowResult(result);
    });

  workflowCommand
    .command("review [task...]")
    .description("Show canonical review workflow guidance")
    .action(async (task: string[] | undefined) => {
      const result = await runWorkflowCommand({ cwd: process.cwd(), kind: "review", task: task?.join(" ") });
      printWorkflowResult(result);
    });

  workflowCommand
    .command("tdd [task...]")
    .description("Show canonical TDD workflow guidance")
    .action(async (task: string[] | undefined) => {
      const result = await runWorkflowCommand({ cwd: process.cwd(), kind: "tdd", task: task?.join(" ") });
      printWorkflowResult(result);
    });

  workflowCommand
    .command("security [task...]")
    .description("Show canonical security workflow guidance")
    .action(async (task: string[] | undefined) => {
      const result = await runWorkflowCommand({ cwd: process.cwd(), kind: "security", task: task?.join(" ") });
      printWorkflowResult(result);
    });

  program
    .command("loop-start")
    .description("Run a runtime-backed autonomous verification loop")
    .option("--id <name>", "Loop identifier")
    .option("--task-id <taskId>", "Bind the loop to a task session")
    .option("--env-id <envId>", "Bind the loop to a task environment")
    .option("--checks <names>", "Comma-separated checks: build,tests,typecheck,lint")
    .option("--max-iterations <count>", "Maximum loop iterations")
    .option("--poll-ms <count>", "Workspace change poll interval in milliseconds")
    .option("--idle-ms <count>", "How long to wait for changes before pausing")
    .action(async (options: {
      id?: string;
      taskId?: string;
      envId?: string;
      checks?: string;
      maxIterations?: string;
      pollMs?: string;
      idleMs?: string;
    }) => {
      const checks = options.checks
        ?.split(",")
        .map((value) => value.trim())
        .filter((value): value is "build" | "tests" | "typecheck" | "lint" =>
          value === "build" || value === "tests" || value === "typecheck" || value === "lint",
        );
      const result = await runLoopStartCommand({
        cwd: process.cwd(),
        id: options.id,
        taskId: options.taskId,
        envId: options.envId,
        checks,
        maxIterations: options.maxIterations ? Number.parseInt(options.maxIterations, 10) : undefined,
        pollIntervalMs: options.pollMs ? Number.parseInt(options.pollMs, 10) : undefined,
        idleTimeoutMs: options.idleMs ? Number.parseInt(options.idleMs, 10) : undefined,
      });
      process.stdout.write(`Loop: ${result.id}\n`);
      if (result.taskId) {
        process.stdout.write(`Task: ${result.taskId}\n`);
      }
      if (result.taskEnvId) {
        process.stdout.write(`Task environment: ${result.taskEnvId}\n`);
      }
      process.stdout.write(`Status: ${result.status}\n`);
      process.stdout.write(`Iterations: ${result.iterations.length}\n`);
    });

  program
    .command("loop-status")
    .description("Show the latest runtime-backed loop status")
    .option("--id <name>", "Loop identifier")
    .action(async (options: { id?: string }) => {
      const result = await runLoopStatusCommand({ cwd: process.cwd(), id: options.id });
      process.stdout.write(`Loop: ${result.id}\n`);
      if (result.taskId) {
        process.stdout.write(`Task: ${result.taskId}\n`);
      }
      if (result.taskEnvId) {
        process.stdout.write(`Task environment: ${result.taskEnvId}\n`);
      }
      process.stdout.write(`Status: ${result.status}\n`);
      process.stdout.write(`Iterations: ${result.iterations.length}\n`);
      const latest = result.iterations.at(-1);
      if (latest) {
        process.stdout.write(`Latest iteration: ${latest.iteration}\n`);
        process.stdout.write(`Latest changes: ${latest.changedFiles.length}\n`);
      }
    });

  program
    .command("quality-gate")
    .description("Run runtime-backed quality checks")
    .action(async () => {
      const result = await runQualityGateCommand({ cwd: process.cwd() });

      process.stdout.write(`Quality gate: ${result.ok ? "PASS" : "FAIL"}\n`);
      for (const check of [
        result.checks.build,
        result.checks.typecheck,
        result.checks.tests,
        result.checks.lint,
        result.checks.security,
      ]) {
        process.stdout.write(`[${check.ok ? "PASS" : "FAIL"}] ${check.name} (${check.command})\n`);
      }

      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  program
    .command("checkpoint")
    .description("Save a runtime verification checkpoint")
    .option("--name <name>", "Checkpoint name")
    .action(async (options: { name?: string }) => {
      const result = await runCheckpointCommand({ cwd: process.cwd(), name: options.name });

      process.stdout.write(`Checkpoint: ${result.name}\n`);
      process.stdout.write(`Saved to: ${result.checkpointFile}\n`);

      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  program
    .command("verify")
    .description("Compare current verification status to a checkpoint")
    .option("--checkpoint <name>", "Checkpoint name")
    .action(async (options: { checkpoint?: string }) => {
      const result = await runVerifyCommand({ cwd: process.cwd(), checkpoint: options.checkpoint });

      process.stdout.write(`Verify: ${result.ok ? "PASS" : "FAIL"}\n`);
      process.stdout.write(`Checkpoint: ${result.checkpointName}\n`);
      process.stdout.write(`Changed files: ${result.changedFiles.length}\n`);
      if (result.taskVerification) {
        process.stdout.write(`Task: ${result.taskVerification.taskId}\n`);
        process.stdout.write(`Task verification: ${result.taskVerification.ok ? "PASS" : "FAIL"}\n`);
        process.stdout.write(`Task status: ${result.taskVerification.status}\n`);
        process.stdout.write(`Task step: ${result.taskVerification.currentStep ?? "none"}\n`);
        process.stdout.write(`Observation readiness: ${result.taskVerification.observationReadiness}\n`);
        process.stdout.write(`Observations: ${result.taskVerification.observations.length}\n`);
        if (result.taskVerification.reviewersRecommended.length > 0) {
          process.stdout.write(`Recommended reviewers: ${result.taskVerification.reviewersRecommended.join(", ")}\n`);
        }
        if (result.taskVerification.languageReviewHint) {
          process.stdout.write(`Language review hint: ${result.taskVerification.languageReviewHint}\n`);
        }
        if (result.taskVerification.guideReferences.length > 0) {
          process.stdout.write(`Guide references: ${result.taskVerification.guideReferences.join(", ")}\n`);
        }
        if (result.taskVerification.reviewGate.level !== "none") {
          process.stdout.write(`Review gate: ${result.taskVerification.reviewGate.level}\n`);
          process.stdout.write(`Review gate reason: ${result.taskVerification.reviewGate.reason}\n`);
          if (result.taskVerification.reviewGate.reviewPack.length > 0) {
            process.stdout.write(`Review pack: ${result.taskVerification.reviewGate.reviewPack.join(", ")}\n`);
          }
          if (result.taskVerification.reviewGate.stopConditions.length > 0) {
            process.stdout.write(`Stop conditions: ${result.taskVerification.reviewGate.stopConditions.join(", ")}\n`);
          }
        }
        if (result.taskVerification.lastReviewResult) {
          process.stdout.write(
            `Last review result: ${result.taskVerification.lastReviewResult.reviewer} (${result.taskVerification.lastReviewResult.status})\n`,
          );
          process.stdout.write(`Last review summary: ${result.taskVerification.lastReviewResult.summary}\n`);
        }
        if (result.taskVerification.reasons.length > 0) {
          process.stdout.write(`Task verification reasons: ${result.taskVerification.reasons.join(", ")}\n`);
        }
        if (result.taskVerification.missingEvidence.length > 0) {
          process.stdout.write(`Missing evidence: ${result.taskVerification.missingEvidence.join(", ")}\n`);
        }
      }

      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  program
    .command("review-record <taskId>")
    .description("Record a reviewer gate result for a task session")
    .requiredOption("--reviewer <name>", "Reviewer agent name")
    .requiredOption("--status <status>", "Review result: passed or failed")
    .requiredOption("--summary <text>", "Short review summary")
    .option("--finding <text...>", "Optional review findings")
    .action(async (taskId: string, options: {
      reviewer: string;
      status: "passed" | "failed";
      summary: string;
      finding?: string[];
    }) => {
      const result = await runReviewRecordCommand({
        cwd: process.cwd(),
        taskId,
        reviewer: options.reviewer,
        status: options.status,
        summary: options.summary,
        findings: options.finding,
      });
      process.stdout.write(`Review record: ${result.session.taskId}\n`);
      process.stdout.write(`Reviewer: ${result.session.lastReviewResult?.reviewer ?? "none"}\n`);
      process.stdout.write(`Review status: ${result.session.lastReviewResult?.status ?? "none"}\n`);
    });

  program
    .command("sessions")
    .description("Summarize runtime session history")
    .action(async () => {
      const result = await runSessionsCommand({ cwd: process.cwd() });

      process.stdout.write(`Sessions: ${result.totalSessions}\n`);
      process.stdout.write(`Latest: ${result.latest?.id ?? "none"}\n`);
      if (result.previous?.id) {
        process.stdout.write(`Previous: ${result.previous.id}\n`);
      }
    });

  const evalCommand = program.command("eval").description("Seed and run deterministic offline eval experiments");

  evalCommand
    .command("seed")
    .description("Seed starter eval dataset, experiment, and fixture workspace")
    .action(async () => {
      const result = await runEvalCommand({ cwd: process.cwd(), mode: "seed" });
      if (result.mode !== "seed") {
        throw new Error("Unexpected eval mode response.");
      }

      process.stdout.write(`Dataset: ${result.datasetFile}\n`);
      process.stdout.write(`Experiment: ${result.experimentFile}\n`);
      process.stdout.write(`Taskflow dataset: ${result.taskflowDatasetFile}\n`);
      process.stdout.write(`Taskflow experiment: ${result.taskflowExperimentFile}\n`);
      process.stdout.write(`Recovery taskflow dataset: ${result.recoveryTaskflowDatasetFile}\n`);
      process.stdout.write(`Recovery taskflow experiment: ${result.recoveryTaskflowExperimentFile}\n`);
      process.stdout.write(`Autonomy taskflow dataset: ${result.autonomyTaskflowDatasetFile}\n`);
      process.stdout.write(`Autonomy taskflow experiment: ${result.autonomyTaskflowExperimentFile}\n`);
      process.stdout.write(`Hermes strategy suite: ${result.hermesStrategySuiteFile}\n`);
      process.stdout.write(`Suite: ${result.suiteFile}\n`);
      process.stdout.write(`Fixture: ${result.fixtureDirectory}\n`);
    });

  evalCommand
    .command("run")
    .description("Run a seeded dataset or experiment and print a report summary")
    .option("--dataset <path>", "Dataset JSON path")
    .option("--experiment <path>", "Experiment JSON path")
    .action(async (options: { dataset?: string; experiment?: string }) => {
      const result = await runEvalCommand({
        cwd: process.cwd(),
        mode: "run",
        dataset: options.dataset,
        experiment: options.experiment,
      });
      if (result.mode !== "run") {
        throw new Error("Unexpected eval mode response.");
      }

      process.stdout.write(`Experiment: ${result.report.experimentName}\n`);
      process.stdout.write(`Dataset: ${result.report.datasetName}\n`);
      process.stdout.write(`Passed: ${result.report.passed}\n`);
      process.stdout.write(`Failed: ${result.report.failed}\n`);
      if (result.report.reportFile) {
        process.stdout.write(`Report: ${result.report.reportFile}\n`);
      }

      if (result.report.failed > 0) {
        process.exitCode = 1;
      }
    });

  evalCommand
    .command("suite")
    .description("Run a suite of eval experiments and print aggregate metrics")
    .option("--file <path>", "Suite JSON path")
    .action(async (options: { file?: string }) => {
      const result = await runEvalCommand({
        cwd: process.cwd(),
        mode: "suite",
        suite: options.file,
      });
      if (result.mode !== "suite") {
        throw new Error("Unexpected eval mode response.");
      }

      process.stdout.write(`Suite: ${result.report.suiteName}\n`);
      process.stdout.write(`Passed: ${result.report.passed}\n`);
      process.stdout.write(`Failed: ${result.report.failed}\n`);
      process.stdout.write(`Pass rate: ${result.report.metrics.passRate}\n`);
      process.stdout.write(`Task completion rate: ${result.report.metrics.taskCompletionRate}\n`);
      if (result.report.reportFile) {
        process.stdout.write(`Report: ${result.report.reportFile}\n`);
      }

      if (result.report.failed > 0) {
        process.exitCode = 1;
      }
    });

  evalCommand
    .command("compare")
    .description("Compare two eval reports and print metric deltas")
    .option("--base <path>", "Base report JSON path")
    .option("--head <path>", "Head report JSON path")
    .action(async (options: { base?: string; head?: string }) => {
      const result = await runEvalCommand({
        cwd: process.cwd(),
        mode: "compare",
        base: options.base,
        head: options.head,
      });
      if (result.mode !== "compare") {
        throw new Error("Unexpected eval mode response.");
      }

      process.stdout.write(`Base: ${result.comparison.baseName}\n`);
      process.stdout.write(`Head: ${result.comparison.headName}\n`);
      for (const [key, value] of Object.entries(result.comparison.metricDiffs)) {
        process.stdout.write(`- ${key}: ${value}\n`);
      }
      process.stdout.write(
        `Regressions: ${result.comparison.regressions.length > 0 ? result.comparison.regressions.join("; ") : "none"}\n`,
      );

      if (result.comparison.regressions.length > 0) {
        process.exitCode = 1;
      }
    });

  evalCommand
    .command("history")
    .description("Show recent eval history and metric trends")
    .option("--limit <count>", "Number of recent history entries to print", "5")
    .action(async (options: { limit?: string }) => {
      const result = await runEvalCommand({
        cwd: process.cwd(),
        mode: "history",
        limit: options.limit ? Number.parseInt(options.limit, 10) : 5,
      });
      if (result.mode !== "history") {
        throw new Error("Unexpected eval mode response.");
      }

      process.stdout.write(`History entries: ${result.history.totalEntries}\n`);
      if (result.history.latest) {
        process.stdout.write(`Latest: ${result.history.latest.name} (${result.history.latest.kind})\n`);
      }
      if (result.history.previous) {
        process.stdout.write(`Previous: ${result.history.previous.name} (${result.history.previous.kind})\n`);
      }
      const trendKeys = Object.keys(result.history.trend.metricDiffs);
      if (trendKeys.length > 0) {
        process.stdout.write("Trend:\n");
        for (const key of trendKeys) {
          process.stdout.write(`- ${key}: ${result.history.trend.metricDiffs[key]}\n`);
        }
      }
      if (result.history.trend.regressions.length > 0) {
        process.stdout.write("Regressions:\n");
        for (const regression of result.history.trend.regressions) {
          process.stdout.write(`- ${regression}\n`);
        }
      }
      if (result.history.trend.improvements.length > 0) {
        process.stdout.write("Improvements:\n");
        for (const improvement of result.history.trend.improvements) {
          process.stdout.write(`- ${improvement}\n`);
        }
      }
    });

  evalCommand
    .command("benchmark")
    .description("Summarize eval history into a benchmark report")
    .option("--limit <count>", "Number of recent history entries to summarize", "10")
    .option("--file <path>", "Optional output path for the benchmark JSON report")
    .action(async (options: { limit?: string; file?: string }) => {
      const result = await runEvalCommand({
        cwd: process.cwd(),
        mode: "benchmark",
        limit: options.limit ? Number.parseInt(options.limit, 10) : 10,
        reportFile: options.file,
      });
      if (result.mode !== "benchmark") {
        throw new Error("Unexpected eval mode response.");
      }

      process.stdout.write(`Benchmark latest: ${result.report.latest ?? "none"}\n`);
      process.stdout.write(`Benchmark previous: ${result.report.previous ?? "none"}\n`);
      process.stdout.write(`History window: ${result.report.entries.length}/${result.report.totalEntries}\n`);
      for (const [key, value] of Object.entries(result.report.metrics)) {
        process.stdout.write(`- ${key}: latest=${value.latest} avg=${value.average} best=${value.best} worst=${value.worst}\n`);
      }
      process.stdout.write("Recovery plan coverage:\n");
      process.stdout.write(`- collect-evidence: ${result.report.recoveryPlanCoverage.collectEvidenceRate ?? "n/a"}\n`);
      process.stdout.write(`- retry-implement: ${result.report.recoveryPlanCoverage.retryImplementRate ?? "n/a"}\n`);
      process.stdout.write(`- manual-review: ${result.report.recoveryPlanCoverage.manualReviewRate ?? "n/a"}\n`);
      process.stdout.write(`- auto-recovery-action: ${result.report.recoveryPlanCoverage.autoRecoveryActionRate ?? "n/a"}\n`);
      process.stdout.write(`- autonomy-guardrail: ${result.report.recoveryPlanCoverage.autonomyGuardrailRate ?? "n/a"}\n`);
      process.stdout.write(`- budget-escalation: ${result.report.recoveryPlanCoverage.budgetEscalationRate ?? "n/a"}\n`);
      process.stdout.write(`- manual-handoff: ${result.report.recoveryPlanCoverage.manualHandoffRate ?? "n/a"}\n`);
      if (result.report.hermesStrategyComparison.control && result.report.hermesStrategyComparison.treatment) {
        process.stdout.write("Hermes strategy comparison:\n");
        process.stdout.write(`- control: ${result.report.hermesStrategyComparison.control}\n`);
        process.stdout.write(`- treatment: ${result.report.hermesStrategyComparison.treatment}\n`);
        for (const [key, value] of Object.entries(result.report.hermesStrategyComparison.metricDiffs)) {
          process.stdout.write(`  - ${key}: ${value}\n`);
        }
      }
    });

  program
    .command("harness-audit")
    .description("Summarize harness runtime and policy coverage")
    .action(async () => {
      const result = await runHarnessAuditCommand({ cwd: process.cwd() });

      process.stdout.write(`Policy enabled: ${result.runtime.policyEnabled ? "yes" : "no"}\n`);
      process.stdout.write(`Policy file: ${result.runtime.policyFile}\n`);
      process.stdout.write(`Policy source: ${result.policy.source}\n`);
      process.stdout.write(`Audit state: ${result.policy.auditState}\n`);
      process.stdout.write(`Audit detail: ${result.policy.auditMessage}\n`);
      process.stdout.write(`Explicit commands: ${result.policy.explicitCommands.length}\n`);
      process.stdout.write(`Defaulted commands: ${result.policy.defaultedCommands.length}\n`);
      process.stdout.write(`Blocked commands: ${result.policy.blockedCommands.length}\n`);
      process.stdout.write(`Approval required commands: ${result.policy.approvalRequiredCommands.length}\n`);
      process.stdout.write(`Harness gaps: ${result.summary.gaps.length}\n`);
      for (const gap of result.summary.gaps) {
        process.stdout.write(`- ${gap}\n`);
      }
    });

  program
    .command("model-route [task...]")
    .description("Recommend a deterministic local model class")
    .option("--prefer <mode>", "Preference bias: cost, speed, or quality")
    .option("--list", "List available model classes", false)
    .action(async (task: string[] | undefined, options: { prefer?: "cost" | "speed" | "quality"; list?: boolean }) => {
      const result = await runModelRouteCommand({
        cwd: process.cwd(),
        task: task?.join(" "),
        prefer: options.prefer,
        list: options.list ?? false,
      });

      if (result.mode === "list") {
        for (const profile of result.profiles ?? []) {
          process.stdout.write(`${profile.modelClass}: ${profile.summary}\n`);
        }
        return;
      }

      process.stdout.write(`Task: ${result.task}\n`);
      process.stdout.write(`Recommended class: ${result.recommendation?.modelClass ?? "balanced"}\n`);
      process.stdout.write(`Reason: ${result.recommendation?.reason ?? "Default balanced recommendation."}\n`);
      process.stdout.write(
        `Telemetry: ${result.recommendation?.telemetryNote ?? "No local telemetry feedback available."}\n`,
      );
      if ((result.classification?.languages.length ?? 0) > 0) {
        process.stdout.write(`Languages: ${result.classification?.languages.join(", ")}\n`);
      }
      if ((result.recommendation?.reviewerAgents.length ?? 0) > 0) {
        process.stdout.write(`Reviewers: ${result.recommendation?.reviewerAgents.join(", ")}\n`);
      }
      if ((result.recommendation?.guideReferences.length ?? 0) > 0) {
        process.stdout.write("Guides:\n");
        for (const guide of result.recommendation?.guideReferences ?? []) {
          process.stdout.write(`- ${guide}\n`);
        }
      }
    });

  program
    .command("task-start [requirement...]")
    .description("Start a task from requirement text or file")
    .option("--file <path>", "Requirement file path")
    .option("--workflow <name>", "Workflow preset name")
    .option("--profile <name>", "Interview profile: quick, standard, deep")
    .option("--no-auto-wiki", "Disable automatic wiki write")
    .action(
      async (
        requirement: string[] | undefined,
        options: { file?: string; workflow?: string; profile?: "quick" | "standard" | "deep"; autoWiki?: boolean },
      ) => {
        const result = await runTaskStartCommand({
          cwd: process.cwd(),
          requirement: requirement?.join(" "),
          file: options.file,
          workflow: options.workflow,
          profile: options.profile,
          autoWiki: options.autoWiki,
        });

        process.stdout.write(`Task ID: ${result.taskId}\n`);
        process.stdout.write(`Workflow: ${result.workflow}\n`);
        process.stdout.write(`Spec: ${result.specPath}\n`);
        if (result.wikiPath) {
          process.stdout.write(`Wiki: ${result.wikiPath}\n`);
        }
      },
    );

  program
    .command("analyze")
    .description("Analyze all or selected repositories")
    .option("--repos <names>", "Comma-separated repos or all")
    .option("--repo <name>", "Single repo to analyze")
    .option("--refresh", "Force a full refresh of analysis artifacts", false)
    .option("--json", "Output analyze result as JSON", false)
    .action(async (options: { repos?: string; repo?: string; refresh?: boolean; json?: boolean }) => {
      const repos = options.repos?.split(",").map((value) => value.trim());
      const result = await runAnalyzeCommand({
        cwd: process.cwd(),
        repos: options.repo ? [options.repo] : repos,
        refresh: options.refresh,
      });
      if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`Run: ${result.runId}\n`);
      process.stdout.write(`Status: ${result.status}\n`);
      process.stdout.write(`Scope: ${result.scope}\n`);
      process.stdout.write(`Analyzed repos: ${result.analyzedRepos.join(", ")}\n`);
      process.stdout.write(`Technical architecture: ${result.technicalArchitecturePath}\n`);
      process.stdout.write(`Business architecture: ${result.businessArchitecturePath}\n`);
      process.stdout.write(`Dependency graph: ${result.dependencyGraphPath}\n`);
    });

  program
    .command("analyze-repo <repo>")
    .description("Analyze a single repository and update its architecture doc")
    .action(async (repo: string) => {
      const result = await runAnalyzeRepoCommand({ cwd: process.cwd(), repo });
      process.stdout.write(`Repo: ${result.repo}\n`);
      process.stdout.write(`Architecture doc: ${result.repoDocPath}\n`);
    });

  program
    .command("deliver")
    .description("Generate client-facing delivery report")
    .option("--task <id>", "Task identifier")
    .option("--spec <path>", "Confirmed spec path")
    .option("--no-include-svg", "Disable SVG diagram generation")
    .option("--hours <value>", "Override effort-hours total")
    .action(async (options: { task?: string; spec?: string; includeSvg?: boolean; hours?: string }) => {
      const hours = options.hours ? Number.parseFloat(options.hours) : undefined;
      const result = await runDeliverCommand({
        cwd: process.cwd(),
        task: options.task,
        spec: options.spec,
        includeSvg: options.includeSvg,
        hours,
      });
      process.stdout.write(`Task ID: ${result.taskId}\n`);
      process.stdout.write(`Delivery report: ${result.reportPath}\n`);
      process.stdout.write(`Diagrams: ${result.diagramPaths.length}\n`);
    });

  program
    .command("cross-audit")
    .description("Run independent second-pass cross audit")
    .option("--cross-model <model>", "Cross-audit model")
    .option("--primary-model <model>", "Primary audit model")
    .option("--scope <items>", "Comma-separated scope items")
    .option("--from <paths>", "Comma-separated source report paths")
    .action(async (options: { crossModel: string; primaryModel?: string; scope?: string; from?: string }) => {
      if (!options.crossModel || options.crossModel.trim().length === 0) {
        throw new Error("cross-audit requires --cross-model.");
      }
      const result = await runCrossAuditCommand({
        cwd: process.cwd(),
        primaryModel: options.primaryModel,
        crossModel: options.crossModel,
        scope: options.scope
          ?.split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
        from: options.from
          ?.split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      });

      process.stdout.write(`Cross-audit report: ${result.reportPath}\n`);
      process.stdout.write(`Cross-audit JSON: ${result.reportJsonPath}\n`);
      process.stdout.write(`Verdict: ${result.verdict}\n`);
      process.stdout.write(`Agreement rate: ${result.agreementRate}\n`);
      process.stdout.write(`Conflicts: ${result.conflicts}\n`);
      process.stdout.write(`Unresolved critical/high: ${result.unresolvedCriticalOrHigh}\n`);
    });

  return program;
};

export const runCli = async (): Promise<void> => {
  const program = buildProgram();
  await program.parseAsync(process.argv);
};

export const handleCliError = (error: unknown): void => {
  if (error instanceof BbgError) {
    process.stderr.write(`${chalk.red(`[${error.code}] ${error.message}`)}\n`);
    if (error.hint) {
      process.stderr.write(`${chalk.yellow(`Hint: ${error.hint}`)}\n`);
    }
  } else if (error instanceof Error) {
    process.stderr.write(`${chalk.red(error.message)}\n`);
  } else {
    process.stderr.write(`${chalk.red(`Unexpected error: ${String(error)}`)}\n`);
  }

  process.exitCode = mapCliErrorToExitCode(error);
};

import { realpathSync } from "node:fs";

const resolveArgv1 = (): string => {
  try {
    return realpathSync(process.argv[1]);
  } catch {
    return process.argv[1];
  }
};

const isEntrypoint = resolveArgv1() === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void runCli().catch(handleCliError);
}
