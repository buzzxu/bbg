import { join } from "node:path";
import { analyzeRepo } from "../analyzers/index.js";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

export interface RunAnalyzeRepoCommandInput {
  cwd: string;
  repo: string;
}

export interface RunAnalyzeRepoCommandResult {
  repo: string;
  repoDocPath: string;
}

export async function runAnalyzeRepoCommand(input: RunAnalyzeRepoCommandInput): Promise<RunAnalyzeRepoCommandResult> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  const repoConfig = config.repos.find((repo) => repo.name === input.repo);
  if (!repoConfig) {
    throw new Error(`Repository not found in config: ${input.repo}`);
  }

  const analysis = await analyzeRepo(join(input.cwd, repoConfig.name));
  const repoDocPath = `docs/architecture/repos/${repoConfig.name}.md`;
  const content = [
    `# ${repoConfig.name} Architecture`,
    "",
    `Updated at: ${new Date().toISOString()}`,
    "",
    "## Repo Metadata",
    "",
    `- Type: ${repoConfig.type}`,
    `- Branch: ${repoConfig.branch}`,
    `- Description: ${repoConfig.description || "(not provided)"}`,
    "",
    "## Technical Summary",
    "",
    `- Stack: ${analysis.stack.language} / ${analysis.stack.framework}`,
    `- Build Tool: ${analysis.stack.buildTool}`,
    `- Test Framework: ${analysis.testing.framework}`,
    "",
    "## Structure",
    "",
    ...(analysis.structure.length > 0 ? analysis.structure.map((item) => `- ${item}`) : ["- (none)"]),
    "",
    "## Dependencies",
    "",
    ...(analysis.deps.length > 0 ? analysis.deps.map((item) => `- ${item}`) : ["- (none)"]),
    "",
  ].join("\n");

  await writeTextFile(join(input.cwd, repoDocPath), content);

  return {
    repo: repoConfig.name,
    repoDocPath,
  };
}
