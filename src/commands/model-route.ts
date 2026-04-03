import { join } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { buildDefaultRuntimeConfig } from "../runtime/schema.js";
import { appendTelemetryEvent, readTelemetryDocument } from "../runtime/telemetry.js";
import { exists, readTextFile } from "../utils/fs.js";

export type ModelClass = "fast" | "balanced" | "premium";
export type ModelRoutePreference = "cost" | "speed" | "quality";
type ModelRouteDomain = "docs" | "debugging" | "implementation" | "planning" | "review" | "security" | "architecture";
type ModelRouteComplexity = "simple" | "moderate" | "complex";
type ModelRouteContext = "small" | "medium" | "large";

const MODEL_CLASSES: Array<{ modelClass: ModelClass; summary: string }> = [
  { modelClass: "fast", summary: "Best for docs, formatting, and low-risk single-file tasks." },
  { modelClass: "balanced", summary: "Default for multi-file implementation, review, and debugging work." },
  { modelClass: "premium", summary: "Reserve for security, architecture, or high-precision investigations." },
];

const TARGET_COMMANDS = ["quality-gate", "checkpoint", "verify", "sessions", "eval", "harness-audit", "model-route", "doctor", "sync"];

export interface ModelRouteCommandResult {
  mode: "recommendation" | "list";
  profiles?: Array<{ modelClass: ModelClass; summary: string }>;
  task?: string;
  classification?: {
    domain: ModelRouteDomain;
    complexity: ModelRouteComplexity;
    context: ModelRouteContext;
    targetCommand: string | null;
  };
  recommendation?: {
    modelClass: ModelClass;
    reason: string;
    telemetryNote: string;
  };
}

async function loadRuntimeConfig(cwd: string) {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    throw new Error(".bbg/config.json not found. Run `bbg init` first.");
  }

  const config = parseConfig(await readTextFile(configPath));
  return config.runtime ?? buildDefaultRuntimeConfig();
}

function normalizeTask(task: string): string {
  return task.trim().toLowerCase();
}

function classifyDomain(task: string): ModelRouteDomain {
  if (/(security|auth|jwt|secret|policy|permission|vuln|token)/.test(task)) {
    return "security";
  }
  if (/(architect|design|system|migration|platform)/.test(task)) {
    return "architecture";
  }
  if (/(debug|fix|error|failing|regression|type)/.test(task)) {
    return "debugging";
  }
  if (/(review|audit)/.test(task)) {
    return "review";
  }
  if (/(plan|spec|design doc)/.test(task)) {
    return "planning";
  }
  if (/(readme|docs|documentation|comment|typo|copy|format)/.test(task)) {
    return "docs";
  }
  return "implementation";
}

function classifyComplexity(task: string): ModelRouteComplexity {
  if (/(cross[- ]repo|architecture|migration|platform|multi[- ]step|whole codebase)/.test(task) || task.length > 180) {
    return "complex";
  }
  if (/(single-file|typo|readme|format|small)/.test(task) || task.length < 60) {
    return "simple";
  }
  return "moderate";
}

function classifyContext(task: string): ModelRouteContext {
  if (/(whole codebase|all repos|cross[- ]repo|workspace)/.test(task)) {
    return "large";
  }
  if (/(single-file|one file|one function|small)/.test(task)) {
    return "small";
  }
  return "medium";
}

function normalizeCommandHint(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectTargetCommand(task: string): string | null {
  const normalizedTask = normalizeCommandHint(task);
  return TARGET_COMMANDS.find((command) => {
    const normalizedCommand = normalizeCommandHint(command);
    return task.includes(command) || normalizedTask.includes(normalizedCommand);
  }) ?? null;
}

function bumpClass(current: ModelClass, direction: "up" | "down"): ModelClass {
  const order: ModelClass[] = ["fast", "balanced", "premium"];
  const index = order.indexOf(current);
  if (direction === "up") {
    return order[Math.min(order.length - 1, index + 1)];
  }

  return order[Math.max(0, index - 1)];
}

function chooseBaseModelClass(input: {
  domain: ModelRouteDomain;
  complexity: ModelRouteComplexity;
  context: ModelRouteContext;
}): ModelClass {
  if (input.domain === "security" || input.domain === "architecture" || input.complexity === "complex") {
    return "premium";
  }
  if (input.domain === "docs" && input.context === "small") {
    return "fast";
  }
  if (input.domain === "debugging" && input.complexity === "simple") {
    return "balanced";
  }
  return input.complexity === "simple" ? "fast" : "balanced";
}

async function getTelemetryAdjustment(input: {
  cwd: string;
  targetCommand: string | null;
  runtime: Awaited<ReturnType<typeof loadRuntimeConfig>>;
  current: ModelClass;
  prefer?: ModelRoutePreference;
  stickyPremium: boolean;
}): Promise<{ modelClass: ModelClass; telemetryNote: string }> {
  if (input.targetCommand === null || !input.runtime.telemetry.enabled) {
    return { modelClass: input.current, telemetryNote: "No local telemetry feedback available." };
  }

  let telemetry;
  try {
    telemetry = await readTelemetryDocument(input.cwd, input.runtime);
  } catch {
    return {
      modelClass: input.current,
      telemetryNote: "Telemetry feedback unavailable; ignoring local telemetry history.",
    };
  }

  const matchingRuns = telemetry.events.filter(
    (event) => event.type === "runtime.command.completed" && event.details.command === input.targetCommand,
  );
  if (matchingRuns.length < 2) {
    return { modelClass: input.current, telemetryNote: "Not enough local telemetry for this command yet." };
  }

  const okRuns = matchingRuns.filter((event) => event.details.ok === true).length;
  const successRate = okRuns / matchingRuns.length;
  if (successRate < 0.5) {
    return {
      modelClass: bumpClass(input.current, "up"),
      telemetryNote: `Escalated from local telemetry: ${okRuns}/${matchingRuns.length} recent ${input.targetCommand} runs succeeded.`,
    };
  }

  if (!input.stickyPremium && (input.prefer === "cost" || input.prefer === "speed") && successRate >= 0.9) {
    return {
      modelClass: bumpClass(input.current, "down"),
      telemetryNote: `Lowered from local telemetry: ${okRuns}/${matchingRuns.length} recent ${input.targetCommand} runs succeeded.`,
    };
  }

  return {
    modelClass: input.current,
    telemetryNote: `Local telemetry stable: ${okRuns}/${matchingRuns.length} recent ${input.targetCommand} runs succeeded.`,
  };
}

function buildReason(input: {
  modelClass: ModelClass;
  domain: ModelRouteDomain;
  complexity: ModelRouteComplexity;
  context: ModelRouteContext;
  prefer?: ModelRoutePreference;
}): string {
  const preferenceNote = input.prefer ? ` Preference bias: ${input.prefer}.` : "";
  return `${input.domain} work with ${input.complexity} complexity and ${input.context} context fits the ${input.modelClass} class.${preferenceNote}`;
}

export async function runModelRouteCommand(input: {
  cwd: string;
  task?: string;
  list?: boolean;
  prefer?: ModelRoutePreference;
}): Promise<ModelRouteCommandResult> {
  if (input.list) {
    return {
      mode: "list",
      profiles: MODEL_CLASSES,
    };
  }

  const runtime = await loadRuntimeConfig(input.cwd);

  if (!input.task || input.task.trim().length === 0) {
    throw new Error("model-route requires a task description unless --list is used.");
  }

  const task = normalizeTask(input.task);
  const classification = {
    domain: classifyDomain(task),
    complexity: classifyComplexity(task),
    context: classifyContext(task),
    targetCommand: detectTargetCommand(task),
  };
  const stickyPremium = classification.domain === "security" || classification.domain === "architecture";
  let modelClass = chooseBaseModelClass(classification);
  if (!stickyPremium && input.prefer === "quality") {
    modelClass = bumpClass(modelClass, "up");
  }
  if (!stickyPremium && (input.prefer === "cost" || input.prefer === "speed")) {
    modelClass = bumpClass(modelClass, "down");
  }

  const telemetryAdjustment = await getTelemetryAdjustment({
    cwd: input.cwd,
    targetCommand: classification.targetCommand,
    runtime,
    current: modelClass,
    prefer: input.prefer,
    stickyPremium,
  });
  modelClass = telemetryAdjustment.modelClass;

  try {
    await appendTelemetryEvent(input.cwd, runtime, {
      type: "model-route.recommended",
      details: {
        task,
        domain: classification.domain,
        complexity: classification.complexity,
        context: classification.context,
        targetCommand: classification.targetCommand,
        prefer: input.prefer ?? null,
        modelClass,
      },
    });
  } catch {
    // Telemetry is advisory; recommendations should still succeed without it.
  }

  return {
    mode: "recommendation",
    task: input.task.trim(),
    classification,
    recommendation: {
      modelClass,
      reason: buildReason({ ...classification, modelClass, prefer: input.prefer }),
      telemetryNote: telemetryAdjustment.telemetryNote,
    },
  };
}
