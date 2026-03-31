import { confirm, input, select } from "@inquirer/prompts";
import type { StackInfo } from "../config/schema.js";

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
  const useDetectedStack = await promptConfirm({ message: "Use detected stack info?", default: true });
  if (useDetectedStack) {
    return detectedStack;
  }

  return {
    language: sanitizePromptValue(
      await promptInput({ message: "Stack language", default: detectedStack.language }),
      detectedStack.language,
    ),
    framework: sanitizePromptValue(
      await promptInput({ message: "Stack framework", default: detectedStack.framework }),
      detectedStack.framework,
    ),
    buildTool: sanitizePromptValue(
      await promptInput({ message: "Stack build tool", default: detectedStack.buildTool }),
      detectedStack.buildTool,
    ),
    testFramework: sanitizePromptValue(
      await promptInput({ message: "Stack test framework", default: detectedStack.testFramework }),
      detectedStack.testFramework,
    ),
    packageManager: sanitizePromptValue(
      await promptInput({ message: "Stack package manager", default: detectedStack.packageManager }),
      detectedStack.packageManager,
    ),
  };
}
