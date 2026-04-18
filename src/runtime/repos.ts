import { join } from "node:path";
import { writeJsonStore } from "./store.js";

export interface RepoRegistrationState {
  version: number;
  name: string;
  source: string;
  branch: string;
  registeredAt: string;
  analyzeStatus: "completed" | "pending" | "failed";
  workspaceFusionStatus: "completed" | "pending" | "failed";
}

export async function writeRepoRegistrationState(cwd: string, state: RepoRegistrationState): Promise<void> {
  await writeJsonStore(join(cwd, ".bbg", "repos", state.name, "registration.json"), state);
}
