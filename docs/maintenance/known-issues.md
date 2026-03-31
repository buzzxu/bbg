# Known Issues

**Last updated**: 2026-03-31

Issues are sorted by severity and tagged with milestone assignment.

## Critical (P0)

| ID | Issue | Location | Milestone | Notes |
|----|-------|----------|-----------|-------|
| K-001 | 5 functions duplicated across init/add-repo/upgrade | `src/commands/init.ts`, `add-repo.ts`, `upgrade.ts`, `doctor/fix.ts` | v0.2.0 | `sanitizePromptValue`, `isParseableGitUrl`, `inferRepoName`, `collectStackInfo`, `resolveBuiltinTemplatesRoot` |
| K-002 | `init.ts` is 668 lines with 12 imports — too coupled | `src/commands/init.ts` | v0.2.0 | Split into 3-4 focused modules |
| K-003 | 8 source files have no tests | See roadmap | v0.2.0 | Coverage well below 80% target |
| K-004 | TypeScript errors in init.ts (ListRemoteBranchesResult) | `src/commands/init.ts:390` | v0.2.0 | Property 'length'/'map' not on type |

## High (P1)

| ID | Issue | Location | Milestone | Notes |
|----|-------|----------|-----------|-------|
| K-010 | No CI/CD pipeline | Project root | v0.2.0 | No GitHub Actions configured |
| K-011 | No linting (ESLint/Prettier) | Project root | v0.2.0 | Code style not enforced |
| K-012 | Missing npm scripts: typecheck, coverage, lint | `package.json` | v0.2.0 | Dev toolchain incomplete |
| K-013 | Governance cross-references absent | `agents/`, `skills/`, `rules/`, `commands/` | v0.3.0 | 130+ independent docs with no linking |
| K-014 | MCP server count mismatch (14 actual vs 12 documented) | `mcp-configs/`, `AGENTS.md` | v0.3.0 | magic + playwright not in docs |

## Medium (P2)

| ID | Issue | Location | Milestone | Notes |
|----|-------|----------|-----------|-------|
| K-020 | `sync.ts` mutates `repo.stack` directly | `src/commands/sync.ts` | v0.2.0 | Violates stated immutability principle |
| K-021 | `BbgAnalyzerError` exported but never used | `src/utils/errors.ts` | v0.2.0 | Dead code |
| K-022 | AGENTS.md references non-existent files | `AGENTS.md` | v0.2.0 | `src/utils/logger.ts`, `src/templates/manifest.ts` |
| K-023 | Hardcoded BBG paths in contexts | `contexts/dev.md`, `review.md`, `research.md` | v0.3.0 | Won't work for target projects |
| K-024 | Scaffold tier vestigial (1 file, 4 lines) | `templates/scaffold/` | v0.3.0 | Needs activation or removal |
| K-025 | Asymmetric language coverage | `commands/`, `agents/` | v0.3.0 | Kotlin partial, PHP/C++ missing commands |

## Low (P3)

| ID | Issue | Location | Milestone | Notes |
|----|-------|----------|-----------|-------|
| K-030 | No coverage reporting despite 80% target | `vitest.config.ts` | v0.2.0 | Need coverage plugin |
