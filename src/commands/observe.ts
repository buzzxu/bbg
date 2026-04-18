import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile } from "../utils/fs.js";
import { startObserveSession, summarizeObserveSession, type ObserveSession } from "../runtime/observe.js";

export interface RunObserveCommandInput {
  cwd: string;
  mode: "start" | "report";
  topic?: string;
  id?: string;
  envId?: string;
}

export interface RunObserveCommandResult {
  mode: "start" | "report";
  session?: ObserveSession;
  report?: Awaited<ReturnType<typeof summarizeObserveSession>>;
}

async function assertInitialized(cwd: string): Promise<void> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  parseConfig(await readTextFile(configPath));
}

export async function runObserveCommand(input: RunObserveCommandInput): Promise<RunObserveCommandResult> {
  await assertInitialized(input.cwd);

  if (input.mode === "start") {
    if (!input.topic || input.topic.trim().length === 0) {
      throw new Error("observe start requires topic text.");
    }
    return {
      mode: "start",
      session: await startObserveSession({ cwd: input.cwd, topic: input.topic, envId: input.envId }),
    };
  }

  if (!input.id || input.id.trim().length === 0) {
    throw new Error("observe report requires a session id.");
  }

  return {
    mode: "report",
    report: await summarizeObserveSession(input.cwd, input.id),
  };
}
