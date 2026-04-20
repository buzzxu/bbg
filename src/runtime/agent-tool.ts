const CODEX_ENV_KEYS = [
  "CODEX_THREAD_ID",
  "CODEX_CI",
  "CODEX_MANAGED_BY_NPM",
  "CODEX_SANDBOX",
  "CODEX_SANDBOX_NETWORK_DISABLED",
] as const;

function normalizeToolName(value: string): string {
  return value.trim().toLowerCase();
}

export function detectCurrentAgentToolFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const explicitTool = env.BBG_CURRENT_TOOL?.trim();
  if (explicitTool) {
    return normalizeToolName(explicitTool);
  }

  if (CODEX_ENV_KEYS.some((key) => env[key]?.trim())) {
    return "codex";
  }

  return null;
}
