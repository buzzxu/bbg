# /cross-audit

## Description

Use the Cross Audit Skill to run a second independent audit using a different AI model after primary review. Do not ask the user to run a public `bbg cross-audit` CLI command.

## Usage

```

The skill may call `bbg cross-audit-agent` internally after collecting primary and cross-audit evidence.
/cross-audit
/cross-audit --primary-model codex --cross-model claude
/cross-audit --scope code-review,security-scan
/cross-audit --from docs/reports/code-review-2026-04-09.md
/cross-audit --from docs/reports/primary-audit.json,docs/reports/cross-audit.json
```

## Options

| Flag              | Default                     | Description                              |
| ----------------- | --------------------------- | ---------------------------------------- |
| `--primary-model` | auto-detected               | Model used for the first audit run       |
| `--cross-model`   | prompt user                 | Model used for independent cross audit   |
| `--scope`         | `code-review,security-scan` | Audit scope to replay in cross pass      |
| `--from`          | latest reports              | Explicit report inputs for diffing       |
| `--out`           | `docs/reports/YYYY/MM`      | Output directory for consolidated report |

## Process

1. Collect primary audit artifacts (`/code-review`, `/security-scan`, optional `/red-team`)
2. Select cross-audit model (must differ from primary model)
3. Re-run equivalent audit scope independently
4. Compare findings by severity, category, and remediation status
5. Mark each item as `agreed`, `primary-only`, `cross-only`, or `conflict`
6. Produce consolidated report and release recommendation

### Input Formats

- `Markdown` (`.md`): backward-compatible parsing of bullet/table findings
- `JSON` (`.json`): preferred structured format for deterministic reconciliation

Structured JSON schema (minimum):

```json
{
  "findings": [
    {
      "id": "SEC-001",
      "severity": "high",
      "filePath": "src/service/auth.ts",
      "rule": "validation",
      "description": "Input validation missing for token claims"
    }
  ]
}
```

## Output

- Consolidated report (human-readable): `docs/reports/YYYY/MM/cross-audit-<timestamp>.md`
- Consolidated report (machine-readable): `docs/reports/YYYY/MM/cross-audit-<timestamp>.json`
- Summary table: agreement rate, conflict count, unresolved criticals
- Recommendation: `PASS` | `CONDITIONAL` | `BLOCK`

## Rules

- Cross model must be different from primary model
- Do not discard findings that appear in only one audit
- Conflicts require explicit adjudication notes
- Keep full traceability to original findings and file paths
- Store final report using dated folders (`YYYY/MM`)

## Related

- **Skills**: [cross-audit](../skills/cross-audit/SKILL.md), [code-review-checklist](../skills/code-review-checklist/SKILL.md), [security-review](../skills/security-review/SKILL.md)
- **Commands**: [/code-review](./code-review.md), [/security-scan](./security-scan.md), [/model-route](./model-route.md)
- **Rules**: [knowledge](../rules/common/knowledge.md)
