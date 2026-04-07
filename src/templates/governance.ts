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
  "eval-regression",
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
  "telemetry-dashboard",
  "deep-interview",
  "policy-enforcement",
  "context-loading",
  "session-memory",
  "workflow-orchestration",
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
  "knowledge",
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
  "eval-compare",
  "orchestrate",
  "loop-start",
  "loop-status",
  "quality-gate",
  "harness-audit",
  "model-route",
  "setup-pm",
  "sync",
  "telemetry-report",
  "interview",
  "interview-resume",
  "policy-check",
  "policy-exception",
  "context-refresh",
  "context-budget",
  "workflow-start",
  "workflow-resume",
  "workflow-status",
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
  "scripts/telemetry-collector.js",
];

const BBG_SCRIPTS = [
  "telemetry-init.sql",
  "telemetry-report.sql",
  "interview-schema.sql",
  "eval-schema.sql",
  "policy-schema.sql",
  "build-repo-map.js",
  "context-schema.sql",
];

const LANGUAGE_BBG_SCRIPTS: Record<string, string[]> = {
  typescript: ["build-symbol-map-ts.js"],
  java: ["build-symbol-map-java.py"],
  go: ["build-symbol-map-go.sh"],
  rust: ["build-symbol-map-rust.sh"],
  python: ["build-symbol-map-python.py"],
};

const BBG_POLICY_FILES = {
  handlebars: ["policy.json"],
  generic: ["exceptions.json"],
};

const EVAL_FILES = [
  "evals/golden-tasks/manifest.json",
  "evals/golden-tasks/tasks/simple-bugfix.json",
  "evals/golden-tasks/tasks/tdd-feature.json",
  "evals/golden-tasks/tasks/security-review.json",
  "evals/golden-tasks/tasks/refactor-extract.json",
];

const CONTEXT_HBS_FILES = ["dev.md", "review.md", "research.md"];

const MCP_CONFIG_FILES = ["mcp-servers.json", "README.md"];

const WORKFLOW_FILES = {
  scripts: ["workflow-schema.sql"],
  schema: ["schema.json"],
  presets: ["tdd-feature.yaml", "bugfix.yaml", "security-audit.yaml", "release-prep.yaml", "full-feature.yaml"],
};

const BACKEND_WEB_FRAMEWORKS = new Set([
  "django",
  "fastapi",
  "flask",
  "spring",
  "springboot",
  "spring-boot",
  "quarkus",
  "micronaut",
  "gin",
  "echo",
  "fiber",
  "axum",
  "actix-web",
  "actix",
  "rocket",
  "ktor",
]);

const BACKEND_GOVERNANCE = {
  skills: ["red-team-test"],
  commands: ["red-team"],
  scripts: ["red-team-schema.sql"],
  docs: [
    {
      source: "generic/docs/security/backend-red-team-playbook.md",
      destination: "docs/security/backend-red-team-playbook.md",
    },
    {
      source: "generic/docs/reports/red-team-report-TEMPLATE.md",
      destination: "docs/reports/red-team-report-TEMPLATE.md",
    },
  ],
};

const ORG_GOVERNANCE_FILES = [
  ".bbg/org/README.md",
  ".bbg/org/org-policy-schema.json",
  ".bbg/org/org-report-schema.json",
  ".bbg/org/org-config.example.json",
  ".bbg/scripts/org-schema.sql",
];

const KNOWLEDGE_FILES = [".bbg/knowledge/README.md"];

const KNOWLEDGE_SCRIPTS = ["knowledge-schema.sql"];

const KNOWLEDGE_PROVENANCE_SCRIPTS = ["knowledge-provenance.sql"];

const WIKI_SKILLS = ["wiki-ingestion", "wiki-query", "wiki-lint"];

const WIKI_COMPILATION_SKILLS = ["wiki-compilation", "wiki-maintenance"];

const WIKI_COMMANDS = ["wiki-ingest", "wiki-query", "wiki-lint"];

const WIKI_COMPILATION_COMMANDS = ["wiki-compile", "wiki-refresh"];

const WIKI_TRUST_SKILLS = ["wiki-auditor", "wiki-provenance", "wiki-distillation"];

const HERMES_SKILLS = ["hermes-runtime", "hermes-evaluation", "hermes-distillation"];

const WIKI_TRUST_COMMANDS = ["wiki-audit", "wiki-stale", "wiki-promote"];

const HERMES_COMMANDS = ["hermes-log", "hermes-candidates", "hermes-distill", "hermes-refine"];

const WIKI_DOC_FILES = [
  "docs/raw/README.md",
  "docs/wiki/index.md",
  "docs/wiki/log.md",
  "docs/wiki/concepts/README.md",
  "docs/wiki/decisions/README.md",
  "docs/wiki/reports/README.md",
  "docs/wiki/processes/README.md",
];

const WIKI_COMPILED_DOC_FILES = [
  "docs/wiki/reports/regression-risk-summary.md",
  "docs/wiki/reports/workflow-stability-summary.md",
  "docs/wiki/processes/knowledge-compilation.md",
];

const WIKI_TRUST_DOC_FILES = ["docs/wiki/processes/knowledge-trust-model.md"];

const HERMES_DOC_FILES = [
  "docs/wiki/processes/hermes-runtime.md",
  "docs/wiki/processes/hermes-distillation.md",
];

const HERMES_SCRIPTS = ["hermes-schema.sql"];

const BACKEND_WIKI_COMPILED_DOC_FILES = ["docs/wiki/reports/red-team-findings-summary.md"];

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

function isBackendProject(ctx: TemplateContext): boolean {
  if (ctx.hasJava || ctx.hasGo || ctx.hasRust) {
    return true;
  }

  if (ctx.hasPython) {
    const lowerFrameworks = ctx.frameworks.map((framework) => framework.toLowerCase());
    return lowerFrameworks.some((framework) => BACKEND_WEB_FRAMEWORKS.has(framework));
  }

  return false;
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
export function buildGovernanceManifest(ctx: TemplateContext, plugins?: LoadedPlugin[]): RenderTemplateTask[] {
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
  for (const skill of [
    ...CORE_SKILLS,
    ...OPERATIONS_SKILLS,
    ...WIKI_SKILLS,
    ...WIKI_COMPILATION_SKILLS,
    ...WIKI_TRUST_SKILLS,
    ...HERMES_SKILLS,
  ]) {
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
  for (const cmd of [
    ...CORE_COMMANDS,
    ...WIKI_COMMANDS,
    ...WIKI_COMPILATION_COMMANDS,
    ...WIKI_TRUST_COMMANDS,
    ...HERMES_COMMANDS,
  ]) {
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
    tasks.push(handlebarsTask(`handlebars/contexts/${ctxFile}.hbs`, `contexts/${ctxFile}`));
  }

  // --- MCP Configs ---
  for (const mcpFile of MCP_CONFIG_FILES) {
    tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
  }

  // --- Workflow Files ---
  for (const script of WORKFLOW_FILES.scripts) {
    tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
  }
  for (const schema of WORKFLOW_FILES.schema) {
    tasks.push(copyTask(`generic/workflows/${schema}`, `workflows/${schema}`));
  }
  for (const preset of WORKFLOW_FILES.presets) {
    tasks.push(copyTask(`generic/workflows/presets/${preset}`, `workflows/presets/${preset}`));
  }

  // --- Backend-only: Red Team Governance ---
  if (isBackendProject(ctx)) {
    for (const skill of BACKEND_GOVERNANCE.skills) {
      tasks.push(copyTask(`skills/${skill}/SKILL.md`, `skills/${skill}/SKILL.md`));
    }
    for (const cmd of BACKEND_GOVERNANCE.commands) {
      tasks.push(copyTask(`commands/${cmd}.md`, `commands/${cmd}.md`));
    }
    for (const script of BACKEND_GOVERNANCE.scripts) {
      tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
    }
    for (const doc of BACKEND_GOVERNANCE.docs) {
      tasks.push(copyTask(doc.source, doc.destination));
    }
    for (const wikiFile of BACKEND_WIKI_COMPILED_DOC_FILES) {
      tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
    }
  }

  // --- BBG Scripts ---
  for (const script of BBG_SCRIPTS) {
    tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
  }

  // --- BBG Scripts (language-specific) ---
  for (const lang of langs) {
    for (const script of LANGUAGE_BBG_SCRIPTS[lang] ?? []) {
      tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
    }
  }

  // --- Policy Files ---
  for (const policyFile of BBG_POLICY_FILES.handlebars) {
    tasks.push(handlebarsTask(`handlebars/.bbg/policy/${policyFile}.hbs`, `.bbg/policy/${policyFile}`));
  }
  for (const policyFile of BBG_POLICY_FILES.generic) {
    tasks.push(copyTask(`generic/.bbg/policy/${policyFile}`, `.bbg/policy/${policyFile}`));
  }

  // --- Eval Golden Tasks ---
  for (const evalFile of EVAL_FILES) {
    tasks.push(copyTask(evalFile, evalFile));
  }

  // --- Org Governance (reserved schemas) ---
  for (const orgFile of ORG_GOVERNANCE_FILES) {
    tasks.push(copyTask(`generic/${orgFile}`, orgFile));
  }

  // --- Knowledge Metadata Files ---
  for (const file of KNOWLEDGE_FILES) {
    tasks.push(copyTask(`generic/${file}`, file));
  }

  // --- Knowledge Scripts ---
  for (const script of KNOWLEDGE_SCRIPTS) {
    tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
  }
  for (const script of KNOWLEDGE_PROVENANCE_SCRIPTS) {
    tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
  }
  for (const script of HERMES_SCRIPTS) {
    tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
  }

  // --- Wiki Scaffold Docs ---
  for (const wikiFile of WIKI_DOC_FILES) {
    tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
  }

  // --- Wiki Compiled Docs ---
  for (const wikiFile of WIKI_COMPILED_DOC_FILES) {
    tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
  }

  // --- Wiki Trust Docs ---
  for (const wikiFile of WIKI_TRUST_DOC_FILES) {
    tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
  }
  for (const wikiFile of HERMES_DOC_FILES) {
    tasks.push(copyTask(`generic/${wikiFile}`, wikiFile));
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
  bbgScripts: BBG_SCRIPTS,
  languageBbgScripts: LANGUAGE_BBG_SCRIPTS,
  bbgPolicyFiles: BBG_POLICY_FILES,
  evalFiles: EVAL_FILES,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
  workflowFiles: WORKFLOW_FILES,
  backendGovernance: BACKEND_GOVERNANCE,
  orgGovernanceFiles: ORG_GOVERNANCE_FILES,
  knowledgeFiles: KNOWLEDGE_FILES,
  knowledgeScripts: KNOWLEDGE_SCRIPTS,
  knowledgeProvenanceScripts: KNOWLEDGE_PROVENANCE_SCRIPTS,
  wikiSkills: WIKI_SKILLS,
  wikiCompilationSkills: WIKI_COMPILATION_SKILLS,
  wikiTrustSkills: WIKI_TRUST_SKILLS,
  hermesSkills: HERMES_SKILLS,
  wikiCommands: WIKI_COMMANDS,
  wikiCompilationCommands: WIKI_COMPILATION_COMMANDS,
  wikiTrustCommands: WIKI_TRUST_COMMANDS,
  hermesCommands: HERMES_COMMANDS,
  wikiDocFiles: WIKI_DOC_FILES,
  wikiCompiledDocFiles: WIKI_COMPILED_DOC_FILES,
  wikiTrustDocFiles: WIKI_TRUST_DOC_FILES,
  hermesDocFiles: HERMES_DOC_FILES,
  hermesScripts: HERMES_SCRIPTS,
  backendWikiCompiledDocFiles: BACKEND_WIKI_COMPILED_DOC_FILES,
} as const;
