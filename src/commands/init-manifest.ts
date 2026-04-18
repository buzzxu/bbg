import type { BbgConfig } from "../config/schema.js";
import { buildTemplateContext } from "../templates/context.js";
import { buildGovernanceManifest } from "../templates/governance.js";
import type { RenderTemplateTask } from "../templates/render.js";

/* ------------------------------------------------------------------ */
/*  Root template manifest — governance docs, scripts, git hooks       */
/* ------------------------------------------------------------------ */

export const ROOT_TEMPLATE_MANIFEST: ReadonlyArray<RenderTemplateTask> = [
  { source: "handlebars/AGENTS.md.hbs", destination: "AGENTS.md", mode: "handlebars" },
  { source: "handlebars/CLAUDE.md.hbs", destination: "CLAUDE.md", mode: "handlebars" },
  { source: "handlebars/RULES.md.hbs", destination: "RULES.md", mode: "handlebars" },
  { source: "handlebars/README.md.hbs", destination: "README.md", mode: "handlebars" },
  {
    source: "generic/docs/workflows/code-review-policy.md",
    destination: "docs/workflows/code-review-policy.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/cross-audit-policy.md",
    destination: "docs/workflows/cross-audit-policy.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/harness-engineering-playbook.md",
    destination: "docs/workflows/harness-engineering-playbook.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/task-environment-playbook.md",
    destination: "docs/workflows/task-environment-playbook.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/observability-playbook.md",
    destination: "docs/workflows/observability-playbook.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/doc-gardening-playbook.md",
    destination: "docs/workflows/doc-gardening-playbook.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/ai-task-prompt-template.md",
    destination: "docs/workflows/ai-task-prompt-template.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/requirement-template.md",
    destination: "docs/workflows/requirement-template.md",
    mode: "copy",
  },
  {
    source: "generic/docs/workflows/regression-checklist.md",
    destination: "docs/workflows/regression-checklist.md",
    mode: "copy",
  },
  {
    source: "generic/docs/tasks/TEMPLATE.md",
    destination: "docs/tasks/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/changes/TEMPLATE.md",
    destination: "docs/changes/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/handoffs/TEMPLATE.md",
    destination: "docs/handoffs/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/reports/cross-audit-report-TEMPLATE.md",
    destination: "docs/reports/cross-audit-report-TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/reports/delivery-report-TEMPLATE.md",
    destination: "docs/reports/delivery-report-TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/delivery/index.md",
    destination: "docs/delivery/index.md",
    mode: "copy",
  },
  {
    source: "generic/docs/delivery/TEMPLATE.md",
    destination: "docs/delivery/TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/delivery/diagrams/.gitkeep",
    destination: "docs/delivery/diagrams/.gitkeep",
    mode: "copy",
  },
  {
    source: "generic/docs/specs/CONFIRMED-TEMPLATE.md",
    destination: "docs/specs/CONFIRMED-TEMPLATE.md",
    mode: "copy",
  },
  {
    source: "generic/docs/cleanup/secrets-and-config-governance.md",
    destination: "docs/cleanup/secrets-and-config-governance.md",
    mode: "copy",
  },
  {
    source: "generic/docs/environments/env-overview.md",
    destination: "docs/environments/env-overview.md",
    mode: "copy",
  },
  {
    source: "handlebars/docs/architecture/order-lifecycle.md.hbs",
    destination: "docs/architecture/order-lifecycle.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/docs/system-architecture-and-ai-workflow.md.hbs",
    destination: "docs/system-architecture-and-ai-workflow.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/docs/workflows/development-standards.md.hbs",
    destination: "docs/workflows/development-standards.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/docs/workflows/release-checklist.md.hbs",
    destination: "docs/workflows/release-checklist.md",
    mode: "handlebars",
  },
  {
    source: "handlebars/.githooks/pre-commit.hbs",
    destination: ".githooks/pre-commit",
    mode: "handlebars",
  },
  {
    source: "handlebars/.githooks/pre-push.hbs",
    destination: ".githooks/pre-push",
    mode: "handlebars",
  },
  {
    source: "handlebars/scripts/doctor.py.hbs",
    destination: "scripts/doctor.py",
    mode: "handlebars",
  },
  {
    source: "handlebars/scripts/sync_versions.py.hbs",
    destination: "scripts/sync_versions.py",
    mode: "handlebars",
  },
];

/* ------------------------------------------------------------------ */
/*  AI tool config templates — deployed alongside governance files     */
/* ------------------------------------------------------------------ */

export const TOOL_CONFIG_TEMPLATES: ReadonlyArray<RenderTemplateTask> = [
  // Claude Code
  { source: "generic/.claude/settings.json", destination: ".claude/settings.json", mode: "copy" },
  { source: "generic/.claude/commands/analyze.md", destination: ".claude/commands/analyze.md", mode: "copy" },
  { source: "generic/.claude/commands/start.md", destination: ".claude/commands/start.md", mode: "copy" },
  { source: "generic/.claude/commands/resume.md", destination: ".claude/commands/resume.md", mode: "copy" },
  { source: "generic/.claude/commands/status.md", destination: ".claude/commands/status.md", mode: "copy" },
  { source: "generic/.claude/commands/plan.md", destination: ".claude/commands/plan.md", mode: "copy" },
  { source: "generic/.claude/commands/tdd.md", destination: ".claude/commands/tdd.md", mode: "copy" },
  { source: "generic/.claude/commands/code-review.md", destination: ".claude/commands/code-review.md", mode: "copy" },
  { source: "generic/.claude/commands/build-fix.md", destination: ".claude/commands/build-fix.md", mode: "copy" },
  {
    source: "generic/.claude/commands/security-scan.md",
    destination: ".claude/commands/security-scan.md",
    mode: "copy",
  },
  // Cursor
  { source: "generic/.cursor/rules/standards.mdc", destination: ".cursor/rules/standards.mdc", mode: "copy" },
  { source: "generic/.cursor/rules/security.mdc", destination: ".cursor/rules/security.mdc", mode: "copy" },
  { source: "generic/.cursor/rules/testing.mdc", destination: ".cursor/rules/testing.mdc", mode: "copy" },
  // OpenCode
  { source: "generic/.opencode/opencode.json", destination: ".opencode/opencode.json", mode: "copy" },
  {
    source: "generic/.opencode/instructions/coding-standards.md",
    destination: ".opencode/instructions/coding-standards.md",
    mode: "copy",
  },
  {
    source: "generic/.opencode/instructions/security.md",
    destination: ".opencode/instructions/security.md",
    mode: "copy",
  },
  { source: "generic/.opencode/commands/analyze.md", destination: ".opencode/commands/analyze.md", mode: "copy" },
  { source: "generic/.opencode/commands/start.md", destination: ".opencode/commands/start.md", mode: "copy" },
  { source: "generic/.opencode/commands/resume.md", destination: ".opencode/commands/resume.md", mode: "copy" },
  { source: "generic/.opencode/commands/status.md", destination: ".opencode/commands/status.md", mode: "copy" },
  { source: "generic/.opencode/commands/plan.md", destination: ".opencode/commands/plan.md", mode: "copy" },
  { source: "generic/.opencode/commands/tdd.md", destination: ".opencode/commands/tdd.md", mode: "copy" },
  {
    source: "generic/.opencode/commands/code-review.md",
    destination: ".opencode/commands/code-review.md",
    mode: "copy",
  },
  { source: "generic/.opencode/commands/build-fix.md", destination: ".opencode/commands/build-fix.md", mode: "copy" },
  { source: "generic/.opencode/commands/security.md", destination: ".opencode/commands/security.md", mode: "copy" },
  { source: "generic/.opencode/commands/doctor.md", destination: ".opencode/commands/doctor.md", mode: "copy" },
  // Codex CLI
  { source: "generic/.codex/config.toml", destination: ".codex/config.toml", mode: "copy" },
  { source: "handlebars/.codex/AGENTS.md.hbs", destination: ".codex/AGENTS.md", mode: "handlebars" },
  // Gemini
  { source: "generic/.gemini/settings.json", destination: ".gemini/settings.json", mode: "copy" },
  { source: "generic/.gemini/commands/analyze.md", destination: ".gemini/commands/analyze.md", mode: "copy" },
  { source: "generic/.gemini/commands/start.md", destination: ".gemini/commands/start.md", mode: "copy" },
  { source: "generic/.gemini/commands/resume.md", destination: ".gemini/commands/resume.md", mode: "copy" },
  { source: "generic/.gemini/commands/status.md", destination: ".gemini/commands/status.md", mode: "copy" },
  { source: "generic/.gemini/commands/plan.md", destination: ".gemini/commands/plan.md", mode: "copy" },
  {
    source: "generic/.gemini/commands/code-review.md",
    destination: ".gemini/commands/code-review.md",
    mode: "copy",
  },
  { source: "generic/.gemini/commands/tdd.md", destination: ".gemini/commands/tdd.md", mode: "copy" },
];

export const ADAPTER_TEMPLATES: ReadonlyArray<RenderTemplateTask> = [
  { source: "handlebars/CLAUDE.md.hbs", destination: "CLAUDE.md", mode: "handlebars" },
  ...TOOL_CONFIG_TEMPLATES,
];

export function getRootTemplateManifest(): RenderTemplateTask[] {
  return ROOT_TEMPLATE_MANIFEST.map((template) => ({ ...template }));
}

export function getToolConfigTemplates(): RenderTemplateTask[] {
  return TOOL_CONFIG_TEMPLATES.map((template) => ({ ...template }));
}

export function getAdapterTemplates(): RenderTemplateTask[] {
  return ADAPTER_TEMPLATES.map((template) => ({ ...template }));
}

export function buildTemplatePlan(config: BbgConfig): RenderTemplateTask[] {
  const childAgentTemplates: RenderTemplateTask[] = config.repos.map((repo) => ({
    source: "handlebars/child-AGENTS.md.hbs",
    destination: `${repo.name}/AGENTS.md`,
    mode: "handlebars",
  }));

  const ctx = buildTemplateContext(config);
  const governanceTemplates = buildGovernanceManifest(ctx);

  return [...getRootTemplateManifest(), ...getToolConfigTemplates(), ...governanceTemplates, ...childAgentTemplates];
}
