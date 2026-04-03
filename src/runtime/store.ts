import { exists, readTextFile, writeTextFile } from "../utils/fs.js";

type RuntimeStoreValidator<T> = (value: unknown) => value is T;

export class RuntimeStoreError extends Error {
  public readonly cause: unknown;

  public constructor(message: string, cause: unknown) {
    super(message);
    this.name = "RuntimeStoreError";
    this.cause = cause;
  }
}

export async function readJsonStore<T>(
  filePath: string,
  fallback: T,
  validate?: RuntimeStoreValidator<T>,
): Promise<T> {
  if (!(await exists(filePath))) {
    return fallback;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(await readTextFile(filePath)) as unknown;
  } catch (error: unknown) {
    throw new RuntimeStoreError("Invalid runtime store JSON", error);
  }

  if (validate && !validate(parsed)) {
    throw new RuntimeStoreError("Invalid runtime store contents", undefined);
  }

  return parsed as T;
}

export async function writeJsonStore<T>(filePath: string, value: T): Promise<void> {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
