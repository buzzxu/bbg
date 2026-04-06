# Eval/Benchmark System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a golden task set evaluation and regression comparison system to the BBG harness — enabling target projects to measure whether harness changes improve or regress agent performance.

**Architecture:** BBG is a GENERATOR. All new files are governance content deployed to target projects via `bbg init`. BBG's own `src/` code only changes to register new templates in `governance.ts`. This phase creates 10 new governance files (1 SQL schema, 5 golden task JSONs, 1 manifest, 1 skill, 1 command) and modifies `governance.ts` + its test.

**Tech Stack:** SQLite DDL, JSON task definitions, Markdown skill/command files, TypeScript manifest registration, vitest.

**Phase Dependency:** Phase 3 depends on Phase 2 (Telemetry/Observability) having established the `BBG_SCRIPTS` array and `.bbg/scripts/` copy pattern in `governance.ts`. This plan adds `"eval-schema.sql"` to that array and `EVAL_FILES` as a new array alongside it.

---

## File Location Pattern

Governance docs (agents, skills, commands, rules, hooks) live at the **bbg package root** and resolve via the `packageRoot` fallback in `resolveTemplatePath` (`src/templates/render.ts:75-80`).

Generated runtime artifacts (for target projects) are template assets and follow the `templates/` source pattern (`generic/...` / `handlebars/...`).

For this phase:

- `evals/golden-tasks/manifest.json` → `<bbg>/evals/golden-tasks/manifest.json`
- `evals/golden-tasks/tasks/*.json` → `<bbg>/evals/golden-tasks/tasks/*.json`
- `templates/generic/.bbg/scripts/eval-schema.sql` → copied to target as `.bbg/scripts/eval-schema.sql` via `BBG_SCRIPTS`

So this plan intentionally uses both patterns: package-root files for eval docs/data and `templates/generic/` for generated SQL script assets.

---

## File Map

| File                                             | Action | Responsibility                                      |
| ------------------------------------------------ | ------ | --------------------------------------------------- |
| `evals/golden-tasks/manifest.json`               | Create | Task set manifest with 4 starter tasks              |
| `evals/golden-tasks/tasks/simple-bugfix.json`    | Create | TDD bugfix golden task                              |
| `evals/golden-tasks/tasks/tdd-feature.json`      | Create | TDD feature golden task                             |
| `evals/golden-tasks/tasks/security-review.json`  | Create | Security review golden task                         |
| `evals/golden-tasks/tasks/refactor-extract.json` | Create | Refactor extraction golden task                     |
| `skills/eval-regression/SKILL.md`                | Create | Regression eval skill (~110 lines)                  |
| `commands/eval-compare.md`                       | Create | Eval comparison command (~55 lines)                 |
| `src/templates/governance.ts`                    | Modify | Register new skill, command, eval files, SQL script |
| `tests/unit/templates/governance.test.ts`        | Modify | Update count assertions                             |

**Note on SQL schema:** The `.bbg/scripts/eval-schema.sql` file is registered via the `BBG_SCRIPTS` array that Phase 2 establishes. Phase 2 determines where SQL source files live and how they resolve. This plan adds `"eval-schema.sql"` to that array following Phase 2's established pattern.

---

## Task 1: Create the Eval SQL Schema

**Files:**

- Create: SQL schema file at the location established by Phase 2's `BBG_SCRIPTS` pattern

Phase 2 establishes where `.bbg/scripts/` source files live. This task creates `eval-schema.sql` in the same location as Phase 2's `telemetry-init.sql` and `telemetry-report.sql`.

- [ ] **Step 1: Create eval-schema.sql**

Create the eval schema SQL file alongside Phase 2's existing SQL files (same directory as `telemetry-init.sql`). The content:

```sql
-- BBG Eval/Benchmark Schema
-- Tracks golden task evaluation runs and per-task results for regression comparison.
-- This file is deployed by `bbg init` and executed by eval/telemetry workflow steps
-- against .bbg/telemetry.db (created by the telemetry module).

CREATE TABLE IF NOT EXISTS eval_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
  run_id        TEXT    NOT NULL UNIQUE,
  harness_version TEXT,
  task_set      TEXT    NOT NULL,
  model         TEXT,
  total_tasks   INTEGER NOT NULL,
  passed        INTEGER NOT NULL,
  failed        INTEGER NOT NULL,
  skipped       INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  config_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS eval_task_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id        TEXT    NOT NULL REFERENCES eval_runs(run_id),
  task_id       TEXT    NOT NULL,
  task_title    TEXT,
  category      TEXT,
  status        TEXT    NOT NULL,  -- 'pass' | 'fail' | 'partial' | 'skip' | 'error'
  score         REAL,
  duration_ms   INTEGER,
  tokens_used   INTEGER,
  iterations    INTEGER,
  failure_reason TEXT,
  grader_output TEXT
);

CREATE VIEW IF NOT EXISTS v_eval_version_compare AS
SELECT r.harness_version, r.model, r.task_set,
  COUNT(t.id) AS total_tasks,
  ROUND(100.0 * SUM(CASE WHEN t.status = 'pass' THEN 1 ELSE 0 END) / COUNT(t.id), 1) AS pass_rate,
  ROUND(AVG(t.score) * 100, 1) AS avg_score,
  SUM(t.tokens_used) AS total_tokens,
  AVG(t.iterations) AS avg_iterations
FROM eval_runs r JOIN eval_task_results t ON r.run_id = t.run_id
GROUP BY r.harness_version, r.model, r.task_set;
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add eval/benchmark SQLite schema (2 tables + 1 view)"
```

---

## Task 2: Create the Golden Task Manifest

**Files:**

- Create: `evals/golden-tasks/manifest.json`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p evals/golden-tasks/tasks
```

- [ ] **Step 2: Create manifest.json**

Create `evals/golden-tasks/manifest.json`:

```json
{
  "version": "1.0",
  "name": "default",
  "description": "Default golden task set for harness evaluation. Each task tests a specific AI agent workflow capability in a language-agnostic way.",
  "tasks": [
    {
      "id": "simple-bugfix",
      "file": "tasks/simple-bugfix.json",
      "category": "bugfix",
      "workflow": "tdd"
    },
    {
      "id": "tdd-feature",
      "file": "tasks/tdd-feature.json",
      "category": "feature",
      "workflow": "tdd"
    },
    {
      "id": "security-review",
      "file": "tasks/security-review.json",
      "category": "review",
      "workflow": "security-scan"
    },
    {
      "id": "refactor-extract",
      "file": "tasks/refactor-extract.json",
      "category": "refactor",
      "workflow": "refactor-clean"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add evals/golden-tasks/manifest.json
git commit -m "feat: add golden task set manifest with 4 starter tasks"
```

---

## Task 3: Create Golden Task — simple-bugfix

**Files:**

- Create: `evals/golden-tasks/tasks/simple-bugfix.json`

- [ ] **Step 1: Create simple-bugfix.json**

Create `evals/golden-tasks/tasks/simple-bugfix.json`:

```json
{
  "id": "simple-bugfix",
  "title": "Simple Bug Fix",
  "category": "bugfix",
  "workflow": "tdd",
  "description": "A function that calculates the total price of items in a cart has an off-by-one error when applying a bulk discount. The discount should apply when the cart has 3 or more items, but it currently requires more than 3 items (using > instead of >=). The agent must identify the bug, write a failing test that exposes it, fix the code, and verify all tests pass.",
  "setup": {
    "files": [
      {
        "path": "src/cart.js",
        "content": "/**\n * Calculate total price with bulk discount.\n * Discount: 10% off when 3 or more items in cart.\n * @param {Array<{name: string, price: number}>} items\n * @returns {number} total price after discount\n */\nexport function calculateTotal(items) {\n  const subtotal = items.reduce((sum, item) => sum + item.price, 0);\n  if (items.length > 3) {\n    return subtotal * 0.9;\n  }\n  return subtotal;\n}\n"
      },
      {
        "path": "tests/cart.test.js",
        "content": "import { calculateTotal } from '../src/cart.js';\n\ndescribe('calculateTotal', () => {\n  it('returns 0 for empty cart', () => {\n    expect(calculateTotal([])).toBe(0);\n  });\n\n  it('returns price for single item', () => {\n    expect(calculateTotal([{ name: 'A', price: 10 }])).toBe(10);\n  });\n});\n"
      }
    ],
    "instructions": "The project uses a standard JS/TS test runner. Set up the files above and ask the agent to fix the bug described in the function's doc comment vs its implementation."
  },
  "criteria": {
    "must_pass": [
      "Agent writes a failing test BEFORE fixing the code",
      "Agent identifies the off-by-one error (> should be >=)",
      "Agent fixes the comparison operator",
      "All tests pass after the fix including the new test"
    ],
    "scoring": {
      "tdd_compliance": {
        "weight": 0.4,
        "description": "Did the agent follow TDD (test first, then fix)?"
      },
      "bug_identification": {
        "weight": 0.3,
        "description": "Did the agent correctly identify the root cause?"
      },
      "test_quality": {
        "weight": 0.2,
        "description": "Does the new test specifically target the boundary condition (exactly 3 items)?"
      },
      "no_unnecessary_changes": {
        "weight": 0.1,
        "description": "Did the agent avoid modifying unrelated code?"
      }
    }
  },
  "grader": {
    "type": "checklist",
    "checks": [
      {
        "id": "test_written_first",
        "description": "A failing test was committed or shown before the fix",
        "weight": 2
      },
      {
        "id": "correct_fix",
        "description": "The comparison was changed from > 3 to >= 3",
        "weight": 2
      },
      {
        "id": "boundary_test",
        "description": "A test with exactly 3 items verifies discount is applied",
        "weight": 1
      },
      {
        "id": "all_tests_pass",
        "description": "All tests pass after the fix",
        "weight": 2
      },
      {
        "id": "minimal_diff",
        "description": "Only the comparison operator and test file were changed",
        "weight": 1
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add evals/golden-tasks/tasks/simple-bugfix.json
git commit -m "feat: add simple-bugfix golden task"
```

---

## Task 4: Create Golden Task — tdd-feature

**Files:**

- Create: `evals/golden-tasks/tasks/tdd-feature.json`

- [ ] **Step 1: Create tdd-feature.json**

Create `evals/golden-tasks/tasks/tdd-feature.json`:

```json
{
  "id": "tdd-feature",
  "title": "TDD Feature Implementation",
  "category": "feature",
  "workflow": "tdd",
  "description": "Implement a text formatter utility that wraps lines to a specified width without breaking words. If a single word exceeds the line width, it should appear on its own line. The agent must follow strict TDD: write tests first for each behavior, then implement incrementally.",
  "setup": {
    "files": [
      {
        "path": "src/word-wrap.js",
        "content": "/**\n * Wrap text to the specified line width without breaking words.\n * - Lines should not exceed `width` characters (unless a single word is longer).\n * - Words are separated by spaces.\n * - Existing newlines in the input are preserved.\n * @param {string} text - The input text to wrap.\n * @param {number} width - Maximum line width.\n * @returns {string} The wrapped text.\n */\nexport function wordWrap(text, width) {\n  // TODO: implement\n  throw new Error('Not implemented');\n}\n"
      },
      {
        "path": "tests/word-wrap.test.js",
        "content": "import { wordWrap } from '../src/word-wrap.js';\n\ndescribe('wordWrap', () => {\n  // Agent should add tests here before implementing\n});\n"
      }
    ],
    "instructions": "Ask the agent to implement the wordWrap function using TDD. The agent should write at least 4 test cases before or interleaved with implementation: empty string, single word, wrapping at width boundary, and a word longer than width."
  },
  "criteria": {
    "must_pass": [
      "Agent writes at least 4 distinct test cases",
      "Tests are written BEFORE or interleaved with implementation (not all at the end)",
      "Empty string input returns empty string",
      "Text shorter than width is returned unchanged",
      "Words wrap to next line at width boundary without breaking",
      "A word longer than width appears on its own line",
      "All tests pass after implementation"
    ],
    "scoring": {
      "tdd_compliance": {
        "weight": 0.35,
        "description": "Were tests written before implementation code?"
      },
      "test_coverage": {
        "weight": 0.25,
        "description": "Do tests cover edge cases (empty, single word, long word, exact width)?"
      },
      "correctness": {
        "weight": 0.25,
        "description": "Does the implementation handle all specified behaviors?"
      },
      "code_quality": {
        "weight": 0.15,
        "description": "Is the implementation clean, readable, and free of unnecessary complexity?"
      }
    }
  },
  "grader": {
    "type": "checklist",
    "checks": [
      {
        "id": "tests_before_impl",
        "description": "At least one test was written before any implementation code",
        "weight": 2
      },
      {
        "id": "minimum_test_count",
        "description": "At least 4 distinct test cases exist",
        "weight": 1
      },
      {
        "id": "empty_string_handled",
        "description": "A test verifies wordWrap('', n) returns ''",
        "weight": 1
      },
      {
        "id": "no_break_test",
        "description": "A test verifies words are not broken mid-word",
        "weight": 1
      },
      {
        "id": "long_word_test",
        "description": "A test verifies a word longer than width appears on its own line",
        "weight": 1
      },
      {
        "id": "all_tests_pass",
        "description": "All tests pass after implementation is complete",
        "weight": 2
      },
      {
        "id": "implementation_correct",
        "description": "The function correctly wraps text without breaking words",
        "weight": 2
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add evals/golden-tasks/tasks/tdd-feature.json
git commit -m "feat: add tdd-feature golden task"
```

---

## Task 5: Create Golden Task — security-review

**Files:**

- Create: `evals/golden-tasks/tasks/security-review.json`

- [ ] **Step 1: Create security-review.json**

Create `evals/golden-tasks/tasks/security-review.json`:

```json
{
  "id": "security-review",
  "title": "Security Review",
  "category": "review",
  "workflow": "security-scan",
  "description": "Review a file containing multiple deliberate security vulnerabilities: hardcoded credentials, path traversal, missing input validation, and use of eval(). The agent must identify all vulnerabilities, explain their risk, and provide remediation guidance.",
  "setup": {
    "files": [
      {
        "path": "src/user-service.js",
        "content": "import fs from 'node:fs';\nimport path from 'node:path';\n\nconst DB_PASSWORD = 'super_secret_123';\nconst API_KEY = 'sk-live-abcdef1234567890';\n\nexport function getUser(id) {\n  return { id, name: 'User ' + id, role: 'member' };\n}\n\nexport function getUserAvatar(userId, filename) {\n  const avatarPath = path.join('/uploads/avatars', userId, filename);\n  return fs.readFileSync(avatarPath);\n}\n\nexport function processUserInput(input) {\n  const result = eval('(' + input + ')');\n  return result;\n}\n\nexport function updateUserRole(requestBody) {\n  const { userId, newRole } = requestBody;\n  // No authentication or authorization check\n  // No input validation on newRole\n  return { userId, role: newRole, updated: true };\n}\n\nexport function buildQuery(tableName, conditions) {\n  return `SELECT * FROM ${tableName} WHERE ${conditions}`;\n}\n"
      }
    ],
    "instructions": "Ask the agent to perform a security review of user-service.js. The file contains at least 5 deliberate vulnerabilities. The agent should identify each one, explain the risk, and suggest specific fixes."
  },
  "criteria": {
    "must_pass": [
      "Agent identifies hardcoded credentials (DB_PASSWORD, API_KEY)",
      "Agent identifies path traversal risk in getUserAvatar",
      "Agent identifies eval() usage in processUserInput",
      "Agent identifies missing auth/authz in updateUserRole",
      "Agent identifies SQL injection in buildQuery",
      "Agent provides actionable remediation for each finding"
    ],
    "scoring": {
      "vulnerability_detection": {
        "weight": 0.4,
        "description": "How many of the 5 planted vulnerabilities were found?"
      },
      "risk_explanation": {
        "weight": 0.25,
        "description": "Were the risks clearly explained with potential attack scenarios?"
      },
      "remediation_quality": {
        "weight": 0.25,
        "description": "Were fix recommendations specific and correct?"
      },
      "false_positives": {
        "weight": 0.1,
        "description": "Did the agent avoid flagging non-issues as vulnerabilities?"
      }
    }
  },
  "grader": {
    "type": "checklist",
    "checks": [
      {
        "id": "hardcoded_creds",
        "description": "Identified hardcoded DB_PASSWORD and/or API_KEY",
        "weight": 2
      },
      {
        "id": "path_traversal",
        "description": "Identified path traversal risk in getUserAvatar (filename not sanitized)",
        "weight": 2
      },
      {
        "id": "eval_usage",
        "description": "Identified eval() as dangerous in processUserInput",
        "weight": 2
      },
      {
        "id": "missing_auth",
        "description": "Identified missing authentication/authorization in updateUserRole",
        "weight": 1
      },
      {
        "id": "sql_injection",
        "description": "Identified SQL injection risk in buildQuery",
        "weight": 2
      },
      {
        "id": "remediation_provided",
        "description": "Provided specific fix recommendations (not just 'fix it')",
        "weight": 2
      },
      {
        "id": "low_false_positives",
        "description": "Did not flag more than 1 non-issue as a vulnerability",
        "weight": 1
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add evals/golden-tasks/tasks/security-review.json
git commit -m "feat: add security-review golden task"
```

---

## Task 6: Create Golden Task — refactor-extract

**Files:**

- Create: `evals/golden-tasks/tasks/refactor-extract.json`

- [ ] **Step 1: Create refactor-extract.json**

Create `evals/golden-tasks/tasks/refactor-extract.json`:

```json
{
  "id": "refactor-extract",
  "title": "Refactor — Extract Duplicated Logic",
  "category": "refactor",
  "workflow": "refactor-clean",
  "description": "A module has three functions that each duplicate the same validation and formatting logic. The agent must identify the duplication, extract it into a shared helper, update the three functions to use the helper, and ensure existing tests continue to pass.",
  "setup": {
    "files": [
      {
        "path": "src/notifications.js",
        "content": "/**\n * Notification module — sends alerts via email, SMS, and push.\n * Note: the validation and formatting logic is duplicated across all three functions.\n */\n\nexport function sendEmail(recipient, subject, body) {\n  if (!recipient || typeof recipient !== 'string') {\n    throw new Error('Invalid recipient');\n  }\n  if (!subject || typeof subject !== 'string') {\n    throw new Error('Invalid subject');\n  }\n  const cleanRecipient = recipient.trim().toLowerCase();\n  const timestamp = new Date().toISOString();\n  const formatted = `[${timestamp}] To: ${cleanRecipient} | ${subject}: ${body}`;\n  return { type: 'email', message: formatted, recipient: cleanRecipient };\n}\n\nexport function sendSms(recipient, subject, body) {\n  if (!recipient || typeof recipient !== 'string') {\n    throw new Error('Invalid recipient');\n  }\n  if (!subject || typeof subject !== 'string') {\n    throw new Error('Invalid subject');\n  }\n  const cleanRecipient = recipient.trim().toLowerCase();\n  const timestamp = new Date().toISOString();\n  const formatted = `[${timestamp}] To: ${cleanRecipient} | ${subject}: ${body}`;\n  return { type: 'sms', message: formatted, recipient: cleanRecipient };\n}\n\nexport function sendPush(recipient, subject, body) {\n  if (!recipient || typeof recipient !== 'string') {\n    throw new Error('Invalid recipient');\n  }\n  if (!subject || typeof subject !== 'string') {\n    throw new Error('Invalid subject');\n  }\n  const cleanRecipient = recipient.trim().toLowerCase();\n  const timestamp = new Date().toISOString();\n  const formatted = `[${timestamp}] To: ${cleanRecipient} | ${subject}: ${body}`;\n  return { type: 'push', message: formatted, recipient: cleanRecipient };\n}\n"
      },
      {
        "path": "tests/notifications.test.js",
        "content": "import { sendEmail, sendSms, sendPush } from '../src/notifications.js';\n\ndescribe('notifications', () => {\n  it('sendEmail returns correct type and formatted message', () => {\n    const result = sendEmail('Alice@Test.com', 'Hello', 'World');\n    expect(result.type).toBe('email');\n    expect(result.recipient).toBe('alice@test.com');\n    expect(result.message).toContain('Hello: World');\n  });\n\n  it('sendSms returns correct type', () => {\n    const result = sendSms('Bob@Test.com', 'Alert', 'Fire');\n    expect(result.type).toBe('sms');\n    expect(result.recipient).toBe('bob@test.com');\n  });\n\n  it('sendPush returns correct type', () => {\n    const result = sendPush('Carol@Test.com', 'Update', 'New version');\n    expect(result.type).toBe('push');\n    expect(result.recipient).toBe('carol@test.com');\n  });\n\n  it('throws on invalid recipient', () => {\n    expect(() => sendEmail('', 'Hi', 'there')).toThrow('Invalid recipient');\n    expect(() => sendSms(null, 'Hi', 'there')).toThrow('Invalid recipient');\n  });\n\n  it('throws on invalid subject', () => {\n    expect(() => sendEmail('a@b.com', '', 'body')).toThrow('Invalid subject');\n  });\n});\n"
      }
    ],
    "instructions": "Ask the agent to refactor notifications.js to eliminate the duplicated validation and formatting logic across sendEmail, sendSms, and sendPush. All existing tests must continue to pass."
  },
  "criteria": {
    "must_pass": [
      "Agent identifies the duplicated validation + formatting logic",
      "Agent extracts a shared helper function",
      "All three send functions are updated to use the helper",
      "All existing tests pass without modification",
      "The extracted helper is tested or covered by existing tests"
    ],
    "scoring": {
      "duplication_identified": {
        "weight": 0.2,
        "description": "Did the agent explicitly call out what was duplicated?"
      },
      "extraction_quality": {
        "weight": 0.3,
        "description": "Is the extracted helper clean, well-named, and properly parameterized?"
      },
      "refactor_completeness": {
        "weight": 0.25,
        "description": "Were all three functions updated to use the shared helper?"
      },
      "tests_preserved": {
        "weight": 0.15,
        "description": "Do all existing tests pass without modification?"
      },
      "no_behavior_change": {
        "weight": 0.1,
        "description": "Does the refactored code produce identical outputs?"
      }
    }
  },
  "grader": {
    "type": "checklist",
    "checks": [
      {
        "id": "duplication_called_out",
        "description": "Agent explicitly identified the repeated validation + formatting pattern",
        "weight": 1
      },
      {
        "id": "helper_extracted",
        "description": "A shared function was created for the common logic",
        "weight": 2
      },
      {
        "id": "helper_well_named",
        "description": "The extracted function has a descriptive name (not 'helper' or 'util')",
        "weight": 1
      },
      {
        "id": "all_three_updated",
        "description": "sendEmail, sendSms, and sendPush all call the shared function",
        "weight": 2
      },
      {
        "id": "tests_pass",
        "description": "All existing tests pass without modification",
        "weight": 2
      },
      {
        "id": "no_behavior_change",
        "description": "Output format and error behavior are preserved exactly",
        "weight": 2
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add evals/golden-tasks/tasks/refactor-extract.json
git commit -m "feat: add refactor-extract golden task"
```

---

## Task 7: Create the eval-regression Skill

**Files:**

- Create: `skills/eval-regression/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p skills/eval-regression
```

- [ ] **Step 2: Create SKILL.md**

Create `skills/eval-regression/SKILL.md` with the content below. Note: the file contains markdown with code blocks — write it using the Write tool, not via heredoc.

````markdown
---
name: eval-regression
category: testing
description: Run golden task sets, grade results, compare against baseline, and produce regression reports
---

# Eval Regression

## Overview

Use this skill when you need to measure whether harness changes (new skills, updated hooks, modified agents) improved or degraded agent performance. The workflow uses golden task sets — standardized tasks with known-good evaluation criteria — to produce comparable scores across harness versions.

## Prerequisites

- SQLite database at `.bbg/telemetry.db` (created by the telemetry module)
- Eval schema applied (`.bbg/scripts/eval-schema.sql`)
- Golden task set defined in `evals/golden-tasks/manifest.json`

## Workflow

### Step 1: Load the Golden Task Set

Read `evals/golden-tasks/manifest.json` to get the task inventory. Each task entry references a JSON file in `evals/golden-tasks/tasks/` containing setup files, evaluation criteria, and grading checklists.

```bash
cat evals/golden-tasks/manifest.json
```

Verify all referenced task files exist before proceeding.

### Step 2: Execute Each Golden Task

For each task in the manifest:

1. **Set up the environment** — Create the files specified in the task's `setup.files` array in a temporary or sandboxed directory.
2. **Present the task** — Give the agent the task description and setup instructions.
3. **Record execution** — Track: start time, token usage, number of iterations, and final status.
4. **Grade the result** — Evaluate against the task's `grader.checks` array. Each check gets a pass/fail. Calculate a weighted score from check weights.

Status values: `pass` (all must_pass criteria met), `fail` (any must_pass criteria missed), `partial` (some criteria met), `skip` (task not executed), `error` (execution failed).

### Step 3: Record Results to SQLite

Generate a unique `run_id` (format: `eval-YYYYMMDD-HHMMSS`) and insert results:

```sql
-- Insert the run summary
INSERT INTO eval_runs (run_id, harness_version, task_set, model, total_tasks, passed, failed, skipped, duration_ms, config_snapshot)
VALUES ('<run_id>', '<version>', 'default', '<model>', <total>, <passed>, <failed>, <skipped>, <duration>, '<config_json>');

-- Insert each task result
INSERT INTO eval_task_results (run_id, task_id, task_title, category, status, score, duration_ms, tokens_used, iterations, failure_reason, grader_output)
VALUES ('<run_id>', '<task_id>', '<title>', '<category>', '<status>', <score>, <duration>, <tokens>, <iterations>, '<reason>', '<grader_json>');
```

### Step 4: Compare Against Baseline

Query the previous run for the same task set to establish a baseline:

```sql
SELECT run_id, harness_version, task_set, passed, failed, total_tasks, duration_ms
FROM eval_runs
WHERE task_set = '<task_set>'
ORDER BY timestamp DESC
LIMIT 2;
```

Use `v_eval_version_compare` for aggregate comparison:

```sql
SELECT * FROM v_eval_version_compare
WHERE task_set = '<task_set>'
ORDER BY harness_version DESC;
```

### Step 5: Produce Regression Report

Compare the current run against the baseline across these dimensions:

| Metric         | Regression Threshold | Description                              |
| -------------- | -------------------- | ---------------------------------------- |
| pass_rate      | Any decrease         | Percentage of tasks with status = 'pass' |
| avg_score      | > 5% decrease        | Average weighted score across all tasks  |
| total_tokens   | > 20% increase       | Total token consumption (cost indicator) |
| avg_iterations | > 25% increase       | Average iterations per task (efficiency) |

**Report format:**

```
## Eval Regression Report
Run: <run_id> | Harness: <version> | Model: <model> | Task Set: <task_set>

### Summary
| Metric         | Baseline | Current | Delta  | Status     |
|----------------|----------|---------|--------|------------|
| Pass Rate      | 75.0%    | 100.0%  | +25.0% | IMPROVED   |
| Avg Score      | 68.2%    | 85.5%   | +17.3% | IMPROVED   |
| Total Tokens   | 12,450   | 10,200  | -18.1% | IMPROVED   |
| Avg Iterations | 3.2      | 2.8     | -12.5% | IMPROVED   |

### Per-Task Results
| Task             | Baseline | Current | Status  |
|------------------|----------|---------|---------|
| simple-bugfix    | pass     | pass    | STABLE  |
| tdd-feature      | fail     | pass    | FIXED   |
| security-review  | pass     | pass    | STABLE  |
| refactor-extract | fail     | pass    | FIXED   |

### Verdict: PASS — no regressions detected
```

If any metric crosses its regression threshold, the verdict is `FAIL — regressions detected` with details on which metrics regressed.

## Rules

- Always run the complete task set — never skip tasks to improve scores
- Record ALL results including failures — do not cherry-pick passing runs
- Use the same model for both baseline and comparison runs when possible
- Store config_snapshot so results are reproducible
- A first run with no baseline always gets verdict BASELINE ESTABLISHED

## Anti-patterns

- Running individual tasks instead of the full set — results are not comparable
- Comparing runs across different models without noting it
- Adjusting grader criteria to make failing tasks pass
- Deleting old baselines to hide regressions

## Related

- **Skills**: [eval-harness](../eval-harness/SKILL.md)
- **Commands**: [/eval](../../commands/eval.md), [/eval-compare](../../commands/eval-compare.md)
````

- [ ] **Step 3: Commit**

```bash
git add skills/eval-regression/SKILL.md
git commit -m "feat: add eval-regression skill for golden task evaluation workflow"
```

---

## Task 8: Create the eval-compare Command

**Files:**

- Create: `commands/eval-compare.md`

- [ ] **Step 1: Create eval-compare.md**

Create `commands/eval-compare.md` with the content below:

````markdown
# /eval-compare

## Description

Compare evaluation results across harness versions or model configurations. Queries the SQLite eval tables to produce a side-by-side regression report showing pass rates, scores, token usage, and iteration counts.

## Usage

```
/eval-compare
/eval-compare --baseline <run_id>
/eval-compare --task-set default --last 3
/eval-compare --model claude-sonnet-4 --model claude-opus-4
```

## Process

1. **Query runs** — Fetch the two most recent eval runs for the specified task set from `eval_runs`, or use the explicitly provided `--baseline` run ID.
2. **Load task results** — For each run, query `eval_task_results` to get per-task scores and statuses.
3. **Compute deltas** — For each metric (pass_rate, avg_score, total_tokens, avg_iterations), calculate the absolute and percentage change between baseline and current.
4. **Apply thresholds** — Flag regressions using these thresholds:
   - **pass_rate**: any decrease is a regression
   - **avg_score**: decrease > 5% is a regression
   - **total_tokens**: increase > 20% is a regression
   - **avg_iterations**: increase > 25% is a regression
5. **Render report** — Display a formatted comparison table with per-metric status (IMPROVED, STABLE, REGRESSED) and an overall verdict.

## Options

| Flag                  | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `--baseline <run_id>` | Compare against a specific run instead of the most recent previous |
| `--task-set <name>`   | Task set to compare (default: `default`)                           |
| `--last <n>`          | Compare the last N runs as a trend                                 |
| `--model <name>`      | Filter by model (can specify twice for cross-model comparison)     |
| `--json`              | Output comparison data as JSON for programmatic use                |

## Output

Side-by-side comparison table:

```
## Eval Comparison: v1.2 vs v1.3
| Metric         | v1.2 (baseline) | v1.3 (current) | Delta  | Status   |
|----------------|-----------------|----------------|--------|----------|
| Pass Rate      | 75.0%           | 100.0%         | +25.0% | IMPROVED |
| Avg Score      | 68.2%           | 85.5%          | +17.3% | IMPROVED |
| Total Tokens   | 12,450          | 10,200         | -18.1% | IMPROVED |
| Avg Iterations | 3.2             | 2.8            | -12.5% | IMPROVED |

Verdict: PASS — no regressions detected
```

## Rules

- Always compare runs from the same task set — cross-set comparison is meaningless
- Note when comparing runs across different models — scores are not directly comparable
- If no baseline exists, report current results as the new baseline
- Display the harness_version and model for each run in the comparison header
- Use the `v_eval_version_compare` view for aggregate statistics

## Examples

```
/eval-compare                                      # Compare last 2 runs of 'default' task set
/eval-compare --baseline eval-20260401-143022      # Compare current against specific baseline
/eval-compare --last 5                             # Show trend across last 5 runs
/eval-compare --model claude-sonnet-4 --model claude-opus-4  # Cross-model comparison
```

## Related

- **Skills**: [eval-regression](../skills/eval-regression/SKILL.md), [eval-harness](../skills/eval-harness/SKILL.md)
- **Commands**: [/eval](./eval.md)
````

- [ ] **Step 2: Commit**

```bash
git add commands/eval-compare.md
git commit -m "feat: add eval-compare command for regression comparison"
```

---

## Task 9: Register New Files in governance.ts

**Files:**

- Modify: `src/templates/governance.ts`

**Phase 2 dependency:** This task assumes Phase 2 has already added the `BBG_SCRIPTS` array and the `.bbg/scripts/` copy loop to `buildGovernanceManifest`. If Phase 2 is NOT yet implemented, the worker must create `BBG_SCRIPTS` from scratch and add the copy loop — see the "Phase 2 Dependency" note at the end of this plan.

- [ ] **Step 1: Add "eval-regression" to CORE_SKILLS**

In `src/templates/governance.ts`, add `"eval-regression"` to the `CORE_SKILLS` array, after `"eval-harness"`:

**oldString:**

```typescript
  "eval-harness",
  "strategic-compact",
```

**newString:**

```typescript
  "eval-harness",
  "eval-regression",
  "strategic-compact",
```

- [ ] **Step 2: Add "eval-compare" to CORE_COMMANDS**

Add `"eval-compare"` to the `CORE_COMMANDS` array, after `"eval"`:

**oldString:**

```typescript
  "eval",
  "orchestrate",
```

**newString:**

```typescript
  "eval",
  "eval-compare",
  "orchestrate",
```

- [ ] **Step 3: Add "eval-schema.sql" to BBG_SCRIPTS and create EVAL_FILES array**

Locate the `BBG_SCRIPTS` array (established by Phase 2) and add `"eval-schema.sql"`. Then add a new `EVAL_FILES` array immediately after it:

**oldString** (Phase 2's BBG_SCRIPTS — exact content depends on Phase 2):

```typescript
const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql"];
```

**newString:**

```typescript
const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql", "eval-schema.sql"];

const EVAL_FILES = [
  "evals/golden-tasks/manifest.json",
  "evals/golden-tasks/tasks/simple-bugfix.json",
  "evals/golden-tasks/tasks/tdd-feature.json",
  "evals/golden-tasks/tasks/security-review.json",
  "evals/golden-tasks/tasks/refactor-extract.json",
];
```

- [ ] **Step 4: Wire EVAL_FILES into buildGovernanceManifest**

Add a new loop in the `buildGovernanceManifest` function, after the BBG_SCRIPTS loop that Phase 2 added:

```typescript
// --- Eval Golden Tasks ---
for (const evalFile of EVAL_FILES) {
  tasks.push(copyTask(evalFile, evalFile));
}
```

- [ ] **Step 5: Add evalFiles to GOVERNANCE_MANIFEST export**

Add `evalFiles: EVAL_FILES` to the exported `GOVERNANCE_MANIFEST` const. Phase 2 may have already added `bbgScripts` — if so, add `evalFiles` after it. If not, add both:

**oldString** (post-Phase 2, assuming bbgScripts was added):

```typescript
  mcpConfigFiles: MCP_CONFIG_FILES,
  bbgScripts: BBG_SCRIPTS,
} as const;
```

**newString:**

```typescript
  mcpConfigFiles: MCP_CONFIG_FILES,
  bbgScripts: BBG_SCRIPTS,
  evalFiles: EVAL_FILES,
} as const;
```

- [ ] **Step 6: Commit**

```bash
git add src/templates/governance.ts
git commit -m "feat: register eval-benchmark files in governance manifest"
```

---

## Task 10: Update Test Assertions

**Files:**

- Modify: `tests/unit/templates/governance.test.ts`

**CRITICAL:** The exact count numbers below are examples assuming Phase 2 has been completed. The executing worker MUST read the actual current test file to determine the real baseline numbers. Phase 3 adds these incremental changes on top of whatever Phase 2 established:

| Category    | Phase 3 increment | Reason                                 |
| ----------- | ----------------- | -------------------------------------- |
| Skills      | +1                | `eval-regression` added to CORE_SKILLS |
| Commands    | +1                | `eval-compare` added to CORE_COMMANDS  |
| Eval files  | +5                | New category: manifest + 4 task JSONs  |
| BBG scripts | +1                | `eval-schema.sql` added to BBG_SCRIPTS |
| **Total**   | **+8**            |                                        |

- [ ] **Step 1: Read the current test file**

Read `tests/unit/templates/governance.test.ts` to get the actual current assertion values. Do NOT assume the example numbers below are correct.

- [ ] **Step 2: Update the skill count assertion**

Increment the skill task count by 1. Example (if post-Phase 2 count is 40):

**oldString:**

```typescript
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(40);
```

**newString:**

```typescript
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(41);
```

Also add a spot-check:

```typescript
expect(skillTasks.map((t) => t.destination)).toContain("skills/eval-regression/SKILL.md");
```

- [ ] **Step 3: Update the command count assertion**

Increment the command task count by 1. Example (if post-Phase 2 count is 25):

**oldString:**

```typescript
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(25);
```

**newString:**

```typescript
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(26);
```

- [ ] **Step 4: Add eval files assertion block**

After the MCP configs assertion block, add:

```typescript
// Eval golden tasks: 5 (manifest + 4 task files)
const evalTasks = tasks.filter((t) => t.destination.startsWith("evals/"));
expect(evalTasks).toHaveLength(5);
expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/manifest.json");
expect(evalTasks.map((t) => t.destination)).toContain("evals/golden-tasks/tasks/simple-bugfix.json");
```

- [ ] **Step 5: Update BBG scripts assertion**

If Phase 2 added a BBG scripts assertion, increment its count by 1 and add a spot-check:

```typescript
expect(scriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/eval-schema.sql");
```

- [ ] **Step 6: Update all total count assertions**

Increment the total in the minimal config test by 8 (= +1 skill, +1 command, +5 eval files, +1 BBG script).

Increment the TypeScript-specific test total by 8 (same core increase, TS-specific count unchanged).

Increment the Python+TypeScript test total by 8 (same core increase).

- [ ] **Step 7: Run tests to verify**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add tests/unit/templates/governance.test.ts
git commit -m "test: update governance manifest assertions for eval-benchmark files"
```

---

## Task 11: Build and Full Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: tsup compilation succeeds.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: Zero TypeScript errors.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: Zero lint errors.

- [ ] **Step 5: Verify all new files exist**

```bash
ls evals/golden-tasks/manifest.json
ls evals/golden-tasks/tasks/simple-bugfix.json
ls evals/golden-tasks/tasks/tdd-feature.json
ls evals/golden-tasks/tasks/security-review.json
ls evals/golden-tasks/tasks/refactor-extract.json
ls skills/eval-regression/SKILL.md
ls commands/eval-compare.md
```

Expected: All 7 new governance files exist. (The SQL schema file location depends on Phase 2's pattern — verify it exists wherever Phase 2 established.)

- [ ] **Step 6: Verify self-checks pass**

```bash
npm run dev -- doctor --self
```

Expected: All self-checks pass — no missing files, no broken cross-references, no orphaned files.

- [ ] **Step 7: Final commit if any fixes were needed**

Only if previous steps revealed issues:

```bash
git add -A
git commit -m "fix: resolve issues found during eval-benchmark verification"
```

---

## Phase 2 Dependency Notes

This plan assumes Phase 2 (Telemetry/Observability) has been completed and established:

1. **`BBG_SCRIPTS` array** in `governance.ts` containing `["telemetry-init.sql", "telemetry-report.sql"]`
2. **`.bbg/scripts/` copy loop** in `buildGovernanceManifest` that iterates `BBG_SCRIPTS` and creates copyTasks
3. **`bbgScripts` property** in the `GOVERNANCE_MANIFEST` export
4. **Updated test counts** reflecting Phase 2's additions (skill, command, scripts, hook script)

**If Phase 2 is NOT complete when executing this plan**, the worker must:

1. Create the `BBG_SCRIPTS` array with just `["eval-schema.sql"]`
2. Add the `.bbg/scripts/` copy loop to `buildGovernanceManifest`:
   ```typescript
   // --- BBG Scripts ---
   for (const script of BBG_SCRIPTS) {
     tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
   }
   ```
3. Add `bbgScripts: BBG_SCRIPTS` to the `GOVERNANCE_MANIFEST` export
4. Create the SQL schema file under templates: `templates/generic/.bbg/scripts/eval-schema.sql`
5. Adjust all test count numbers based on the actual current values.
   - If creating `BBG_SCRIPTS` from scratch in this fallback path, include all scripts required by your current branch state and compute totals from that concrete baseline (do not assume fixed +8/+9 globally).
