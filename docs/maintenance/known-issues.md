# Known Issues

**Last updated**: 2026-04-01

Issues are sorted by severity and tagged with milestone assignment.

## Critical (P0)

| ID | Issue | Location | Milestone | Status |
|----|-------|----------|-----------|--------|
| K-001 | ~~5 functions duplicated across init/add-repo/upgrade~~ | `src/utils/` | v0.2.0 | ✅ Resolved — 10 functions extracted to shared modules |
| K-002 | ~~`init.ts` is 668 lines with 12 imports~~ | `src/commands/init*.ts` | v0.2.0 | ✅ Resolved — split into 4 focused modules (172+193+197+52 lines) |
| K-003 | ~~8 source files have no tests~~ | See roadmap | v0.2.0 | ✅ Resolved — 106+ tests added across 10 new test files |
| K-004 | ~~TypeScript errors in init.ts (ListRemoteBranchesResult)~~ | `src/commands/init-prompts.ts` | v0.2.0 | ✅ Resolved — proper destructuring + credentials passthrough |

## High (P1)

| ID | Issue | Location | Milestone | Status |
|----|-------|----------|-----------|--------|
| K-010 | ~~No CI/CD pipeline~~ | `.github/workflows/ci.yml` | v0.2.0 | ✅ Resolved — GitHub Actions with Node 18/20/22 matrix |
| K-011 | ~~No linting (ESLint/Prettier)~~ | `.eslintrc.cjs`, `.prettierrc` | v0.2.0 | ✅ Resolved — ESLint + Prettier configured |
| K-012 | ~~Missing npm scripts~~ | `package.json` | v0.2.0 | ✅ Resolved — typecheck, coverage, lint, lint:fix added |
| K-013 | ~~Governance cross-references absent~~ | `agents/`, `skills/`, `rules/`, `commands/` | v0.3.0 | ✅ Resolved — 160 docs cross-referenced |
| K-014 | ~~MCP server count mismatch (14 actual vs 12 documented)~~ | `mcp-configs/`, `AGENTS.md` | v0.3.0 | ✅ Resolved — all docs updated to 14 servers |

## Medium (P2)

| ID | Issue | Location | Milestone | Status |
|----|-------|----------|-----------|--------|
| K-020 | ~~`sync.ts` mutates `repo.stack` directly~~ | `src/commands/sync.ts` | v0.2.0 | ✅ Resolved — immutable `config.repos.map()` pattern |
| K-021 | ~~`BbgAnalyzerError` exported but never used~~ | `src/utils/errors.ts` | v0.2.0 | ✅ Resolved — removed |
| K-022 | ~~AGENTS.md references non-existent files~~ | `AGENTS.md` | v0.2.0 | ✅ Resolved — references updated |
| K-023 | ~~Hardcoded BBG paths in contexts~~ | `contexts/dev.md`, `review.md`, `research.md` | v0.3.0 | ✅ Resolved — templatized with Handlebars |
| K-024 | ~~Scaffold tier removed (was vestigial)~~ | `templates/scaffold/` deleted | v0.3.0 | ✅ Resolved |
| K-025 | ~~Asymmetric language coverage~~ | `commands/`, `agents/` | v0.3.0 | ✅ Resolved — all 5 mainstream languages have 3 commands each |
| K-026 | ESLint 8 is EOL | `.eslintrc.cjs` | v0.4.0 | Open — migrate to flat config (ESLint 9+) |
| K-027 | ~~2 pre-existing test timeouts~~ | `cli.smoke.test.ts`, `bootstrap.test.ts` | v0.3.0 | ✅ Resolved — all 210 tests passing |

## Low (P3)

| ID | Issue | Location | Milestone | Status |
|----|-------|----------|-----------|--------|
| K-030 | ~~No coverage reporting despite 80% target~~ | `package.json` | v0.2.0 | ✅ Resolved — `@vitest/coverage-v8` configured |
