# Governance Feedback

Improvements to BBG's governance content discovered while using it to develop BBG itself. This is the core of the feedback loop — each entry represents a real problem found during actual usage.

**Last updated**: 2026-03-31

## Format

Each entry follows: Date | Category | Finding | Action | Status

---

## Findings

### 2026-03-31 — Initial Audit

| Category | Finding | Action | Status |
|----------|---------|--------|--------|
| Cross-references | `agents/tdd-guide.md` doesn't link to `skills/tdd-workflow/SKILL.md` | Add cross-references in v0.3.0 | Pending |
| Cross-references | No agent references its related rules or commands | Systematic cross-reference pass needed | Pending |
| Contexts | `contexts/dev.md` contains BBG-specific file paths | Templatize or make generic | Pending |
| Contexts | `contexts/review.md` references BBG source structure | Same as above | Pending |
| Documentation | AGENTS.md says 12 MCP servers, actual JSON has 14 | Update AGENTS.md count | Pending |
| Documentation | AGENTS.md references `src/utils/logger.ts` which doesn't exist | Remove or create the file | Pending |
| Documentation | AGENTS.md references `src/templates/manifest.ts` which doesn't exist | Manifest logic is inline in init.ts | Pending |
| Templates | Scaffold tier has only 1 file (4 lines) — not useful | Either expand or document as planned-future | Pending |
| Consistency | Language coverage is asymmetric across governance categories | Audit and align in v0.3.0 | Pending |
| Hooks | Hook scripts not tested | Add hook script tests | Pending |

---

## How to Add Entries

When developing BBG and you encounter a governance content issue:

1. Add a row to the table above with today's date section
2. Categorize: Cross-references, Contexts, Documentation, Templates, Consistency, Hooks, Skills, Rules, Commands, Agents
3. Describe the specific finding
4. Propose an action
5. Set status: Pending → In Progress → Resolved (with version)
