import { confirm, input, select } from "@inquirer/prompts";
import type { StackInfo } from "../config/schema.js";
import { uiText } from "../i18n/ui-copy.js";

export type InputPromptOptions = Parameters<typeof input>[0];

export type ConfirmPromptOptions = Parameters<typeof confirm>[0];

export type SelectPromptOptions = Parameters<typeof select>[0];

export function promptInput(options: InputPromptOptions): Promise<string> {
  return input(options);
}

export function promptSelect<Value = unknown>(options: SelectPromptOptions): Promise<Value> {
  return select<Value>(options as never);
}

export function promptConfirm(options: ConfirmPromptOptions): Promise<boolean> {
  return confirm(options);
}

export function sanitizePromptValue(value: string, fallback = ""): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function collectStackInfo(detectedStack: StackInfo): Promise<StackInfo> {
  const useDetectedStack = await promptConfirm({ message: uiText("init.useDetectedStackInfo"), default: true });
  if (useDetectedStack) {
    return detectedStack;
  }

  return {
    language: sanitizePromptValue(
      await promptInput({ message: uiText("init.stackLanguage"), default: detectedStack.language }),
      detectedStack.language,
    ),
    framework: sanitizePromptValue(
      await promptInput({ message: uiText("init.stackFramework"), default: detectedStack.framework }),
      detectedStack.framework,
    ),
    buildTool: sanitizePromptValue(
      await promptInput({ message: uiText("init.stackBuildTool"), default: detectedStack.buildTool }),
      detectedStack.buildTool,
    ),
    testFramework: sanitizePromptValue(
      await promptInput({ message: uiText("init.stackTestFramework"), default: detectedStack.testFramework }),
      detectedStack.testFramework,
    ),
    packageManager: sanitizePromptValue(
      await promptInput({ message: uiText("init.stackPackageManager"), default: detectedStack.packageManager }),
      detectedStack.packageManager,
    ),
  };
}
