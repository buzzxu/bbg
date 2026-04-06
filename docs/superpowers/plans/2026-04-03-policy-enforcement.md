# Phase 4: Policy Enforcement (强策略执行) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strong policy enforcement with risk classification, approval workflows, permission boundaries, and audit trail as generated governance content deployed to target projects via `bbg init`.

**Architecture:** BBG is a GENERATOR — all new files are governance content templates. This phase creates 7 content files (1 Handlebars template, 6 static), registers them in the governance manifest, and updates test count assertions. The policy configuration is a Handlebars template (`policy.json.hbs`) that renders differently for backend vs. frontend projects. SQL scripts, skill, and command files are static copies. Hook enhancements are documented in the skill but not implemented as actual hook modifications (complex, deferred).

**Tech Stack:** TypeScript (ESM), vitest, Handlebars, SQLite DDL, JSON

**Dependency:** Phase 2 (Telemetry) must be implemented first — it establishes the `BBG_SCRIPTS` array pattern and `templates/generic/.bbg/scripts/` directory in `governance.ts`. If Phase 2 is not yet implemented, execute the Phase 2 plan first.

---

## File Structure

| Action | File                                               | Responsibility                                             |
| ------ | -------------------------------------------------- | ---------------------------------------------------------- |
| Create | `templates/handlebars/.bbg/policy/policy.json.hbs` | Handlebars template for risk-aware policy config           |
| Create | `templates/generic/.bbg/policy/exceptions.json`    | Empty exception records                                    |
| Create | `templates/generic/.bbg/scripts/policy-schema.sql` | 2 tables + 1 view for policy audit trail                   |
| Create | `skills/policy-enforcement/SKILL.md`               | Policy enforcement workflow skill                          |
| Create | `commands/policy-check.md`                         | Slash command: check policy compliance                     |
| Create | `commands/policy-exception.md`                     | Slash command: request/grant policy exceptions             |
| Modify | `src/templates/governance.ts`                      | Register all new templates + add BBG_POLICY_FILES constant |
| Modify | `tests/unit/templates/governance.test.ts`          | Update count assertions for new files                      |

### Count Impact

Phase 4 should be applied on top of the **current** repository state (do not assume fixed baselines such as 97/102). This phase adds:

- **CORE_SKILLS**: +1 (`"policy-enforcement"`)
- **CORE_COMMANDS**: +2 (`"policy-check"`, `"policy-exception"`)
- **BBG_SCRIPTS**: +1 (`"policy-schema.sql"`)
- **BBG_POLICY_FILES**: +2 (`.bbg/policy/policy.json` handlebars + `.bbg/policy/exceptions.json` copy)

**Net increase from current baseline**: +6 tasks in each tested scenario (core / TS / multi-lang).

---

### Task 1: Create policy-schema.sql

**Files:**

- Create: `templates/generic/.bbg/scripts/policy-schema.sql`

- [ ] **Step 1: Create the SQL file**

The `templates/generic/.bbg/scripts/` directory should already exist from Phase 2. If not, create it first: `mkdir -p templates/generic/.bbg/scripts`

Create `templates/generic/.bbg/scripts/policy-schema.sql`:

```sql
-- =============================================================================
-- policy-schema.sql — BBG Policy Enforcement Schema
-- 2 tables + 1 view for policy decision audit trail and exception management.
-- Run: sqlite3 .bbg/telemetry.db < .bbg/scripts/policy-schema.sql
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Policy Decision Audit Trail
-- ---------------------------------------------------------------------------

-- Every policy evaluation is recorded here for audit and effectiveness analysis.
CREATE TABLE IF NOT EXISTS policy_decisions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
  session_id    TEXT,
  operation     TEXT    NOT NULL,
  target        TEXT,
  risk_level    TEXT    NOT NULL,
  action_taken  TEXT    NOT NULL,
  approved      INTEGER,
  exception_id  TEXT,
  reason        TEXT
);

-- ---------------------------------------------------------------------------
-- Policy Exceptions
-- ---------------------------------------------------------------------------

-- Time-limited exceptions to policy rules, granted by humans.
CREATE TABLE IF NOT EXISTS policy_exceptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
  exception_id  TEXT    NOT NULL,
  policy_rule   TEXT    NOT NULL,
  target        TEXT,
  reason        TEXT    NOT NULL,
  granted_by    TEXT,
  expires_at    TEXT,
  used          INTEGER DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Policy Effectiveness Analysis
-- ---------------------------------------------------------------------------

-- Aggregated view for analyzing how well policies are working.
CREATE VIEW IF NOT EXISTS v_policy_effectiveness AS
SELECT
  risk_level,
  action_taken,
  COUNT(*) AS total,
  SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) AS rejected_after_approval,
  SUM(CASE WHEN exception_id IS NOT NULL THEN 1 ELSE 0 END) AS with_exception
FROM policy_decisions
GROUP BY risk_level, action_taken;
```

- [ ] **Step 2: Verify the file exists**

Run: `ls -la templates/generic/.bbg/scripts/policy-schema.sql`
Expected: File exists with non-zero size

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/policy-schema.sql
git commit -m "feat: add policy enforcement SQL schema (Phase 4)"
```

---

### Task 2: Create exceptions.json template

**Files:**

- Create: `templates/generic/.bbg/policy/exceptions.json`

- [ ] **Step 1: Create the directory and file**

Run: `mkdir -p templates/generic/.bbg/policy`

Create `templates/generic/.bbg/policy/exceptions.json`:

```json
{
  "version": "1.0",
  "exceptions": []
}
```

- [ ] **Step 2: Verify the file exists**

Run: `ls -la templates/generic/.bbg/policy/exceptions.json`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/policy/exceptions.json
git commit -m "feat: add policy exceptions.json template (Phase 4)"
```

---

### Task 3: Create policy.json.hbs Handlebars template

**Files:**

- Create: `templates/handlebars/.bbg/policy/policy.json.hbs`

This is the core Handlebars template that renders different policy configurations based on the target project type. It uses `hasBackend` and `hasFrontendWeb` / `hasFrontendPc` / `hasFrontendH5` booleans from `TemplateContext`.

- [ ] **Step 1: Create the directory**

Run: `mkdir -p templates/handlebars/.bbg/policy`

- [ ] **Step 2: Create policy.json.hbs**

Create `templates/handlebars/.bbg/policy/policy.json.hbs`:

```handlebars
{ "version": "2.0", "riskLevels": { "high": { "action": "require-approval" }, "medium": { "action": "warn" }, "low": {
"action": "allow" } }, "protectedPaths": { "patterns": [ "*.env*", "**/credentials/**", "**/secrets/**",
"docker-compose*.yml", "Dockerfile*",
{{#if hasBackend}}
  "**/migrations/**", "**/alembic/**", "**/flyway/**",
{{/if}}
{{#if hasFrontendWeb}}
  "next.config.*", "nuxt.config.*", "public/**",
{{/if}}
{{#if hasFrontendPc}}
  "public/**", "electron.config.*",
{{/if}}
{{#if hasFrontendH5}}
  "public/**",
{{/if}}
".github/workflows/**" ], "riskLevel": "high" }, "sensitiveOperations": { "fileDelete": "medium", "configChange":
"medium", "dependencyAdd": "medium", "dependencyRemove": "high",
{{#if hasBackend}}
  "schemaChange": "high", "migrationChange": "high",
{{/if}}
"cicdChange": "high", "securityConfigChange": "high" }, "blockedCommands": { "patterns": [ "rm -rf /", "git push --force
main", "git push --force master", "DROP DATABASE", "DROP TABLE" ], "action": "block" }, "commandPolicies": {
"quality-gate": { "allowed": true, "requiredApproval": false }, "checkpoint": { "allowed": true, "requiredApproval":
false }, "verify": { "allowed": true, "requiredApproval": false }, "harness-audit": { "allowed": true,
"requiredApproval": false }, "eval-run": { "allowed": true, "requiredApproval": false }, "release": { "allowed": true,
"requiredApproval": true } } }
```

- [ ] **Step 3: Verify the file exists**

Run: `ls -la templates/handlebars/.bbg/policy/policy.json.hbs`
Expected: File exists

- [ ] **Step 4: Commit**

```bash
git add templates/handlebars/.bbg/policy/policy.json.hbs
git commit -m "feat: add policy.json.hbs Handlebars template (Phase 4)"
```

---

### Task 4: Create policy-enforcement SKILL.md

**Files:**

- Create: `skills/policy-enforcement/SKILL.md`

- [ ] **Step 1: Create the directory**

Run: `mkdir -p skills/policy-enforcement`

- [ ] **Step 2: Create SKILL.md**

Create `skills/policy-enforcement/SKILL.md`:

```markdown
---
name: policy-enforcement
category: governance
description: Risk classification, approval workflows, permission boundaries, and audit trail for AI development operations
---

# Policy Enforcement

## Overview

Use this skill when you need to evaluate operations against security and risk policies before execution. Policy enforcement classifies every operation by risk level, applies the appropriate action (allow, warn, require-approval, block), manages time-limited exceptions, and records all decisions for audit.

## Risk Assessment Flow

Every operation goes through this evaluation pipeline:
```

Operation request → Path matching → Operation classification → Risk grading → Policy decision
→ allow: execute directly
→ warn: output warning + execute + record decision
→ require-approval: pause for human confirmation + record decision
→ block: reject + record decision

````

## Workflow

### Step 1: Load Policy Configuration

- Read `.bbg/policy/policy.json` for risk levels, protected paths, sensitive operations, blocked commands, and command policies
- Read `.bbg/policy/exceptions.json` for active exceptions
- Validate both files exist and parse correctly
- If policy files are missing, warn and use default permissive policy

### Step 2: Classify the Operation

Determine the operation type from the action being performed:

| Operation Type         | Trigger                                        |
| ---------------------- | ---------------------------------------------- |
| `fileDelete`           | Removing files from the project                |
| `configChange`         | Modifying configuration files                  |
| `dependencyAdd`        | Adding new packages or dependencies            |
| `dependencyRemove`     | Removing packages or dependencies              |
| `schemaChange`         | Modifying database schemas or migrations       |
| `migrationChange`      | Creating or modifying migration files           |
| `cicdChange`           | Modifying CI/CD pipeline configurations        |
| `securityConfigChange` | Changing authentication, authorization, or secrets |

### Step 3: Evaluate Risk Level

1. **Path matching** — Check if the target file matches any `protectedPaths.patterns` using glob matching
2. **Operation classification** — Look up the operation type in `sensitiveOperations`
3. **Blocked command check** — Match against `blockedCommands.patterns` (exact substring match)
4. **Risk grading** — Take the highest risk level from all matching rules:
   - If path matches `protectedPaths` → use `protectedPaths.riskLevel`
   - If operation matches `sensitiveOperations` → use the configured level
   - If command matches `blockedCommands` → action is `block` (overrides risk level)
   - Multiple matches → highest risk wins (`block > high > medium > low`)

### Step 4: Check for Exceptions

Before applying the policy decision:

1. Check `.bbg/policy/exceptions.json` for an active exception matching the policy rule and target
2. Verify the exception has not expired (`expires_at` is in the future or null)
3. If a valid exception exists, downgrade the action (e.g., `require-approval` → `warn`)
4. Mark the exception as used (`used` counter incremented)

### Step 5: Apply Policy Decision

Based on the risk level, look up the action in `riskLevels`:

| Action              | Behavior                                                        |
| ------------------- | --------------------------------------------------------------- |
| `allow`             | Execute immediately, record in audit log                        |
| `warn`              | Display warning with risk details, execute, record              |
| `require-approval`  | Display risk details, pause for human `yes/no`, record decision |
| `block`             | Reject with explanation, record in audit log, do not execute    |

### Step 6: Record Decision

Write every policy evaluation to the audit trail:

```sql
INSERT INTO policy_decisions (session_id, operation, target, risk_level, action_taken, approved, exception_id, reason)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
````

Record regardless of outcome — allowed, warned, approved, rejected, or blocked operations all get logged.

### Step 7: Analyze Policy Effectiveness

Periodically review the `v_policy_effectiveness` view to identify:

- Policies that are too strict (high rejection rate after approval prompts)
- Policies that are too lenient (operations that should be caught)
- Exception patterns that suggest a rule needs adjustment
- Risk levels that never trigger (dead rules)

## Hook Enhancement Notes

The following hook enhancements integrate policy enforcement at the hook level. These are complex modifications documented here for reference — actual hook file changes should be done carefully in a dedicated effort.

### pre-edit-check.js Enhancements

- Before allowing file edits, check if the target path matches `protectedPaths.patterns`
- If match found, evaluate risk level and apply policy action
- For `require-approval` paths, the hook should output a warning and suggest using `/policy-exception` to get a time-limited bypass

### security-scan.js Enhancements

- Before allowing shell commands, check against `blockedCommands.patterns`
- If match found, block the command and record the attempt
- Check operation type against `sensitiveOperations` for dependency and schema changes

## Rules

- Never skip policy evaluation — even "trivial" operations must be classified
- Record all decisions including allows — the audit trail must be complete
- Exceptions must have an expiry — indefinite exceptions defeat the purpose
- Policy files must be committed to version control — they are governance content
- The `block` action cannot be overridden by exceptions — blocked commands stay blocked
- Risk levels only escalate during evaluation — never downgrade from a higher match

## Anti-patterns

- Disabling policy checks "temporarily" and forgetting to re-enable
- Creating broad exceptions that cover too many operations
- Ignoring the effectiveness view — policies must be tuned over time
- Treating `warn` as `allow` — warnings should be reviewed and acted on
- Hardcoding policy rules instead of reading from `policy.json`

## Checklist

- [ ] Policy files exist and parse correctly (`.bbg/policy/policy.json`, `.bbg/policy/exceptions.json`)
- [ ] SQL schema initialized (`sqlite3 .bbg/telemetry.db < .bbg/scripts/policy-schema.sql`)
- [ ] All operations are classified before execution
- [ ] Risk levels are evaluated correctly (highest match wins)
- [ ] Policy decisions are recorded in the audit trail
- [ ] Exceptions have expiry dates and are tracked
- [ ] Effectiveness view is reviewed periodically
- [ ] Blocked commands cannot be bypassed

## Related

- **Commands**: [/policy-check](../../commands/policy-check.md), [/policy-exception](../../commands/policy-exception.md)
- **Skills**: [security-review](../security-review/SKILL.md), [secrets-management](../secrets-management/SKILL.md)
- **Rules**: [security](../../rules/common/security.md)

````

- [ ] **Step 3: Verify the file exists and has the Related section**

Run: `ls -la skills/policy-enforcement/SKILL.md`
Expected: File exists with non-zero size

Run: `grep "## Related" skills/policy-enforcement/SKILL.md`
Expected: Outputs `## Related`

- [ ] **Step 4: Commit**

```bash
git add skills/policy-enforcement/SKILL.md
git commit -m "feat: add policy-enforcement skill (Phase 4)"
````

---

### Task 5: Create policy-check command

**Files:**

- Create: `commands/policy-check.md`

- [ ] **Step 1: Create the command file**

Create `commands/policy-check.md`:

```markdown
# /policy-check

## Description

Check current operations and files against the project's policy configuration. Reports risk levels, protected path violations, and blocked command patterns. Use this to verify policy compliance before committing changes.

## Usage
```

/policy-check
/policy-check --path src/auth/config.ts
/policy-check --operation schemaChange
/policy-check --all

```

## Process
1. **Load policy** — Read `.bbg/policy/policy.json` and validate structure
2. **Load exceptions** — Read `.bbg/policy/exceptions.json` for active exceptions
3. **Identify targets** — Determine which files or operations to check:
   - `--path`: Check a specific file path against protected patterns
   - `--operation`: Check a specific operation type against sensitive operations
   - `--all`: Scan all staged/modified files against all policy rules
   - No flags: Check recently modified files
4. **Evaluate risk** — For each target, run the full risk assessment:
   - Path matching against `protectedPaths.patterns`
   - Operation classification against `sensitiveOperations`
   - Blocked command pattern matching
5. **Check exceptions** — Note any active exceptions that apply
6. **Report** — Display results with risk levels and required actions

## Output
```

Policy Check Results:
[HIGH] src/migrations/001_add_users.sql — protectedPaths match (**/migrations/**)
Action: require-approval
[MEDIUM] package.json — dependencyAdd detected
Action: warn
[BLOCK] "DROP TABLE users" found in script.sql
Action: block — cannot proceed

Active Exceptions:
EXC-001: migrations/\* — granted by @lead, expires 2026-04-10

Summary: 1 high, 1 medium, 1 blocked — resolve blocked items before proceeding

```

## Rules
- Always load the latest policy.json — never cache between invocations
- Report ALL matches, not just the highest risk
- Show active exceptions that would apply to flagged items
- Exit with non-zero status if any `block` actions are found
- Include the specific pattern that matched for each result

## Examples
```

/policy-check # Check recent changes
/policy-check --path .env.production # Check specific file
/policy-check --operation schemaChange # Check operation type
/policy-check --all # Full policy audit

```

## Related

- **Skills**: [policy-enforcement](../skills/policy-enforcement/SKILL.md), [security-review](../skills/security-review/SKILL.md)
- **Commands**: [/policy-exception](./policy-exception.md), [/security-scan](./security-scan.md)
```

- [ ] **Step 2: Verify the file**

Run: `grep "## Related" commands/policy-check.md`
Expected: Outputs `## Related`

- [ ] **Step 3: Commit**

```bash
git add commands/policy-check.md
git commit -m "feat: add policy-check slash command (Phase 4)"
```

---

### Task 6: Create policy-exception command

**Files:**

- Create: `commands/policy-exception.md`

- [ ] **Step 1: Create the command file**

Create `commands/policy-exception.md`:

```markdown
# /policy-exception

## Description

Request or grant a time-limited exception to a policy rule. Exceptions allow temporary bypasses for specific operations on specific targets, with mandatory expiry dates and audit trail. Use when legitimate work is blocked by a policy rule.

## Usage
```

/policy-exception request --rule protectedPaths --target "src/migrations/\*\*" --reason "Sprint 12 schema migration"
/policy-exception grant --id EXC-001 --expires "2026-04-10" --granted-by "@tech-lead"
/policy-exception list
/policy-exception revoke --id EXC-001

```

## Process

### Requesting an Exception
1. **Identify the rule** — Which policy rule needs an exception (`protectedPaths`, `sensitiveOperations`, `commandPolicies`)
2. **Specify the target** — Exact file path or glob pattern the exception covers
3. **Provide reason** — Why this exception is needed (mandatory, recorded in audit trail)
4. **Generate exception ID** — Create a unique `EXC-XXX` identifier
5. **Record** — Add to `.bbg/policy/exceptions.json` with `used: 0` and no expiry (pending grant)

### Granting an Exception
1. **Verify pending exception** — Look up the exception by ID
2. **Set expiry** — Exceptions MUST have an expiry date (no indefinite exceptions)
3. **Record grantor** — Who approved this exception
4. **Activate** — Update the exception record with `granted_by` and `expires_at`
5. **Audit** — Record the grant in the policy_exceptions SQLite table

### Listing Exceptions
1. **Read exceptions.json** — Show all active, pending, and expired exceptions
2. **Show usage** — How many times each exception has been used
3. **Flag expired** — Highlight any exceptions past their expiry date

### Revoking an Exception
1. **Find by ID** — Look up the exception
2. **Remove from active list** — Move to revoked status
3. **Record** — Audit the revocation

## Output
```

Exception Requested:
ID: EXC-003
Rule: protectedPaths
Target: src/migrations/\*\*
Reason: Sprint 12 schema migration
Status: PENDING — needs grant with /policy-exception grant --id EXC-003

Active Exceptions:
EXC-001 protectedPaths src/auth/\* expires 2026-04-10 used 3x granted by @lead
EXC-003 protectedPaths src/migrations/\*\* PENDING — not yet granted

```

## Rules
- Every exception MUST have a reason — no blank reasons allowed
- Granted exceptions MUST have an expiry date — no indefinite bypasses
- `block`-level actions CANNOT have exceptions — blocked commands stay blocked
- Exception IDs must be unique and sequential within the project
- All exception lifecycle events are recorded in the SQLite audit table
- Expired exceptions are kept in the file for audit history (not deleted)

## Examples
```

/policy-exception request --rule protectedPaths --target "_.env_" --reason "Adding staging env config"
/policy-exception grant --id EXC-004 --expires "2026-04-15" --granted-by "@security-lead"
/policy-exception list # Show all exceptions
/policy-exception revoke --id EXC-004 # Revoke before expiry

```

## Related

- **Skills**: [policy-enforcement](../skills/policy-enforcement/SKILL.md)
- **Commands**: [/policy-check](./policy-check.md), [/security-scan](./security-scan.md)
```

- [ ] **Step 2: Verify the file**

Run: `grep "## Related" commands/policy-exception.md`
Expected: Outputs `## Related`

- [ ] **Step 3: Commit**

```bash
git add commands/policy-exception.md
git commit -m "feat: add policy-exception slash command (Phase 4)"
```

---

### Task 7: Write failing governance manifest test (TDD red)

**Files:**

- Modify: `tests/unit/templates/governance.test.ts`

This task updates the count assertions FIRST so they fail, then Task 8 registers the files to make them pass.

**Pre-condition:** Phase 2 (Telemetry) pattern is already in place (`BBG_SCRIPTS`, `.bbg/scripts/` loop, and related assertions). Do **not** assume fixed count numbers.

Phase 4 adds 6 tasks on top of whatever counts currently exist:

- 1 new skill (`policy-enforcement`) in CORE_SKILLS
- 2 new commands (`policy-check`, `policy-exception`) in CORE_COMMANDS
- 1 new script (`policy-schema.sql`) in BBG_SCRIPTS
- 2 new policy files (1 handlebars `.bbg/policy/policy.json`, 1 copy `.bbg/policy/exceptions.json`) in new BBG_POLICY_FILES

Count deltas:

- Core total: +6
- TypeScript total: +6
- Multi-language total: +6

- [ ] **Step 1: Update count assertions in the test file**

In `tests/unit/templates/governance.test.ts`, find the first test block's skill count assertion and total. The comments and numbers will reflect Phase 2's state.

Find the skills count assertion and increment it by **+1**:

```typescript
// Core + operations skills: 21 + 18 = 39
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(39);
```

Replace with (example):

```typescript
// Core + operations skills: 22 + 18 = 40 (Phase 4 added policy-enforcement)
const skillTasks = tasks.filter((t) => t.destination.startsWith("skills/"));
expect(skillTasks).toHaveLength(40);
expect(skillTasks.map((t) => t.destination)).toContain("skills/policy-enforcement/SKILL.md");
```

Find the commands count assertion and increment it by **+2**:

```typescript
// Core commands: 25
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(25);
```

Replace with (example):

```typescript
// Core commands: 27 (Phase 4 added policy-check, policy-exception)
const commandTasks = tasks.filter((t) => t.destination.startsWith("commands/"));
expect(commandTasks).toHaveLength(27);
expect(commandTasks.map((t) => t.destination)).toContain("commands/policy-check.md");
expect(commandTasks.map((t) => t.destination)).toContain("commands/policy-exception.md");
```

Find the BBG scripts count assertion and increment it by **+1**:

```typescript
const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/scripts/"));
expect(bbgScriptTasks).toHaveLength(2);
```

Replace with:

```typescript
const bbgScriptTasks = tasks.filter((t) => t.destination.startsWith(".bbg/scripts/"));
// Increment previous BBG scripts assertion by +1 (example: 2 -> 3)
expect(bbgScriptTasks.map((t) => t.destination)).toContain(".bbg/scripts/policy-schema.sql");
```

After the BBG scripts assertions, add new policy file assertions:

```typescript
// Policy files: 2 (.bbg/policy/policy.json rendered via handlebars, .bbg/policy/exceptions.json copied)
const policyTasks = tasks.filter((t) => t.destination.startsWith(".bbg/policy/"));
expect(policyTasks).toHaveLength(2);
expect(policyTasks.map((t) => t.destination)).toContain(".bbg/policy/policy.json");
expect(policyTasks.map((t) => t.destination)).toContain(".bbg/policy/exceptions.json");
// policy.json is rendered via handlebars
const policyJsonTask = policyTasks.find((t) => t.destination === ".bbg/policy/policy.json");
expect(policyJsonTask!.mode).toBe("handlebars");
// exceptions.json is a static copy
const exceptionsTask = policyTasks.find((t) => t.destination === ".bbg/policy/exceptions.json");
expect(exceptionsTask!.mode).toBe("copy");
```

Find each total assertion and increment it by **+6**:

- Minimal/core test total: `currentCoreTotal + 6`
- TypeScript test total: `currentTypeScriptTotal + 6`
- TS+Python test total: `currentTsPythonTotal + 6`

If needed, use one explicit arithmetic example based on the value you actually read in the file (e.g., `102 -> 108`).

- [ ] **Step 2: Run tests to verify they FAIL (TDD red)**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: FAIL — counts don't match because governance.ts hasn't been updated yet

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/unit/templates/governance.test.ts
git commit -m "test: update governance manifest counts for policy enforcement (Phase 4, red)"
```

---

### Task 8: Register policy templates in governance manifest (TDD green)

**Files:**

- Modify: `src/templates/governance.ts`

This task makes the failing tests from Task 7 pass by registering all Phase 4 content in the governance manifest.

- [ ] **Step 1: Add "policy-enforcement" to CORE_SKILLS**

In `src/templates/governance.ts`, find the CORE_SKILLS array. Add `"policy-enforcement"` at the end, before the closing bracket. The array will already contain `"mcp-integration"` as the last entry (or `"telemetry-dashboard"` if Phase 2 appended there — add after whatever is last):

Find:

```typescript
  "mcp-integration",
];
```

in CORE_SKILLS and replace with:

```typescript
  "mcp-integration",
  "policy-enforcement",
];
```

- [ ] **Step 2: Add "policy-check" and "policy-exception" to CORE_COMMANDS**

Find the end of CORE_COMMANDS. It will contain `"sync"` as the last entry (or `"telemetry-report"` if Phase 2 appended there). Add the two new commands:

Find the last entry before `];` in CORE_COMMANDS and add:

```typescript
  "policy-check",
  "policy-exception",
```

before the closing `];`.

- [ ] **Step 3: Add "policy-schema.sql" to BBG_SCRIPTS**

Find the BBG_SCRIPTS array (established by Phase 2, contains `"telemetry-init.sql"` and `"telemetry-report.sql"`):

```typescript
const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql"];
```

Replace with:

```typescript
const BBG_SCRIPTS = ["telemetry-init.sql", "telemetry-report.sql", "policy-schema.sql"];
```

- [ ] **Step 4: Add BBG_POLICY_FILES constant and handlebars registration**

After the `BBG_SCRIPTS` constant and before `const CONTEXT_HBS_FILES`, add:

```typescript
const BBG_POLICY_FILES = {
  handlebars: ["policy.json"],
  generic: ["exceptions.json"],
};
```

- [ ] **Step 5: Add policy file registration in buildGovernanceManifest**

In the `buildGovernanceManifest` function, find the BBG Scripts section (added by Phase 2):

```typescript
// --- BBG Scripts ---
for (const script of BBG_SCRIPTS) {
  tasks.push(copyTask(`generic/.bbg/scripts/${script}`, `.bbg/scripts/${script}`));
}
```

Add after it, before the `return` statement:

```typescript
// --- Policy Files ---
for (const policyFile of BBG_POLICY_FILES.handlebars) {
  tasks.push(handlebarsTask(`handlebars/.bbg/policy/${policyFile}.hbs`, `.bbg/policy/${policyFile}`));
}
for (const policyFile of BBG_POLICY_FILES.generic) {
  tasks.push(copyTask(`generic/.bbg/policy/${policyFile}`, `.bbg/policy/${policyFile}`));
}
```

- [ ] **Step 6: Export BBG_POLICY_FILES in GOVERNANCE_MANIFEST**

Find the GOVERNANCE_MANIFEST export and add `bbgPolicyFiles` after `bbgScripts`:

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
  bbgScripts: BBG_SCRIPTS,
  bbgPolicyFiles: BBG_POLICY_FILES,
  contextHbsFiles: CONTEXT_HBS_FILES,
  mcpConfigFiles: MCP_CONFIG_FILES,
} as const;
```

- [ ] **Step 7: Run tests to verify they PASS (TDD green)**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: ALL PASS — counts match the incremented assertions.

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 9: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: Zero TypeScript errors

- [ ] **Step 10: Commit**

```bash
git add src/templates/governance.ts
git commit -m "feat: register policy enforcement templates in manifest (Phase 4, green)"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: Zero TypeScript errors

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: Zero lint errors (or only pre-existing warnings)

- [ ] **Step 5: Verify all new files exist**

Run:

```bash
ls -la templates/generic/.bbg/scripts/policy-schema.sql
ls -la templates/generic/.bbg/policy/exceptions.json
ls -la templates/handlebars/.bbg/policy/policy.json.hbs
ls -la skills/policy-enforcement/SKILL.md
ls -la commands/policy-check.md
ls -la commands/policy-exception.md
```

Expected: All 6 files exist with non-zero size

- [ ] **Step 6: Verify cross-reference links are valid**

Run: `npx vitest run tests/unit/templates/governance.crossref.test.ts`
Expected: All tests pass — the `## Related` sections in new files have valid links

- [ ] **Step 7: Final commit (if any lint/format fixes needed)**

```bash
git add -A
git commit -m "chore: Phase 4 policy-enforcement complete"
```

---

## Summary

| Metric                           | Count                                                   |
| -------------------------------- | ------------------------------------------------------- |
| New template files               | 3 (policy-schema.sql, exceptions.json, policy.json.hbs) |
| New governance files             | 3 (1 skill, 2 commands)                                 |
| Modified source files            | 1 (`governance.ts`)                                     |
| Modified test files              | 1 (`governance.test.ts`)                                |
| Governance manifest count impact | +6 tasks from prior baseline                            |
| New SQLite tables                | 2 (policy_decisions, policy_exceptions)                 |
| New SQLite views                 | 1 (v_policy_effectiveness)                              |
| Handlebars templates             | 1 (policy.json.hbs with backend/frontend conditionals)  |
| Estimated total time             | 30-40 minutes                                           |
