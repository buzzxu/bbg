import { join } from "node:path";
import { analyzeRepo } from "../analyzers/index.js";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export interface RunAnalyzeCommandInput {
  cwd: string;
  repos?: string[];
}

export interface RunAnalyzeCommandResult {
  analyzedRepos: string[];
  technicalArchitecturePath: string;
  businessArchitecturePath: string;
  dependencyGraphPath: string;
  repoDocs: string[];
}

function normalizeRepoSelection(all: string[], requested?: string[]): string[] {
  if (!requested || requested.length === 0 || requested.includes("all")) {
    return all;
  }
  const requestedSet = new Set(requested.map((value) => value.trim()).filter((value) => value.length > 0));
  return all.filter((repo) => requestedSet.has(repo));
}

function toBulletList(values: string[]): string {
  if (values.length === 0) {
    return "- (none)";
  }
  return values.map((value) => `- ${value}`).join("\n");
}

export async function runAnalyzeCommand(input: RunAnalyzeCommandInput): Promise<RunAnalyzeCommandResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const selectedRepos = normalizeRepoSelection(
    config.repos.map((repo) => repo.name),
    input.repos,
  );

  const analyses = await Promise.all(
    selectedRepos.map(async (repoName) => {
      const repoConfig = config.repos.find((repo) => repo.name === repoName);
      if (!repoConfig) {
        throw new Error(`Repository not found in config: ${repoName}`);
      }
      const result = await analyzeRepo(join(input.cwd, repoName));
      return { repoConfig, result };
    }),
  );

  const technicalArchitecturePath = "docs/architecture/technical-architecture.md";
  const businessArchitecturePath = "docs/architecture/business-architecture.md";
  const dependencyGraphPath = "docs/architecture/repo-dependency-graph.md";
  const repoDocs: string[] = [];

  const technicalContent = [
    "# Technical Architecture",
    "",
    `Updated at: ${new Date().toISOString()}`,
    "",
    "## Repositories",
    "",
    ...analyses.map(({ repoConfig, result }) =>
      [
        `### ${repoConfig.name}`,
        "",
        `- Type: ${repoConfig.type}`,
        `- Stack: ${result.stack.language} / ${result.stack.framework}`,
        `- Build: ${result.stack.buildTool}`,
        `- Test: ${result.testing.framework}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const businessContent = [
    "# Business Architecture",
    "",
    `Updated at: ${new Date().toISOString()}`,
    "",
    "## Module Responsibilities",
    "",
    ...analyses.map(({ repoConfig }) =>
      [
        `### ${repoConfig.name}`,
        "",
        `- Description: ${repoConfig.description || "(not provided)"}`,
        `- Ownership hint: ${repoConfig.type}`,
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const dependencyLines = analyses.flatMap(({ repoConfig, result }) =>
    result.deps.map((dep) => `- ${repoConfig.name} -> ${dep}`),
  );
  const dependencyContent = [
    "# Repo Dependency Graph",
    "",
    `Updated at: ${new Date().toISOString()}`,
    "",
    "## Dependencies",
    "",
    toBulletList(dependencyLines),
    "",
  ].join("\n");

  await writeTextFile(join(input.cwd, technicalArchitecturePath), technicalContent);
  await writeTextFile(join(input.cwd, businessArchitecturePath), businessContent);
  await writeTextFile(join(input.cwd, dependencyGraphPath), dependencyContent);

  for (const { repoConfig, result } of analyses) {
    const repoDocPath = `docs/architecture/repos/${repoConfig.name}.md`;
    const repoContent = [
      `# ${repoConfig.name} Architecture`,
      "",
      `Updated at: ${new Date().toISOString()}`,
      "",
      "## Technical Summary",
      "",
      `- Stack: ${result.stack.language} / ${result.stack.framework}`,
      `- Build: ${result.stack.buildTool}`,
      `- Testing: ${result.testing.framework}`,
      "",
      "## Structure Markers",
      "",
      toBulletList(result.structure),
      "",
      "## Dependency Markers",
      "",
      toBulletList(result.deps),
      "",
    ].join("\n");
    await writeTextFile(join(input.cwd, repoDocPath), repoContent);
    repoDocs.push(repoDocPath);
  }

  const architectureIndexPath = "docs/architecture/index.md";
  const architectureIndex = [
    "# Architecture Index",
    "",
    "- [Technical Architecture](technical-architecture.md)",
    "- [Business Architecture](business-architecture.md)",
    "- [Repo Dependency Graph](repo-dependency-graph.md)",
    "",
    "## Repo Files",
    "",
    ...repoDocs.map(
      (docPath) => `- [${docPath.split("/").at(-1) ?? docPath}](repos/${docPath.split("/").at(-1) ?? ""})`,
    ),
    "",
  ].join("\n");
  await writeTextFile(join(input.cwd, architectureIndexPath), architectureIndex);

  return {
    analyzedRepos: analyses.map(({ repoConfig }) => repoConfig.name),
    technicalArchitecturePath,
    businessArchitecturePath,
    dependencyGraphPath,
    repoDocs,
  };
}
