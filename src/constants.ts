import packageMetadata from "../package.json" with { type: "json" };
import type { RepoType, StackInfo } from "./config/schema.js";

export const CLI_NAME = "bbg";
export const MIN_NODE_MAJOR = 18;
export const CLI_VERSION = packageMetadata.version;

export const REPO_TYPE_CHOICES: ReadonlyArray<{ name: RepoType; value: RepoType }> = [
  { name: "backend", value: "backend" },
  { name: "frontend-pc", value: "frontend-pc" },
  { name: "frontend-h5", value: "frontend-h5" },
  { name: "frontend-web", value: "frontend-web" },
  { name: "other", value: "other" },
] as const;

export const DEFAULT_STACK: Readonly<StackInfo> = {
  language: "unknown",
  framework: "unknown",
  buildTool: "unknown",
  testFramework: "unknown",
  packageManager: "unknown",
};

export const MANAGED_GITIGNORE_BLOCK_START = "# >>> bbg managed repos >>>";
export const MANAGED_GITIGNORE_BLOCK_END = "# <<< bbg managed repos <<<";

/** Entries that bbg always adds to project .gitignore. */
export const BBG_GITIGNORE_ENTRIES = [
  ".bbg/telemetry.db",
  ".bbg/telemetry.db-wal",
  ".bbg/telemetry.db-shm",
] as const;
