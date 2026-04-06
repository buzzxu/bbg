# /red-team

## Description

Execute red team security testing against backend API endpoints using the 2-round protocol. Round 1 performs a systematic sweep across attack categories; Round 2 performs adversarial creative attacks with chaining. Results are tracked in SQLite and summarized in a structured report.

## Usage

```
/red-team
/red-team --round 1
/red-team --round 2
/red-team --endpoint /api/v1/users
/red-team --domain authentication
```

## Process

1. **Verify applicability** -- backend project required (Java, Go, Python+web framework, Rust)
2. **Enumerate endpoints** -- collect routes/controllers
3. **Round 1 (systematic sweep)** -- run endpoint x category checks
4. **Round 2 (creative attack)** -- attempt chains, timing, and boundary attacks
5. **Score and report** -- score all findings and determine verdict
6. **Persist records** -- insert rounds/findings/chains into SQLite

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

- Backend only; abort for frontend-only projects
- Round 1 must complete before Round 2
- Never skip categories without N/A annotation
- Score every finding with 0.0-10.0
- Block release if open critical findings remain
- Use playbook: `docs/security/backend-red-team-playbook.md`
- Use template: `docs/reports/red-team-report-TEMPLATE.md`

## Examples

```
/red-team
/red-team --round 1
/red-team --round 2
/red-team --endpoint /api/v1/auth
```

## Related

- **Skills**: [red-team-test](../skills/red-team-test/SKILL.md), [security-review](../skills/security-review/SKILL.md)
- **Commands**: [/security-scan](./security-scan.md), [/workflow-start](./workflow-start.md)
