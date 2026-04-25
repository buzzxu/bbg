import { join } from "node:path";
import { getAdapterTemplates } from "../commands/init-manifest.js";
import { exists, readTextFile } from "../utils/fs.js";
import { groupAdapterTemplatesByTool, SUPPORTED_TOOLS, type ToolMatrixEntry } from "./layout.js";
import { hasManagedSection, isManagedAdapterPath } from "./managed.js";

function isJsonAdapterPath(pathValue: string): boolean {
  const normalized = pathValue.replaceAll("\\", "/");
  return normalized === ".gemini/settings.json" || normalized === ".opencode/opencode.json";
}

function isTomlAdapterPath(pathValue: string): boolean {
  return pathValue.replaceAll("\\", "/") === ".codex/config.toml";
}

function checkManagedContent(content: string): string[] {
  const issues: string[] = [];
  if (!hasManagedSection(content)) {
    issues.push("missing managed section markers");
  }
  if (!content.includes("AGENTS.md")) {
    issues.push("missing AGENTS.md reference");
  }
  if (!content.includes("RULES.md")) {
    issues.push("missing RULES.md reference");
  }
  return issues;
}

function checkGeminiSettings(content: string): string[] {
  const issues: string[] = [];
  try {
    const parsed = JSON.parse(content) as {
      instructions?: string[];
      context?: Record<string, string>;
    };
    const instructions = parsed.instructions ?? [];
    if (!instructions.includes("AGENTS.md")) {
      issues.push("missing AGENTS.md instruction");
    }
    if (!instructions.includes("RULES.md")) {
      issues.push("missing RULES.md instruction");
    }
    if (!instructions.includes(".bbg/context/repo-map.json")) {
      issues.push("missing repo-map instruction");
    }
    if (!instructions.includes(".bbg/policy/decisions.json")) {
      issues.push("missing policy instruction");
    }
    if (parsed.context?.commandsDir !== ".bbg/harness/commands") {
      issues.push("commandsDir must be .bbg/harness/commands");
    }
    if (parsed.context?.skillsDir !== ".bbg/harness/skills") {
      issues.push("skillsDir must be .bbg/harness/skills");
    }
    if (parsed.context?.rulesDir !== ".bbg/harness/rules") {
      issues.push("rulesDir must be .bbg/harness/rules");
    }
  } catch {
    issues.push("invalid JSON");
  }
  return issues;
}

function checkOpenCodeSettings(content: string): string[] {
  const issues: string[] = [];
  try {
    const parsed = JSON.parse(content) as {
      instructions?: string[];
      plugin?: string[];
    };
    const instructions = parsed.instructions ?? [];
    if (!instructions.includes("AGENTS.md")) {
      issues.push("missing AGENTS.md instruction");
    }
    if (!instructions.includes("RULES.md")) {
      issues.push("missing RULES.md instruction");
    }
    if (!instructions.includes(".bbg/context/repo-map.json")) {
      issues.push("missing repo-map instruction");
    }
    if (!instructions.includes(".bbg/policy/decisions.json")) {
      issues.push("missing policy instruction");
    }
  } catch {
    issues.push("invalid JSON");
  }
  return issues;
}

function checkCodexConfig(content: string): string[] {
  const issues: string[] = [];
  if (!content.includes("AGENTS.md is auto-discovered")) {
    issues.push("missing AGENTS.md auto-discovery note");
  }
  if (!content.includes("[history]")) {
    issues.push("missing history section");
  }
  return issues;
}

async function inspectFile(cwd: string, relativePath: string): Promise<string[]> {
  if (!(await exists(join(cwd, relativePath)))) {
    return ["file missing"];
  }

  const content = await readTextFile(join(cwd, relativePath));
  if (isManagedAdapterPath(relativePath)) {
    return checkManagedContent(content);
  }
  if (isJsonAdapterPath(relativePath) && relativePath.endsWith("settings.json")) {
    return checkGeminiSettings(content);
  }
  if (isJsonAdapterPath(relativePath) && relativePath.endsWith("opencode.json")) {
    return checkOpenCodeSettings(content);
  }
  if (isTomlAdapterPath(relativePath)) {
    return checkCodexConfig(content);
  }
  return [];
}

export async function analyzeToolMatrix(cwd: string): Promise<ToolMatrixEntry[]> {
  const grouped = groupAdapterTemplatesByTool(getAdapterTemplates());
  const result: ToolMatrixEntry[] = [];

  for (const tool of SUPPORTED_TOOLS) {
    const files = grouped[tool.id];
    const details: string[] = [];
    let missingCount = 0;

    for (const filePath of files) {
      const issues = await inspectFile(cwd, filePath);
      if (issues.includes("file missing")) {
        missingCount += 1;
      }
      if (issues.length > 0) {
        details.push(`${filePath}: ${issues.join(", ")}`);
      }
    }

    const status = missingCount === files.length
      ? "missing"
      : details.length > 0
        ? "partial"
        : "full";

    result.push({
      tool: tool.id,
      label: tool.label,
      status,
      files,
      details,
    });
  }

  return result;
}
