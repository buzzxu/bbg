# Phase 8: Organization-Level Governance (Reserved) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reserved organization-level governance schemas (JSON Schemas, SQL tables, config extension) that define the future org-level policy architecture without implementing any runtime functionality.

**Architecture:** BBG is a GENERATOR — all new files are governance content templates that BBG copies to target projects via `bbg init`. This phase creates 5 template files under `templates/generic/`, registers them in the governance manifest, extends `BbgConfig` with an optional `organization` field, and updates test count assertions. No runtime code is implemented — these are placeholder schemas for future phases.

**Tech Stack:** TypeScript (ESM), vitest, JSON Schema draft-07, SQL (SQLite DDL)

---

## File Structure

| Action | File                                                 | Responsibility                                                        |
| ------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
| Create | `templates/generic/.bbg/org/README.md`               | Explains org-level governance is reserved, not yet functional         |
| Create | `templates/generic/.bbg/org/org-policy-schema.json`  | JSON Schema for organization-level policy document                    |
| Create | `templates/generic/.bbg/org/org-report-schema.json`  | JSON Schema for cross-repo report data format                         |
| Create | `templates/generic/.bbg/org/org-config.example.json` | Example org config (clearly non-functional)                           |
| Create | `templates/generic/.bbg/scripts/org-schema.sql`      | 2 reserved SQLite tables for org policy sync and report snapshots     |
| Modify | `src/config/schema.ts`                               | Add optional `organization` field to `BbgConfig`                      |
| Modify | `src/templates/governance.ts`                        | Register 5 new org template files in manifest                         |
| Modify | `tests/unit/templates/governance.test.ts`            | Update count assertions incrementally (+5 in each tested scenario)    |
| Modify | `src/constants.ts`                                   | _Removed from this phase_ (telemetry gitignore remains Phase 2-owned) |

---

### Task 1: Create org-level README template

**Files:**

- Create: `templates/generic/.bbg/org/README.md`

- [ ] **Step 1: Create the directory and README file**

Create `templates/generic/.bbg/org/README.md` with the following content:

```markdown
# Organization-Level Governance (Reserved)

> **Status: RESERVED — Not yet functional**
>
> This directory contains schema definitions for organization-level governance.
> These files define the _future_ data structures for cross-repo policy management
> and reporting. They are deployed by `bbg init` but have no runtime effect.

## Purpose

When fully implemented, organization-level governance will enable:

- **Centralized Policy Management** — Define security policies, coding standards,
  and workflow rules at the organization level, with automatic propagation to all
  member projects.
- **Cross-Repo Reporting** — Aggregate evaluation results, telemetry metrics, and
  compliance data across all projects in an organization.
- **Team-Level Overrides** — Allow teams within an organization to customize policies
  within the boundaries set by organization-level rules.

## Policy Merge Protocol

When organization-level governance is active, policies merge with the following
priority (highest to lowest):

1. **Project-level** `policy.json` explicit overrides
2. **Team-level** `team_overrides`
3. **Organization-level** `base_policy`
4. **BBG default** policy

### Merge Rules

| Field                 | Strategy                                            |
| --------------------- | --------------------------------------------------- |
| `blockedCommands`     | Union — org blacklist cannot be removed by projects |
| `protectedPaths`      | Union — projects can only add more restrictions     |
| `sensitiveOperations` | Take the highest risk level                         |
| `commandPolicies`     | `requiredApproval: true` cannot be downgraded       |

## Files in This Directory

| File                      | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `org-policy-schema.json`  | JSON Schema for organization-level policy docs |
| `org-report-schema.json`  | JSON Schema for cross-repo report data format  |
| `org-config.example.json` | Example org configuration (non-functional)     |

## Related

- `.bbg/scripts/org-schema.sql` — Reserved SQLite tables for org data
- `.bbg/config.json` → `organization` field (optional, reserved)
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la templates/generic/.bbg/org/README.md`
Expected: File exists with non-zero size

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/org/README.md
git commit -m "feat: add org-level governance README template (Phase 8)"
```

---

### Task 2: Create org-policy-schema.json template

**Files:**

- Create: `templates/generic/.bbg/org/org-policy-schema.json`

- [ ] **Step 1: Create the JSON Schema file**

Create `templates/generic/.bbg/org/org-policy-schema.json` with the following content:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BBG Organization Policy",
  "description": "Schema for organization-level policy documents. RESERVED — not yet enforced at runtime. Defines the structure for centralized policy management across all projects in an organization.",
  "type": "object",
  "required": ["version", "orgId", "basePolicies"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version for forward compatibility",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "examples": ["1.0.0"]
    },
    "orgId": {
      "type": "string",
      "description": "Unique identifier for the organization",
      "minLength": 1,
      "examples": ["acme-corp"]
    },
    "basePolicies": {
      "type": "object",
      "description": "Organization-wide base policies. These are the lowest-priority defaults that all projects inherit. Projects and teams can override according to merge rules.",
      "properties": {
        "blockedCommands": {
          "type": "array",
          "description": "Shell commands that are blocked organization-wide. Merge strategy: UNION — project-level policies cannot remove items from this list, only add more.",
          "items": {
            "type": "string"
          },
          "uniqueItems": true,
          "default": [],
          "examples": [["rm -rf /", "DROP DATABASE", "FORMAT"]]
        },
        "protectedPaths": {
          "type": "array",
          "description": "File paths that require elevated review. Merge strategy: UNION — projects can only add more restrictions, never remove org-level protections.",
          "items": {
            "type": "string"
          },
          "uniqueItems": true,
          "default": [],
          "examples": [[".env", "src/auth/", "infrastructure/"]]
        },
        "sensitiveOperations": {
          "type": "array",
          "description": "Operations with assigned risk levels. Merge strategy: when the same operation exists at multiple levels, the HIGHEST risk level wins.",
          "items": {
            "type": "object",
            "required": ["operation", "riskLevel"],
            "properties": {
              "operation": {
                "type": "string",
                "description": "Name of the sensitive operation",
                "examples": ["database-migration", "auth-config-change"]
              },
              "riskLevel": {
                "type": "string",
                "enum": ["low", "medium", "high", "critical"],
                "description": "Risk classification for this operation"
              },
              "requiresApproval": {
                "type": "boolean",
                "description": "Whether this operation requires human approval",
                "default": false
              },
              "description": {
                "type": "string",
                "description": "Human-readable explanation of why this is sensitive"
              }
            },
            "additionalProperties": false
          },
          "default": []
        },
        "commandPolicies": {
          "type": "array",
          "description": "Policies for specific BBG commands. Merge rule: requiredApproval=true CANNOT be downgraded to false by project-level overrides.",
          "items": {
            "type": "object",
            "required": ["command"],
            "properties": {
              "command": {
                "type": "string",
                "description": "The BBG command name this policy applies to",
                "examples": ["release", "deploy", "security-scan"]
              },
              "requiredApproval": {
                "type": "boolean",
                "description": "If true, this command requires human approval. Once set to true at org level, project-level overrides cannot set it to false.",
                "default": false
              },
              "allowedRoles": {
                "type": "array",
                "description": "Roles permitted to execute this command",
                "items": {
                  "type": "string"
                },
                "uniqueItems": true
              },
              "maxFrequency": {
                "type": "string",
                "description": "Maximum execution frequency (e.g., '1/hour', '10/day')"
              }
            },
            "additionalProperties": false
          },
          "default": []
        }
      },
      "additionalProperties": false
    },
    "teams": {
      "type": "array",
      "description": "Team-level policy overrides. Each team can customize policies within the boundaries set by organization-level merge rules.",
      "items": {
        "type": "object",
        "required": ["teamId"],
        "properties": {
          "teamId": {
            "type": "string",
            "description": "Unique identifier for the team within the organization",
            "minLength": 1,
            "examples": ["platform-team", "frontend-squad"]
          },
          "teamName": {
            "type": "string",
            "description": "Human-readable team name"
          },
          "overrides": {
            "type": "object",
            "description": "Team-level policy overrides. Same structure as basePolicies. Subject to merge rules — cannot weaken org-level protections.",
            "properties": {
              "blockedCommands": {
                "type": "array",
                "description": "Additional blocked commands for this team (added to org list via union)",
                "items": { "type": "string" },
                "uniqueItems": true
              },
              "protectedPaths": {
                "type": "array",
                "description": "Additional protected paths for this team (added to org list via union)",
                "items": { "type": "string" },
                "uniqueItems": true
              },
              "sensitiveOperations": {
                "type": "array",
                "description": "Team-level sensitive operations (highest risk level wins on conflict)",
                "items": {
                  "type": "object",
                  "required": ["operation", "riskLevel"],
                  "properties": {
                    "operation": { "type": "string" },
                    "riskLevel": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
                    "requiresApproval": { "type": "boolean" },
                    "description": { "type": "string" }
                  },
                  "additionalProperties": false
                }
              },
              "commandPolicies": {
                "type": "array",
                "description": "Team-level command policies (requiredApproval: true cannot be downgraded)",
                "items": {
                  "type": "object",
                  "required": ["command"],
                  "properties": {
                    "command": { "type": "string" },
                    "requiredApproval": { "type": "boolean" },
                    "allowedRoles": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
                    "maxFrequency": { "type": "string" }
                  },
                  "additionalProperties": false
                }
              }
            },
            "additionalProperties": false
          },
          "projects": {
            "type": "array",
            "description": "Project IDs that belong to this team",
            "items": { "type": "string" },
            "uniqueItems": true
          }
        },
        "additionalProperties": false
      },
      "default": []
    },
    "mergeStrategy": {
      "type": "object",
      "description": "Documents the merge strategy for reference. These rules are hardcoded in BBG — this section serves as documentation, not configuration.",
      "properties": {
        "blockedCommands": {
          "type": "string",
          "const": "union",
          "description": "Org blacklist cannot be removed by project-level overrides"
        },
        "protectedPaths": {
          "type": "string",
          "const": "union",
          "description": "Projects can only add more path restrictions"
        },
        "sensitiveOperations": {
          "type": "string",
          "const": "highest-risk-level",
          "description": "When same operation exists at multiple levels, highest risk level wins"
        },
        "commandPolicies": {
          "type": "string",
          "const": "no-downgrade-approval",
          "description": "requiredApproval=true at org level cannot be set to false at project level"
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('templates/generic/.bbg/org/org-policy-schema.json', 'utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/org/org-policy-schema.json
git commit -m "feat: add org-policy-schema.json template (Phase 8)"
```

---

### Task 3: Create org-report-schema.json template

**Files:**

- Create: `templates/generic/.bbg/org/org-report-schema.json`

- [ ] **Step 1: Create the JSON Schema file**

Create `templates/generic/.bbg/org/org-report-schema.json` with the following content:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BBG Organization Report",
  "description": "Schema for cross-repo report data format. RESERVED — not yet generated at runtime. Defines the structure for aggregating evaluation results, telemetry metrics, and compliance data across all projects in an organization.",
  "type": "object",
  "required": ["version", "orgId", "reports"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version for forward compatibility",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "examples": ["1.0.0"]
    },
    "orgId": {
      "type": "string",
      "description": "Organization identifier this report belongs to",
      "minLength": 1
    },
    "generatedAt": {
      "type": "string",
      "description": "ISO 8601 timestamp when this report was generated",
      "format": "date-time"
    },
    "reports": {
      "type": "array",
      "description": "Array of individual project report snapshots",
      "items": {
        "type": "object",
        "required": ["projectId", "reportType", "timestamp", "data"],
        "properties": {
          "projectId": {
            "type": "string",
            "description": "Unique identifier for the project within the organization",
            "minLength": 1,
            "examples": ["web-frontend", "api-gateway"]
          },
          "reportType": {
            "type": "string",
            "description": "Category of report data",
            "enum": ["evaluation", "telemetry", "compliance", "security-audit", "test-coverage", "policy-adherence"]
          },
          "timestamp": {
            "type": "string",
            "description": "ISO 8601 timestamp for when this report snapshot was captured",
            "format": "date-time"
          },
          "metrics": {
            "type": "object",
            "description": "Quantitative metrics for this report snapshot",
            "properties": {
              "score": {
                "type": "number",
                "description": "Overall score (0-100)",
                "minimum": 0,
                "maximum": 100
              },
              "grade": {
                "type": "string",
                "description": "Letter grade derived from score",
                "enum": ["A", "B", "C", "D", "F"]
              },
              "itemCount": {
                "type": "integer",
                "description": "Number of items evaluated/measured",
                "minimum": 0
              },
              "passCount": {
                "type": "integer",
                "description": "Number of items that passed",
                "minimum": 0
              },
              "failCount": {
                "type": "integer",
                "description": "Number of items that failed",
                "minimum": 0
              },
              "warningCount": {
                "type": "integer",
                "description": "Number of items with warnings",
                "minimum": 0
              }
            },
            "additionalProperties": true
          },
          "data": {
            "type": "object",
            "description": "Freeform report data specific to the report type. Structure varies by reportType.",
            "additionalProperties": true
          },
          "tags": {
            "type": "array",
            "description": "Optional tags for filtering and categorization",
            "items": { "type": "string" },
            "uniqueItems": true
          }
        },
        "additionalProperties": false
      }
    },
    "summary": {
      "type": "object",
      "description": "Aggregated summary across all project reports",
      "properties": {
        "totalProjects": {
          "type": "integer",
          "description": "Total number of projects included",
          "minimum": 0
        },
        "averageScore": {
          "type": "number",
          "description": "Average score across all projects",
          "minimum": 0,
          "maximum": 100
        },
        "complianceRate": {
          "type": "number",
          "description": "Percentage of projects meeting compliance thresholds (0-100)",
          "minimum": 0,
          "maximum": 100
        }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('templates/generic/.bbg/org/org-report-schema.json', 'utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/org/org-report-schema.json
git commit -m "feat: add org-report-schema.json template (Phase 8)"
```

---

### Task 4: Create org-config.example.json template

**Files:**

- Create: `templates/generic/.bbg/org/org-config.example.json`

- [ ] **Step 1: Create the example config file**

Create `templates/generic/.bbg/org/org-config.example.json` with the following content:

```json
{
  "_comment": "EXAMPLE ONLY — This file is non-functional. It demonstrates the planned organization-level configuration structure. See org-policy-schema.json for the full schema definition.",
  "version": "1.0.0",
  "orgId": "example-org",
  "basePolicies": {
    "blockedCommands": ["rm -rf /", "DROP DATABASE", "FORMAT C:"],
    "protectedPaths": [".env", ".env.*", "src/auth/", "src/security/", "infrastructure/", "deploy/"],
    "sensitiveOperations": [
      {
        "operation": "database-migration",
        "riskLevel": "high",
        "requiresApproval": true,
        "description": "Schema changes that could affect production data"
      },
      {
        "operation": "auth-config-change",
        "riskLevel": "critical",
        "requiresApproval": true,
        "description": "Modifications to authentication or authorization logic"
      },
      {
        "operation": "dependency-upgrade-major",
        "riskLevel": "medium",
        "requiresApproval": false,
        "description": "Major version upgrades of dependencies"
      }
    ],
    "commandPolicies": [
      {
        "command": "release",
        "requiredApproval": true,
        "allowedRoles": ["tech-lead", "senior-engineer"],
        "maxFrequency": "2/day"
      },
      {
        "command": "security-scan",
        "requiredApproval": false,
        "maxFrequency": "10/day"
      }
    ]
  },
  "teams": [
    {
      "teamId": "platform-team",
      "teamName": "Platform Engineering",
      "overrides": {
        "protectedPaths": ["src/platform/core/", "src/shared/infrastructure/"],
        "sensitiveOperations": [
          {
            "operation": "infrastructure-change",
            "riskLevel": "high",
            "requiresApproval": true,
            "description": "Changes to shared infrastructure components"
          }
        ]
      },
      "projects": ["api-gateway", "service-mesh", "shared-libs"]
    },
    {
      "teamId": "frontend-squad",
      "teamName": "Frontend Squad",
      "overrides": {
        "protectedPaths": ["src/components/design-system/"]
      },
      "projects": ["web-app", "mobile-app", "admin-dashboard"]
    }
  ],
  "mergeStrategy": {
    "blockedCommands": "union",
    "protectedPaths": "union",
    "sensitiveOperations": "highest-risk-level",
    "commandPolicies": "no-downgrade-approval"
  }
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('templates/generic/.bbg/org/org-config.example.json', 'utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/org/org-config.example.json
git commit -m "feat: add org-config.example.json template (Phase 8)"
```

---

### Task 5: Create org-schema.sql template

**Files:**

- Create: `templates/generic/.bbg/scripts/org-schema.sql`

- [ ] **Step 1: Create the SQL schema file**

Create `templates/generic/.bbg/scripts/org-schema.sql` with the following content:

```sql
-- ============================================================
-- BBG Organization-Level Governance — Reserved SQLite Tables
-- ============================================================
-- Status: RESERVED — These tables are created for forward
-- compatibility but are not populated by any runtime code yet.
--
-- These tables will be used when organization-level governance
-- is fully implemented to track policy synchronization events
-- and aggregate cross-repo report snapshots.
-- ============================================================

-- Organization-level policy sync records (reserved)
CREATE TABLE IF NOT EXISTS org_policy_syncs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
  org_id      TEXT    NOT NULL,
  policy_hash TEXT    NOT NULL,
  source      TEXT,
  status      TEXT    NOT NULL,
  details     TEXT
);

-- Organization-level report snapshots (reserved)
CREATE TABLE IF NOT EXISTS org_report_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
  org_id      TEXT    NOT NULL,
  project_id  TEXT    NOT NULL,
  report_type TEXT    NOT NULL,
  data        TEXT    NOT NULL
);
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la templates/generic/.bbg/scripts/org-schema.sql`
Expected: File exists with non-zero size

- [ ] **Step 3: Commit**

```bash
git add templates/generic/.bbg/scripts/org-schema.sql
git commit -m "feat: add org-schema.sql reserved tables template (Phase 8)"
```

---

### Task 6: Extend BbgConfig with organization field

**Files:**

- Modify: `src/config/schema.ts:27-46`
- Modify: `tests/unit/templates/governance.test.ts:6-26` (helper needs no changes — `...overrides` covers the new optional field)

- [ ] **Step 1: Add OrganizationConfig interface and update BbgConfig**

In `src/config/schema.ts`, add the `OrganizationConfig` interface after `PluginConfig` (line 25), and add the `organization` field to `BbgConfig`.

Find this block at the end of the file:

```typescript
export interface PluginConfig {
  enabled: boolean;
  directories?: string[];
}

export interface BbgConfig {
  version: string;
  projectName: string;
  projectDescription: string;
  createdAt: string;
  updatedAt: string;
  repos: RepoEntry[];
  governance: {
    riskThresholds: {
      high: { grade: string; minScore: number };
      medium: { grade: string; minScore: number };
      low: { grade: string; minScore: number };
    };
    enableRedTeam: boolean;
    enableCrossAudit: boolean;
  };
  context: Record<string, unknown>;
  runtime?: RuntimeConfig;
  plugins?: PluginConfig;
}
```

Replace with:

```typescript
export interface PluginConfig {
  enabled: boolean;
  directories?: string[];
}

export interface OrganizationConfig {
  orgId?: string;
  teamId?: string;
  policySource?: string;
}

export interface BbgConfig {
  version: string;
  projectName: string;
  projectDescription: string;
  createdAt: string;
  updatedAt: string;
  repos: RepoEntry[];
  governance: {
    riskThresholds: {
      high: { grade: string; minScore: number };
      medium: { grade: string; minScore: number };
      low: { grade: string; minScore: number };
    };
    enableRedTeam: boolean;
    enableCrossAudit: boolean;
  };
  context: Record<string, unknown>;
  runtime?: RuntimeConfig;
  plugins?: PluginConfig;
  organization?: OrganizationConfig;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (organization field is optional, so no existing code breaks)

- [ ] **Step 3: Run existing tests to confirm no regressions**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: All 5 tests pass (no changes to counts yet)

- [ ] **Step 4: Commit**

```bash
git add src/config/schema.ts
git commit -m "feat: add optional organization field to BbgConfig (Phase 8)"
```

---

### Task 7: Write failing governance manifest test

**Files:**

- Modify: `tests/unit/templates/governance.test.ts`

This task updates the count assertions FIRST (TDD red step) so they fail, then Task 8 registers the files to make them pass.

- [ ] **Step 1: Update count assertions in the test file**

The 5 new org files will be registered in the governance manifest as generic copy tasks. They don't match any existing filter (not agents, skills, rules, commands, hooks, contexts, or mcp-configs), so we need to add assertions for the new org-governance category AND update the totals.

In `tests/unit/templates/governance.test.ts`, find the first test's total assertion and increment by **+5**.

Replace with (example):

```typescript
// Org governance: 5 (.bbg/org/README.md, org-policy-schema.json, org-report-schema.json, org-config.example.json, .bbg/scripts/org-schema.sql)
const orgTasks = tasks.filter(
  (t) => t.destination.startsWith(".bbg/org/") || t.destination.startsWith(".bbg/scripts/"),
);
expect(orgTasks).toHaveLength(5);
expect(orgTasks.map((t) => t.destination)).toContain(".bbg/org/README.md");
expect(orgTasks.map((t) => t.destination)).toContain(".bbg/org/org-policy-schema.json");
expect(orgTasks.map((t) => t.destination)).toContain(".bbg/org/org-report-schema.json");
expect(orgTasks.map((t) => t.destination)).toContain(".bbg/org/org-config.example.json");
expect(orgTasks.map((t) => t.destination)).toContain(".bbg/scripts/org-schema.sql");

// Total: previous core total + 5
expect(tasks).toHaveLength(102);
```

Find the second test's total assertion and increment by **+5**.

Replace with (example):

```typescript
// Total: previous TypeScript total + 5
expect(tasks).toHaveLength(116);
```

Find the third test's total assertion and increment by **+5**.

Replace with (example):

```typescript
// Total: previous TS+Python total + 5
expect(tasks).toHaveLength(129);
```

- [ ] **Step 2: Run tests to verify they FAIL (TDD red step)**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: FAIL — totals and org file assertions fail until manifest registration is added.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/unit/templates/governance.test.ts
git commit -m "test: update governance manifest count assertions for org files (Phase 8, red)"
```

---

### Task 8: Register org templates in governance manifest

**Files:**

- Modify: `src/templates/governance.ts:162-175` (add new constant) and `src/templates/governance.ts:277-295` (add section to `buildGovernanceManifest`)

- [ ] **Step 1: Add ORG_GOVERNANCE_FILES constant and register in manifest**

In `src/templates/governance.ts`, find the `MCP_CONFIG_FILES` constant (line 175):

```typescript
const MCP_CONFIG_FILES = ["mcp-servers.json", "README.md"];
```

Add after it:

```typescript
const ORG_GOVERNANCE_FILES = [
  ".bbg/org/README.md",
  ".bbg/org/org-policy-schema.json",
  ".bbg/org/org-report-schema.json",
  ".bbg/org/org-config.example.json",
  ".bbg/scripts/org-schema.sql",
];
```

Then find the MCP Configs section in `buildGovernanceManifest` (lines 290-293):

```typescript
// --- MCP Configs ---
for (const mcpFile of MCP_CONFIG_FILES) {
  tasks.push(copyTask(`mcp-configs/${mcpFile}`, `mcp-configs/${mcpFile}`));
}
```

Add after it:

```typescript
// --- Org Governance (reserved schemas) ---
for (const orgFile of ORG_GOVERNANCE_FILES) {
  tasks.push(copyTask(`generic/${orgFile}`, orgFile));
}
```

Also update the `GOVERNANCE_MANIFEST` export (lines 302-314) to include the new constant. Find:

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

Replace with:

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
  orgGovernanceFiles: ORG_GOVERNANCE_FILES,
} as const;
```

- [ ] **Step 2: Run tests to verify they PASS (TDD green step)**

Run: `npx vitest run tests/unit/templates/governance.test.ts`
Expected: All 5 tests PASS — counts match the incremented assertions.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/templates/governance.ts
git commit -m "feat: register org governance templates in manifest (Phase 8, green)"
```

---

### Task 9: (Removed) telemetry.db gitignore update

This task has been removed from Phase 8 to avoid cross-phase duplication.

Reason:

- `.bbg/telemetry.db` gitignore ownership belongs to **Phase 2** (telemetry foundation).
- Re-applying it in Phase 8 creates contradictory instructions and potential drift.

If your branch does not include Phase 2 yet, apply the gitignore change via the Phase 2 plan before or alongside this work.

---

### Task 10: Final verification

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

Run: `ls -la templates/generic/.bbg/org/ templates/generic/.bbg/scripts/`
Expected:

```
templates/generic/.bbg/org/:
README.md
org-config.example.json
org-policy-schema.json
org-report-schema.json

templates/generic/.bbg/scripts/:
org-schema.sql
```

- [ ] **Step 6: Final commit (if any lint/format fixes needed)**

```bash
git add -A
git commit -m "chore: Phase 8 org-governance-reserved complete"
```

---

## Summary

| Metric                           | Count                                            |
| -------------------------------- | ------------------------------------------------ |
| New template files               | 5                                                |
| Modified source files            | 3 (`schema.ts`, `governance.ts`, `constants.ts`) |
| Modified test files              | 1 (`governance.test.ts`)                         |
| Governance manifest count impact | +5 tasks from prior baseline                     |
| New TypeScript interfaces        | 1 (`OrganizationConfig`)                         |
| New SQLite tables                | 2 (reserved, not yet populated)                  |
| Estimated total time             | 25-35 minutes                                    |
