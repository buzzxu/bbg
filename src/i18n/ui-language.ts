export type UiLanguage = "zh-CN" | "en";

function pickLocale(env: Record<string, string | undefined>): string {
  return env.LC_ALL ?? env.LC_MESSAGES ?? env.LANG ?? "";
}

export function inferUiLanguageFromEnv(
  env: Record<string, string | undefined> = process.env,
): UiLanguage {
  const locale = pickLocale(env).toLowerCase();
  if (locale.startsWith("en")) {
    return "en";
  }

  if (locale.startsWith("zh")) {
    return "zh-CN";
  }

  return "zh-CN";
}

