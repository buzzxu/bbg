import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { buildRepoMapDocument, getCanonicalRepoMapPath, readStoredRepoAnalyses } from "../context/repo-map.js";
import { buildTaskBundlesDocument } from "../context/task-bundles.js";
import { resolveRuntimePaths } from "../runtime/paths.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { summarizeSessions, type SessionsSummaryResult } from "../runtime/sessions.js";
import { writeJsonStore } from "../runtime/store.js";
import { exists, readTextFile } from "../utils/fs.js";

export interface RunSessionsCommandInput {
  cwd: string;
}

async function loadConfig(cwd: string) {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  return parseConfig(await readTextFile(configPath));
}

export async function runSessionsCommand(input: RunSessionsCommandInput): Promise<SessionsSummaryResult> {
  const config = await loadConfig(input.cwd);
  const runtime = config.runtime ?? buildDefaultRuntimeConfig();
  const result = await summarizeSessions(input.cwd, runtime);

  const storedAnalyses = await readStoredRepoAnalyses(
    input.cwd,
    config.repos.map((repo) => repo.name),
  );
  if (runtime.context.enabled) {
    const repoMap = buildRepoMapDocument(config, storedAnalyses, new Date().toISOString());
    const taskBundles = buildTaskBundlesDocument(repoMap, new Date().toISOString());
    const runtimePaths = resolveRuntimePaths(input.cwd, runtime);
    const canonicalRepoMapPath = getCanonicalRepoMapPath(input.cwd);

    await writeJsonStore(canonicalRepoMapPath, repoMap);
    if (runtimePaths.repoMap !== canonicalRepoMapPath) {
      await writeJsonStore(runtimePaths.repoMap, repoMap);
    }
    await writeJsonStore(join(input.cwd, ".bbg", "context", "task-bundles.json"), taskBundles);
  }

  return result;
}
