import type { RenderTemplateTask } from "../templates/render.js";

export type SupportedTool = "claude" | "codex" | "cursor" | "gemini" | "opencode";

export interface ToolDescriptor {
  id: SupportedTool;
  label: string;
}

export interface ToolMatrixEntry {
  tool: SupportedTool;
  label: string;
  status: "full" | "partial" | "missing";
  files: string[];
  details: string[];
}

export const SUPPORTED_TOOLS: ToolDescriptor[] = [
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "gemini", label: "Gemini" },
  { id: "opencode", label: "OpenCode" },
];

export function classifyAdapterDestination(destination: string): SupportedTool | null {
  const normalized = destination.replaceAll("\\", "/");

  if (normalized === "CLAUDE.md" || normalized.startsWith(".claude/")) {
    return "claude";
  }
  if (normalized.startsWith(".codex/")) {
    return "codex";
  }
  if (normalized.startsWith(".cursor/")) {
    return "cursor";
  }
  if (normalized.startsWith(".gemini/")) {
    return "gemini";
  }
  if (normalized.startsWith(".opencode/")) {
    return "opencode";
  }

  return null;
}

export function groupAdapterTemplatesByTool(templates: RenderTemplateTask[]): Record<SupportedTool, string[]> {
  const grouped: Record<SupportedTool, string[]> = {
    claude: [],
    codex: [],
    cursor: [],
    gemini: [],
    opencode: [],
  };

  for (const template of templates) {
    const tool = classifyAdapterDestination(template.destination);
    if (tool !== null) {
      grouped[tool].push(template.destination);
    }
  }

  for (const tool of SUPPORTED_TOOLS) {
    grouped[tool.id].sort((left, right) => left.localeCompare(right));
  }

  return grouped;
}
