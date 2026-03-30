import { createHash } from "node:crypto";

export interface FileHashEntry {
  generatedHash: string;
  generatedAt: string;
  templateVersion: string;
}

export type FileHashRecord = Record<string, FileHashEntry>;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
