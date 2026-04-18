export interface RuntimeFileSetting {
  enabled: boolean;
  file: string;
}

export interface RuntimeContextSetting {
  enabled: boolean;
  repoMapFile: string;
  sessionHistoryFile: string;
}

export type RuntimeCommandCheckName = "build" | "typecheck" | "tests" | "lint";

export interface RuntimeCommandConfigEntry {
  command: string;
  args?: string[];
  cwd?: string;
}

export interface RuntimeCommandsSetting {
  build?: RuntimeCommandConfigEntry;
  typecheck?: RuntimeCommandConfigEntry;
  tests?: RuntimeCommandConfigEntry;
  lint?: RuntimeCommandConfigEntry;
}

export interface RuntimeAutonomySetting {
  maxAttempts: number;
  maxVerifyFailures: number;
  maxDurationMs: number;
}

export interface RuntimeConfig {
  telemetry: RuntimeFileSetting;
  evaluation: RuntimeFileSetting;
  policy: RuntimeFileSetting;
  context: RuntimeContextSetting;
  commands?: RuntimeCommandsSetting;
  autonomy: RuntimeAutonomySetting;
}

export interface SessionHistoryDocument {
  version: number;
  sessions: Array<Record<string, unknown>>;
}

export interface RepoMapDocument {
  version: number;
  repos: Array<Record<string, unknown>>;
}

export function buildDefaultRuntimeConfig(): RuntimeConfig {
  return {
    telemetry: {
      enabled: false,
      file: ".bbg/telemetry/events.json",
    },
    evaluation: {
      enabled: true,
      file: ".bbg/evaluations/history.json",
    },
    policy: {
      enabled: true,
      file: ".bbg/policy/decisions.json",
    },
    context: {
      enabled: true,
      repoMapFile: ".bbg/context/repo-map.json",
      sessionHistoryFile: ".bbg/sessions/history.json",
    },
    autonomy: {
      maxAttempts: 5,
      maxVerifyFailures: 3,
      maxDurationMs: 3600000,
    },
  };
}

export function createDefaultSessionHistory(): SessionHistoryDocument {
  return {
    version: 1,
    sessions: [],
  };
}

export function createDefaultRepoMap(): RepoMapDocument {
  return {
    version: 1,
    repos: [],
  };
}
