import { buildDefaultRuntimeConfig, type RuntimeAnalysisAiSetting, type RuntimeConfig } from "./schema.js";
import { detectCurrentAnalyzeAgentTool } from "./analyze-handoff.js";

export interface AnalyzeAiExecutionPlan {
  enabled: boolean;
  mode: "provider" | "handoff" | "disabled";
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
      mode: "handoff",
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

  return {
    enabled: true,
    mode: setting.mode,
    provider: setting.provider ?? (setting.mode === "handoff" ? currentTool : null),
    modelClass: setting.modelClass ?? "premium",
    timeoutMs: setting.timeoutMs,
    currentTool,
    reason:
      setting.mode === "provider"
        ? "external provider execution planned; response.json is required"
        : currentTool
          ? `handoff execution planned for ${currentTool}; response.json is required`
          : "handoff execution planned; open an AI agent to produce response.json",
  };
}
