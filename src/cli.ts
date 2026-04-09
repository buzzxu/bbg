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
import { runEvalCommand } from "./commands/eval.js";
import { runHarnessAuditCommand } from "./commands/harness-audit.js";
import { runModelRouteCommand } from "./commands/model-route.js";
import { runTaskStartCommand } from "./commands/task-start.js";
import { runAnalyzeCommand } from "./commands/analyze.js";
import { runAnalyzeRepoCommand } from "./commands/analyze-repo.js";
import { runDeliverCommand } from "./commands/deliver.js";
import { runCrossAuditCommand } from "./commands/cross-audit.js";
import { ConfigParseError, ConfigValidationError } from "./config/read-write.js";
import { BbgConfigError, BbgError, BbgGitError, BbgTemplateError } from "./utils/errors.js";

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
    .action(async (options: { url?: string; branch?: string }) => {
      const result = await runAddRepo({
        cwd: process.cwd(),
        url: options.url,
        branch: options.branch,
      });

      process.stdout.write(`Added repository: ${result.addedRepoName}\n`);
    });

  program
    .command("doctor")
    .description("Validate governance and workspace health")
    .option("--json", "Output as JSON", false)
    .option("--fix", "Apply safe auto-fixes", false)
    .option("--governance-only", "Skip repo directory checks", false)
    .option("--workspace", "Include workspace checks", false)
    .option("--self", "Validate bbg's own governance content integrity", false)
    .action(
      async (options: {
        json?: boolean;
        fix?: boolean;
        governanceOnly?: boolean;
        workspace?: boolean;
        self?: boolean;
      }) => {
        const report = await runDoctor({
          cwd: process.cwd(),
          json: options.json ?? false,
          fix: options.fix ?? false,
          governanceOnly: options.governanceOnly ?? false,
          workspace: options.workspace ?? false,
          self: options.self ?? false,
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

      if (!result.ok) {
        process.exitCode = 1;
      }
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
    .action(async (options: { repos?: string }) => {
      const repos = options.repos?.split(",").map((value) => value.trim());
      const result = await runAnalyzeCommand({ cwd: process.cwd(), repos });
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
