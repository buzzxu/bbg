import { join, relative } from "node:path";
import { parseConfig } from "../config/read-write.js";
import { exists, readTextFile, writeTextFile } from "../utils/fs.js";
import { RuntimeStoreError, readJsonStore, writeJsonStore } from "./store.js";
import { detectCurrentAgentToolFromEnv } from "./agent-tool.js";
import {
  ANALYZE_QUARANTINE_RETENTION_DAYS,
  pruneAnalyzeQuarantine,
  quarantineAnalyzeRuntimeStore,
} from "./analyze-quarantine.js";
import { launchConfiguredAnalyzeRunner, type LaunchAgentRunnerResult } from "./agent-runner.js";

const ANALYZE_HANDOFF_VERSION = 1;
const ANALYZE_HANDOFF_JSON_PATH = [".bbg", "analyze", "handoff", "latest.json"];
const ANALYZE_HANDOFF_MARKDOWN_PATH = [".bbg", "analyze", "handoff", "latest.md"];
const FALLBACK_AI_TOOLS = ["claude", "codex", "gemini", "opencode", "cursor"];

export { ANALYZE_QUARANTINE_RETENTION_DAYS };

export interface AnalyzeAgentHandoffRequest {
  repos: string[];
  refresh: boolean;
  focus: string | null;
  interviewMode: "auto" | "off" | "guided" | "deep";
}

export interface AnalyzeAgentHandoff {
  version: number;
  status: "pending" | "consumed";
  preferredTool: string;
  availableTools: string[];
  reasons: string[];
  command: string;
  request: AnalyzeAgentHandoffRequest;
  createdAt: string;
  updatedAt: string;
  consumedAt: string | null;
  consumedBy: string | null;
}

export interface AnalyzeAgentToolOptions {
  defaultTool: string;
  tools: string[];
}

export interface AnalyzeAgentHandoffWriteResult {
  handoff: AnalyzeAgentHandoff;
  jsonPath: string;
  markdownPath: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAnalyzeAgentHandoffRequest(value: unknown): value is AnalyzeAgentHandoffRequest {
  return (
    isRecord(value) &&
    isStringArray(value.repos) &&
    typeof value.refresh === "boolean" &&
    (value.focus === null || typeof value.focus === "string") &&
    (value.interviewMode === "auto" ||
      value.interviewMode === "off" ||
      value.interviewMode === "guided" ||
      value.interviewMode === "deep")
  );
}

function isAnalyzeAgentHandoff(value: unknown): value is AnalyzeAgentHandoff {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    (value.status === "pending" || value.status === "consumed") &&
    typeof value.preferredTool === "string" &&
    isStringArray(value.availableTools) &&
    isStringArray(value.reasons) &&
    typeof value.command === "string" &&
    isAnalyzeAgentHandoffRequest(value.request) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.consumedAt === null || typeof value.consumedAt === "string") &&
    (value.consumedBy === null || typeof value.consumedBy === "string")
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalizeToolName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveAnalyzeHandoffJsonPath(cwd: string): string {
  return join(cwd, ...ANALYZE_HANDOFF_JSON_PATH);
}

function resolveAnalyzeHandoffMarkdownPath(cwd: string): string {
  return join(cwd, ...ANALYZE_HANDOFF_MARKDOWN_PATH);
}

function buildAnalyzeReplayCommand(request: AnalyzeAgentHandoffRequest): string {
  const args = ["bbg", "analyze-agent"];
  if (request.focus && request.focus.trim().length > 0) {
    args.push(JSON.stringify(request.focus.trim()));
  }
  if (request.repos.length === 1) {
    args.push("--repo", request.repos[0]);
  } else if (request.repos.length > 1) {
    args.push("--repos", request.repos.join(","));
  }
  if (request.refresh) {
    args.push("--refresh");
  }
  if (request.interviewMode !== "auto") {
    args.push("--interview", request.interviewMode);
  }
  return args.join(" ");
}

function renderAnalyzeAgentHandoffMarkdown(handoff: AnalyzeAgentHandoff): string {
  const repoLine = handoff.request.repos.length > 0 ? handoff.request.repos.join(", ") : "workspace";
  return [
    "# Analyze Handoff",
    "",
    "Deep project analysis requires an AI agent context.",
    "",
    `Preferred AI: ${handoff.preferredTool}`,
    `Replay command: \`${handoff.command}\``,
    `Scope: ${repoLine}`,
    `Focus: ${handoff.request.focus ?? "(none)"}`,
    `Refresh: ${handoff.request.refresh ? "yes" : "no"}`,
    `Interview mode: ${handoff.request.interviewMode}`,
    "",
    "Reasons:",
    ...handoff.reasons.map((reason) => `- ${reason}`),
    "",
    "Next:",
    `1. Open ${handoff.preferredTool} in this workspace.`,
    `2. Run \`${handoff.command}\` again inside that AI agent.`,
    "",
  ].join("\n");
}

async function readConfigToolOptions(cwd: string): Promise<AnalyzeAgentToolOptions | null> {
  const configPath = join(cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    return null;
  }

  const config = parseConfig(await readTextFile(configPath));
  const configuredTools = Object.keys(config.agentRunner?.tools ?? {}).map(normalizeToolName);
  const tools = unique([
    ...(config.agentRunner?.defaultTool ? [normalizeToolName(config.agentRunner.defaultTool)] : []),
    ...configuredTools,
    ...FALLBACK_AI_TOOLS,
  ]);
  const defaultTool = normalizeToolName(config.agentRunner?.defaultTool ?? tools[0] ?? "claude");

  return {
    defaultTool,
    tools,
  };
}

export function detectCurrentAnalyzeAgentTool(): string | null {
  return detectCurrentAgentToolFromEnv(process.env);
}

export async function listAnalyzeAgentTools(cwd: string): Promise<AnalyzeAgentToolOptions> {
  const configured = await readConfigToolOptions(cwd);
  if (configured) {
    return configured;
  }

  return {
    defaultTool: FALLBACK_AI_TOOLS[0],
    tools: [...FALLBACK_AI_TOOLS],
  };
}

export async function writeAnalyzeAgentHandoff(input: {
  cwd: string;
  preferredTool: string;
  availableTools: string[];
  reasons: string[];
  request: AnalyzeAgentHandoffRequest;
}): Promise<AnalyzeAgentHandoffWriteResult> {
  const now = new Date().toISOString();
  const handoff: AnalyzeAgentHandoff = {
    version: ANALYZE_HANDOFF_VERSION,
    status: "pending",
    preferredTool: normalizeToolName(input.preferredTool),
    availableTools: unique(input.availableTools.map(normalizeToolName)),
    reasons: unique(input.reasons),
    command: buildAnalyzeReplayCommand(input.request),
    request: {
      repos: unique(input.request.repos),
      refresh: input.request.refresh,
      focus: input.request.focus?.trim() ? input.request.focus.trim() : null,
      interviewMode: input.request.interviewMode,
    },
    createdAt: now,
    updatedAt: now,
    consumedAt: null,
    consumedBy: null,
  };

  const jsonPath = resolveAnalyzeHandoffJsonPath(input.cwd);
  const markdownPath = resolveAnalyzeHandoffMarkdownPath(input.cwd);
  await writeJsonStore(jsonPath, handoff);
  await writeTextFile(markdownPath, renderAnalyzeAgentHandoffMarkdown(handoff));

  return {
    handoff,
    jsonPath: relative(input.cwd, jsonPath),
    markdownPath: relative(input.cwd, markdownPath),
  };
}

export async function readLatestAnalyzeAgentHandoff(cwd: string): Promise<AnalyzeAgentHandoff | null> {
  await pruneAnalyzeQuarantine(cwd);
  try {
    return await readJsonStore(resolveAnalyzeHandoffJsonPath(cwd), null, (value): value is AnalyzeAgentHandoff => {
      if (value === null) {
        return true;
      }
      return isAnalyzeAgentHandoff(value);
    });
  } catch (error: unknown) {
    if (error instanceof RuntimeStoreError) {
      await quarantineAnalyzeRuntimeStore(cwd, resolveAnalyzeHandoffJsonPath(cwd));
      return null;
    }
    throw error;
  }
}

export async function readPendingAnalyzeAgentHandoff(cwd: string): Promise<AnalyzeAgentHandoff | null> {
  const handoff = await readLatestAnalyzeAgentHandoff(cwd);
  return handoff?.status === "pending" ? handoff : null;
}

export async function markAnalyzeAgentHandoffConsumed(
  cwd: string,
  consumedBy: string,
): Promise<AnalyzeAgentHandoff | null> {
  const existing = await readLatestAnalyzeAgentHandoff(cwd);
  if (!existing || existing.status === "consumed") {
    return existing;
  }

  const consumed: AnalyzeAgentHandoff = {
    ...existing,
    status: "consumed",
    consumedAt: new Date().toISOString(),
    consumedBy: normalizeToolName(consumedBy),
    updatedAt: new Date().toISOString(),
  };

  await writeJsonStore(resolveAnalyzeHandoffJsonPath(cwd), consumed);
  await writeTextFile(resolveAnalyzeHandoffMarkdownPath(cwd), renderAnalyzeAgentHandoffMarkdown(consumed));
  return consumed;
}

export async function tryLaunchAnalyzeAgentHandoff(input: {
  cwd: string;
  preferredTool: string;
  replayCommand: string;
  handoffPath: string;
}): Promise<LaunchAgentRunnerResult | null> {
  const configPath = join(input.cwd, ".bbg", "config.json");
  if (!(await exists(configPath))) {
    return null;
  }

  try {
    const config = parseConfig(await readTextFile(configPath));
    return await launchConfiguredAnalyzeRunner({
      cwd: input.cwd,
      config,
      preferredTool: input.preferredTool,
      replayCommand: input.replayCommand,
      handoffPath: input.handoffPath,
    });
  } catch {
    return null;
  }
}
