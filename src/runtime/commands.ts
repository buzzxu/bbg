import { join } from "node:path";
import type { RepoEntry } from "../config/schema.js";
import type { RuntimeCommandCheckName, RuntimeCommandConfigEntry, RuntimeCommandsSetting } from "./schema.js";

export interface ResolvedRuntimeCommand {
  command: string;
  args: string[];
  cwd: string;
  displayCommand: string;
}

function normalizeArgs(args?: string[]): string[] {
  return args?.filter((value) => value.trim().length > 0) ?? [];
}

function toDisplayCommand(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

function createCommand(command: string, args: string[], cwd: string): ResolvedRuntimeCommand {
  return {
    command,
    args,
    cwd,
    displayCommand: toDisplayCommand(command, args),
  };
}

function toConfiguredCommand(cwd: string, definition: RuntimeCommandConfigEntry): ResolvedRuntimeCommand {
  const args = normalizeArgs(definition.args);
  return createCommand(
    definition.command,
    args,
    definition.cwd === undefined || definition.cwd.trim().length === 0 ? cwd : join(cwd, definition.cwd),
  );
}

function deriveNodeCommand(repo: RepoEntry, checkName: RuntimeCommandCheckName, cwd: string): ResolvedRuntimeCommand {
  const packageManager = repo.stack.packageManager.toLowerCase();
  const executable = packageManager === "pnpm" || packageManager === "yarn" || packageManager === "bun"
    ? packageManager
    : "npm";

  if (checkName === "tests") {
    return createCommand(executable, ["test"], cwd);
  }

  return createCommand(executable, ["run", checkName], cwd);
}

function derivePythonCommand(repo: RepoEntry, checkName: RuntimeCommandCheckName, cwd: string): ResolvedRuntimeCommand {
  if (repo.stack.packageManager.toLowerCase() === "poetry") {
    const poetryArgs: Record<RuntimeCommandCheckName, string[]> = {
      build: ["build"],
      typecheck: ["run", "mypy", "."],
      tests: ["run", "pytest"],
      lint: ["run", "ruff", "check", "."],
    };
    return createCommand("poetry", poetryArgs[checkName], cwd);
  }

  const pythonArgs: Record<RuntimeCommandCheckName, string[]> = {
    build: ["-m", "build"],
    typecheck: ["-m", "mypy", "."],
    tests: ["-m", "pytest"],
    lint: ["-m", "ruff", "check", "."],
  };
  return createCommand("python", pythonArgs[checkName], cwd);
}

function deriveGoCommand(checkName: RuntimeCommandCheckName, cwd: string): ResolvedRuntimeCommand {
  const args: Record<RuntimeCommandCheckName, string[]> = {
    build: ["build", "./..."],
    typecheck: ["test", "./..."],
    tests: ["test", "./..."],
    lint: ["run"],
  };

  return checkName === "lint"
    ? createCommand("golangci-lint", args.lint, cwd)
    : createCommand("go", args[checkName], cwd);
}

function deriveRustCommand(checkName: RuntimeCommandCheckName, cwd: string): ResolvedRuntimeCommand {
  const args: Record<RuntimeCommandCheckName, string[]> = {
    build: ["build"],
    typecheck: ["check"],
    tests: ["test"],
    lint: ["clippy"],
  };
  return createCommand("cargo", args[checkName], cwd);
}

function deriveJavaLikeCommand(repo: RepoEntry, checkName: RuntimeCommandCheckName, cwd: string): ResolvedRuntimeCommand {
  if (repo.stack.buildTool.toLowerCase() === "gradle") {
    const args: Record<RuntimeCommandCheckName, string[]> = {
      build: ["build"],
      typecheck: ["classes"],
      tests: ["test"],
      lint: ["checkstyleMain"],
    };
    return createCommand("./gradlew", args[checkName], cwd);
  }

  const args: Record<RuntimeCommandCheckName, string[]> = {
    build: ["compile"],
    typecheck: ["test-compile"],
    tests: ["test"],
    lint: ["checkstyle:check"],
  };
  return createCommand("mvn", args[checkName], cwd);
}

function deriveCommandForRepo(repo: RepoEntry, checkName: RuntimeCommandCheckName, rootCwd: string): ResolvedRuntimeCommand {
  const repoCwd = join(rootCwd, repo.name);
  const language = repo.stack.language.toLowerCase();

  if (language === "python") {
    return derivePythonCommand(repo, checkName, repoCwd);
  }
  if (language === "go") {
    return deriveGoCommand(checkName, repoCwd);
  }
  if (language === "rust") {
    return deriveRustCommand(checkName, repoCwd);
  }
  if (language === "java" || language === "kotlin") {
    return deriveJavaLikeCommand(repo, checkName, repoCwd);
  }

  return deriveNodeCommand(repo, checkName, repoCwd);
}

export function resolveRuntimeCommands(
  cwd: string,
  repos: RepoEntry[],
  configuredCommands: RuntimeCommandsSetting | undefined,
  checkName: RuntimeCommandCheckName,
): ResolvedRuntimeCommand[] {
  const configuredCommand = configuredCommands?.[checkName];
  if (configuredCommand !== undefined) {
    return [toConfiguredCommand(cwd, configuredCommand)];
  }

  if (repos.length === 0) {
    return [createCommand("npm", checkName === "tests" ? ["test"] : ["run", checkName], cwd)];
  }

  return repos.map((repo) => deriveCommandForRepo(repo, checkName, cwd));
}
