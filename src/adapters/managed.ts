export const MANAGED_SECTION_START = "<!-- BBG:BEGIN MANAGED -->";
export const MANAGED_SECTION_END = "<!-- BBG:END MANAGED -->";

export function isManagedAdapterPath(pathValue: string): boolean {
  const normalizedPath = pathValue.replaceAll("\\", "/");

  return normalizedPath === "CLAUDE.md"
    || normalizedPath === ".codex/AGENTS.md"
    || normalizedPath.startsWith(".claude/commands/")
    || normalizedPath.startsWith(".opencode/commands/")
    || normalizedPath.startsWith(".opencode/instructions/")
    || normalizedPath.startsWith(".gemini/commands/")
    || normalizedPath.startsWith(".cursor/rules/");
}

export function hasManagedSection(content: string): boolean {
  return content.includes(MANAGED_SECTION_START) && content.includes(MANAGED_SECTION_END);
}

export function extractManagedSection(content: string): string | null {
  const startIndex = content.indexOf(MANAGED_SECTION_START);
  const endIndex = content.indexOf(MANAGED_SECTION_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }

  return content.slice(startIndex, endIndex + MANAGED_SECTION_END.length);
}

export function replaceManagedSection(currentContent: string, nextContent: string): string | null {
  const currentSection = extractManagedSection(currentContent);
  const nextSection = extractManagedSection(nextContent);

  if (currentSection === null || nextSection === null) {
    return null;
  }

  return currentContent.replace(currentSection, nextSection);
}
