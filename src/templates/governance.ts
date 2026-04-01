import type { RenderTemplateTask } from "./render.js";
import type { TemplateContext } from "./context.js";
import type { LoadedPlugin } from "../plugins/types.js";
import { mergePluginTemplates } from "../plugins/merge.js";

/* ------------------------------------------------------------------ */
/*  Language → directory name mapping                                  */
/* ------------------------------------------------------------------ */

const LANG_DIR_MAP: Record<string, string> = {
  go: "golang",
  javascript: "typescript",
};

function langDir(lang: string): string {
  return LANG_DIR_MAP[lang] ?? lang;
}

/* ------------------------------------------------------------------ */
/*  Governance file lists (source paths are relative to packageRoot)   */
/* ------------------------------------------------------------------ */

const CORE_AGENTS = [
  "planner",
  "architect",
  "tdd-guide",
  "code-reviewer",
  "security-reviewer",
  "build-error-resolver",
  "refactor-cleaner",
  "e2e-runner",
  "doc-updater",
  "loop-operator",
  "harness-optimizer",
  "database-reviewer",
  "devops-reviewer",
];

const LANGUAGE_AGENTS: Record<string, string[]> = {
  typescript: ["typescript-reviewer", "typescript-build-resolver"],
  python: ["python-reviewer", "python-build-resolver"],
  go: ["go-reviewer", "go-build-resolver"],
  java: ["java-reviewer", "java-build-resolver"],
  rust: ["rust-reviewer", "rust-build-resolver"],
  kotlin: ["kotlin-reviewer"],
  cpp: ["cpp-build-resolver"],
};

const CORE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "security-review",
  "verification-loop",
  "search-first",
  "writing-plans",
  "continuous-learning",
  "eval-harness",
  "strategic-compact",
  "api-design",
  "backend-patterns",
  "database-migrations",
  "postgres-patterns",
  "frontend-patterns",
  "e2e-testing",
  "deployment-patterns",
  "docker-patterns",
  "kubernetes-patterns",
  "harness-engineering",
  "autonomous-loops",
  "mcp-integration",
];

const OPERATIONS_SKILLS = [
  "ci-cd-patterns",
  "monitoring-patterns",
  "git-workflow",
  "code-review-checklist",
  "incident-response",
  "performance-optimization",
  "security-hardening",
  "dependency-audit",
  "secrets-management",
  "microservices-patterns",
  "event-driven-architecture",
  "data-modeling",
  "api-versioning",
  "prompt-engineering",
  "llm-cost-optimization",
  "agent-orchestration",
  "agent-handoff",
  "agent-pipeline",
];

const LANGUAGE_SKILLS: Record<string, string[]> = {
  typescript: ["typescript-patterns", "react-patterns", "nextjs-patterns", "vue-patterns"],
  python: ["python-patterns", "python-testing", "django-patterns", "fastapi-patterns"],
  go: ["golang-patterns", "golang-testing", "gin-patterns"],
  java: ["java-patterns", "springboot-patterns", "springboot-testing", "jpa-patterns"],
  rust: ["rust-patterns", "rust-testing", "axum-patterns"],
  kotlin: ["kotlin-patterns", "android-patterns", "ktor-patterns"],
  php: ["laravel-patterns", "laravel-testing"],
  cpp: ["cpp-patterns"],
};

const COMMON_RULES = [
  "coding-style",
  "git-workflow",
  "testing",
  "security",
  "performance",
  "patterns",
  "hooks",
  "agents",
];

const LANGUAGE_RULES: Record<string, string[]> = {
  typescript: ["coding-style", "testing", "react", "node", "security"],
  python: ["coding-style", "testing", "django", "security"],
  golang: ["coding-style", "testing", "patterns", "security"],
  java: ["coding-style", "testing", "spring", "security"],
  rust: ["coding-style", "testing", "security"],
  kotlin: ["coding-style", "testing", "security"],
  php: ["coding-style", "testing", "security"],
};

const CORE_COMMANDS = [
  "plan",
  "tdd",
  "code-review",
  "build-fix",
  "security-scan",
  "refactor-clean",
  "e2e",
  "test-coverage",
  "update-docs",
  "doctor",
  "learn",
  "learn-eval",
  "checkpoint",
  "verify",
  "sessions",
  "eval",
  "orchestrate",
  "loop-start",
  "loop-status",
  "quality-gate",
  "harness-audit",
  "model-route",
  "setup-pm",
  "sync",
];

const LANGUAGE_COMMANDS: Record<string, string[]> = {
  typescript: ["ts-review", "ts-build", "ts-test"],
  python: ["python-review", "python-build", "python-test"],
  go: ["go-review", "go-test", "go-build"],
  java: ["java-review", "java-build", "java-test"],
  rust: ["rust-review", "rust-build", "rust-test"],
  kotlin: ["kotlin-review"],
};

const HOOK_FILES = [
  "hooks.json",
  "README.md",
  "scripts/session-start.js",
  "scripts/session-end.js",
  "scripts/pre-edit-check.js",
  "scripts/post-edit-typecheck.js",
  "scripts/security-scan.js",
  "scripts/suggest-compact.js",
];

const CONTEXT_HBS_FILES = ["dev.md", "review.md", "research.md"];

const MCP_CONFIG_FILES = ["mcp-servers.json", "README.md"];

/* ------------------------------------------------------------------ */
/*  Helper: create copy task (all governance files are verbatim copy)  */
/* ------------------------------------------------------------------ */

function copyTask(source: string, destination: string): RenderTemplateTask {
  return { source, destination, mode: "copy" };
}

function handlebarsTask(source: string, destination: string): RenderTemplateTask {
  return { source, destination, mode: "handlebars" };
}

/* ------------------------------------------------------------------ */
/*  Detect which languages are present in the template context         */
/* ------------------------------------------------------------------ */

function detectLanguages(ctx: TemplateContext): string[] {
  const langs: string[] = [];
  if (ctx.hasTypeScript) langs.push("typescript");
  if (ctx.hasPython) langs.push("python");
  if (ctx.hasGo) langs.push("go");
  if (ctx.hasJava) langs.push("java");
  if (ctx.hasRust) langs.push("rust");
  if (ctx.hasKotlin) langs.push("kotlin");
  if (ctx.hasPhp) langs.push("php");
  if (ctx.hasCpp) langs.push("cpp");

  // Also check the raw languages array for any we might have missed
  for (const lang of ctx.languages) {
    const normalized = lang.toLowerCase();
    if (!langs.includes(normalized) && (LANGUAGE_AGENTS[normalized] || LANGUAGE_SKILLS[normalized])) {
      langs.push(normalized);
    }
  }

  return langs;
}

/* ------------------------------------------------------------------ */
/*  Main export: build the governance manifest                         */
/* ------------------------------------------------------------------ */

/**
 * Builds a list of governance file copy tasks that should be deployed to a
 * target project when `bbg init` runs.
 *
 * All source paths use the special `governance://` prefix that is resolved by
 * `resolveTemplatePath` against the bbg package root directory.
 *
 * The list is stack-aware: core files are always included, while
 * language-specific agents / skills / rules / commands are only included when
 * that language is detected in the project.
 */
export function buildGovernanceManifest(
  ctx: TemplateContext,
  plugins?: LoadedPlugin[],
): RenderTemplateTask[] {
  const tasks: RenderTemplateTask[] = [];
  const langs = detectLanguages(ctx);

  // --- Agents ---
  for (const agent of CORE_AGENTS) {
    tasks.push(copyTask(`agents/${agent}.md`, `agents/${agent}.md`));
  }
  for (const lang of langs) {
    for (const agent of LANGUAGE_AGENTS[lang] ?? []) {
      tasks.push(copyTask(`agents/${agent}.md`, `agents/${agent}.md`));
    }
  }

  // --- Skills ---
  for (const skill of [...CORE_SKILLS, ...OPERATIONS_SKILLS]) {
    tasks.push(copyTask(`skills/${skill}/SKILL.md`, `skills/${skill}/SKILL.md`));
  }
  for (const lang of langs) {
    for (const skill of LANGUAGE_SKILLS[lang] ?? []) {
      tasks.push(copyTask(`skills/${skill}/SKILL.md`, `skills/${skill}/SKILL.md`));
    }
  }

  // --- Rules ---
  for (const rule of COMMON_RULES) {
    tasks.push(copyTask(`rules/common/${rule}.md`, `rules/common/${rule}.md`));
  }
  for (const lang of langs) {
    const ruleDir = langDir(lang);
    for (const rule of LANGUAGE_RULES[ruleDir] ?? []) {
      tasks.push(copyTask(`rules/${ruleDir}/${rule}.md`, `rules/${ruleDir}/${rule}.md`));
    }
  }

  // --- Commands ---
  for (const cmd of CORE_COMMANDS) {
    tasks.push(copyTask(`commands/${cmd}.md`, `commands/${cmd}.md`));
  }
  for (const lang of langs) {
    for (const cmd of LANGUAGE_COMMANDS[lang] ?? []) {
      tasks.push(copyTask(`commands/${cmd}.md`, `commands/${cmd}.md`));
    }
  }

  // --- Hooks ---
  for (const hookFile of HOOK_FILES) {
    tasks.push(copyTask(`hooks/${hookFile}`, `hooks/${hookFile}`));
  }

  // --- Contexts (Handlebars-rendered) ---
  for (const ctxFile of CONTEXT_HBS_FILES) {
    tasks.push(
      handlebarsTask(`handlebars/contexts/${ctxFile}.hbs`, `contexts/${ctxFile}`),
    );
  }

  // --- MCP Configs ---
  for (const mcpFile of MCP_CONFIG_FILES) {
    tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
  }

  return mergePluginTemplates(tasks, plugins ?? []);
}

/* ------------------------------------------------------------------ */
/*  Exported constants for self-check validation                       */
/* ------------------------------------------------------------------ */

export const GOVERNANCE_MANIFEST = {
  coreAgents: CORE_AGENTS,
  languageAgents: LANGUAGE_AGENTS,
  coreSkills: CORE_SKILLS,
  operationsSkills: OPERATIONS_SKILLS,
  languageSkills: LANGUAGE_SKILLS,
  commonRules: COMMON_RULES,
  languageRules: LANGUAGE_RULES,
  coreCommands: CORE_COMMANDS,
  languageCommands: LANGUAGE_COMMANDS,
  hookFiles: HOOK_FILES,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
} as const;
