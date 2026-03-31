import { confirm, input, select } from "@inquirer/prompts";

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
