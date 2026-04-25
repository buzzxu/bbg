import type { AnalyzeProgressEvent } from "../analyze/types.js";

const BAR_WIDTH = 24;
const TUI_WIDTH = 78;

const STATUS_LABELS: Record<AnalyzeProgressEvent["status"], string> = {
  running: "RUN",
  completed: "OK",
  skipped: "SKIP",
  pending: "WAIT",
  partial: "PARTIAL",
  failed: "FAIL",
};

const BOX = {
  topLeft: "\u256d",
  topRight: "\u256e",
  bottomLeft: "\u2570",
  bottomRight: "\u256f",
  horizontal: "\u2500",
  vertical: "\u2502",
};

export type AnalyzeProgressOutputStyle = "plain" | "tui";
export type AnalyzeProgressStyle = AnalyzeProgressOutputStyle | "auto" | "silent";

export function resolveAnalyzeProgressStyle(options?: {
  requested?: string;
  currentTool?: string | null;
  stdoutIsTTY?: boolean;
}): AnalyzeProgressOutputStyle | "silent" {
  const requested = options?.requested ?? "auto";
  if (requested === "plain" || requested === "tui" || requested === "silent") {
    return requested;
  }
  if (requested !== "auto") {
    throw new Error(`Unsupported analyze progress mode: ${requested}`);
  }
  if (options?.currentTool) {
    return "plain";
  }
  return options?.stdoutIsTTY ? "tui" : "plain";
}

function progressBar(percent: number, style: AnalyzeProgressOutputStyle): string {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((percent / 100) * BAR_WIDTH)));
  if (style === "tui") {
    return `${"\u2588".repeat(filled)}${"\u2591".repeat(BAR_WIDTH - filled)}`;
  }
  return `${"=".repeat(filled)}${"-".repeat(BAR_WIDTH - filled)}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function boxLine(value: string, width: number): string {
  const contentWidth = Math.max(20, width - 4);
  const content = truncate(value, contentWidth);
  return `${BOX.vertical} ${content}${" ".repeat(Math.max(0, contentWidth - content.length))} ${BOX.vertical}`;
}

function formatTuiAnalyzeProgressEvent(event: AnalyzeProgressEvent, width = TUI_WIDTH): string {
  const label = STATUS_LABELS[event.status];
  const safeWidth = Math.max(56, width);
  const ruleWidth = safeWidth - 2;
  const title = ` BBG Analyze ${event.runId} `;
  const topRule = `${title}${BOX.horizontal.repeat(Math.max(0, ruleWidth - title.length))}`;
  const phaseLine = `${label.padEnd(7)} ${event.progressPercent
    .toString()
    .padStart(3, " ")}%  [${event.phaseIndex}/${event.totalPhases}]  ${event.phase}`;
  const barLine = `${progressBar(event.progressPercent, "tui")}  ${event.message}`;
  const detailLines = event.details.slice(0, 3).map((detail) => `info  ${detail}`);
  const nextLines = event.nextAction ? [`next  ${event.nextAction}`] : [];

  return [
    `${BOX.topLeft}${topRule}${BOX.topRight}`,
    boxLine(phaseLine, safeWidth),
    boxLine(barLine, safeWidth),
    ...detailLines.map((line) => boxLine(line, safeWidth)),
    ...nextLines.map((line) => boxLine(line, safeWidth)),
    `${BOX.bottomLeft}${BOX.horizontal.repeat(ruleWidth)}${BOX.bottomRight}`,
    "",
  ].join("\n");
}

export function formatAnalyzeProgressEvent(
  event: AnalyzeProgressEvent,
  options?: { style?: AnalyzeProgressOutputStyle; width?: number },
): string {
  if ((options?.style ?? "tui") === "tui") {
    return formatTuiAnalyzeProgressEvent(event, options?.width);
  }

  const label = STATUS_LABELS[event.status];
  const header = `[${progressBar(event.progressPercent, "plain")}] ${event.progressPercent
    .toString()
    .padStart(3, " ")}%  [${event.phaseIndex}/${event.totalPhases}] ${event.phase} ${label}`;
  const details = event.details.length > 0 ? `\n  ${event.details.slice(0, 3).join(" | ")}` : "";
  const next = event.nextAction ? `\n  next: ${event.nextAction}` : "";
  return `${header}\n  ${event.message}${details}${next}\n`;
}

export function createAnalyzeProgressPrinter(
  write: (value: string) => void,
  options?: { style?: AnalyzeProgressOutputStyle; width?: number },
): (event: AnalyzeProgressEvent) => void {
  let lastKey: string | null = null;
  return (event) => {
    const key = `${event.phase}:${event.status}:${event.message}:${event.progressPercent}`;
    if (key === lastKey) {
      return;
    }
    lastKey = key;
    write(formatAnalyzeProgressEvent(event, options));
  };
}
