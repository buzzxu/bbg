#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { fileURLToPath } from "node:url";
import { CLI_NAME, CLI_VERSION } from "./constants.js";
import { runAddRepo } from "./commands/add-repo.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runRelease } from "./commands/release.js";
import { runSync } from "./commands/sync.js";
import { runUpgrade } from "./commands/upgrade.js";
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
    .action(async (options: { json?: boolean; fix?: boolean; governanceOnly?: boolean; workspace?: boolean }) => {
      const report = await runDoctor({
        cwd: process.cwd(),
        json: options.json ?? false,
        fix: options.fix ?? false,
        governanceOnly: options.governanceOnly ?? false,
        workspace: options.workspace ?? false,
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
    });

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
    .action(async (options: { skipDoctor?: boolean; skipSync?: boolean }) => {
      const result = await runRelease({
        cwd: process.cwd(),
        skipDoctor: options.skipDoctor ?? false,
        skipSync: options.skipSync ?? false,
      });

      process.stdout.write(`Release version: ${result.version}\n`);
      process.stdout.write(`Checklist confirmed: ${result.checklistConfirmed ? "yes" : "no"}\n`);
      process.stdout.write(`Release record: ${result.releaseFile}\n`);
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
