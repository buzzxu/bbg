import { buildDefaultRuntimeConfig, type RuntimeAnalysisAiSetting, type RuntimeConfig } from "./schema.js";
import { detectCurrentAnalyzeAgentTool } from "./analyze-handoff.js";

export interface AnalyzeAiExecutionPlan {
  enabled: boolean;
  mode: "provider" | "handoff" | "heuristic-fallback" | "disabled";
  provider: string | null;
  modelClass: "fast" | "balanced" | "premium" | null;
  timeoutMs: number;
  currentTool: string | null;
  reason: string | null;
}

function resolveAnalysisAiSetting(runtime: RuntimeConfig | undefined): RuntimeAnalysisAiSetting {
  return (
    runtime?.analysisAi ??
    buildDefaultRuntimeConfig().analysisAi ?? {
      enabled: true,
      mode: "provider",
      provider: "local-synthesis",
      modelClass: "premium",
      timeoutMs: 45000,
    }
  );
}

export function planAnalyzeAiExecution(runtime: RuntimeConfig | undefined): AnalyzeAiExecutionPlan {
  const setting = resolveAnalysisAiSetting(runtime);
  const currentTool = detectCurrentAnalyzeAgentTool();
  if (!setting.enabled) {
    return {
      enabled: false,
      mode: "disabled",
      provider: null,
      modelClass: null,
      timeoutMs: setting.timeoutMs,
      currentTool,
      reason: "analysisAi disabled in runtime config",
    };
  }

  if (setting.mode === "handoff" && currentTool === null) {
    return {
      enabled: true,
      mode: "heuristic-fallback",
      provider: setting.provider ?? null,
      modelClass: setting.modelClass ?? "premium",
      timeoutMs: setting.timeoutMs,
      currentTool,
      reason: "handoff mode requested without an active AI tool; using heuristic fallback",
    };
  }

  return {
    enabled: true,
    mode: setting.mode,
    provider: setting.provider ?? (setting.mode === "provider" ? "local-synthesis" : currentTool),
    modelClass: setting.modelClass ?? "premium",
    timeoutMs: setting.timeoutMs,
    currentTool,
    reason: setting.mode === "provider" ? "provider execution planned" : `handoff execution planned for ${currentTool}`,
  };
}
