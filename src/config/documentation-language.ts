import type { BbgConfig } from "./schema.js";

export type DocumentationLanguage = "zh-CN" | "en";

export function inferDocumentationLanguageFromEnv(
  _env: Record<string, string | undefined> = process.env,
): DocumentationLanguage {
  return "zh-CN";
}

export function resolveDocumentationLanguage(config: Pick<BbgConfig, "documentationLanguage">): DocumentationLanguage {
  return config.documentationLanguage ?? "zh-CN";
}
