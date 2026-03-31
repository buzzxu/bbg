# Audit Log

Per-session maintenance log for BBG. Each entry records what was done, what was discovered, and governance feedback.

**Last updated**: 2026-03-31

---

## 2026-03-31 — v0.2.0 Foundation Hardening Implementation

**Session type**: Refactor / Feature / Bug fix  
**Duration**: Multi-session  
**Tools used**: OpenCode, Claude Code

### Changes Made

**Extraction (Tasks 1-6):** Extracted 10 duplicated functions into shared modules:
- `src/utils/fs.ts` — `readIfExists`
- `src/utils/git-url.ts` — `isParseableGitUrl`, `inferRepoName`
- `src/utils/paths.ts` — `resolveBuiltinTemplatesRoot`, `resolvePackageRoot`, `toSnapshotRelativePath`, `normalizeWorkspaceRelativePath`
- `src/utils/prompts.ts` — `sanitizePromptValue`, `collectStackInfo`
- `src/doctor/shared.ts` — `expectedRepoIgnoreEntries`
- `src/constants.ts` — `REPO_TYPE_CHOICES`, `DEFAULT_STACK`, `MANAGED_GITIGNORE_BLOCK_*`

**Split (Task 7):** Split `init.ts` (553→172 lines) into 4 focused modules:
- `init.ts` (orchestrator), `init-manifest.ts`, `init-prompts.ts`, `init-gitignore.ts`

**Bug fixes (Tasks 8-10):**
- Fixed `ListRemoteBranchesResult` type errors and credential passthrough
- Fixed `sync.ts` immutability violation (immutable `config.repos.map()` pattern)
- Removed dead `BbgAnalyzerError` class

**Documentation (Task 11):** Fixed AGENTS.md stale references

**Tests (Tasks 12-15):** Added 56+ tests across 4 new test files:
- `tests/unit/templates/engine.test.ts` — 30 tests for Handlebars helpers
- `tests/unit/templates/governance.test.ts` — 5 tests for manifest generation
- `tests/unit/upgrade/diff.test.ts` — 14 tests for unified patch
- `tests/unit/analyzers/index.test.ts` — 7 tests for repo analysis

**Tooling (Tasks 16-17):**
- ESLint 8 + Prettier + `eslint-config-prettier` configured
- `typecheck`, `lint`, `lint:fix`, `coverage` npm scripts added
- `@vitest/coverage-v8` for coverage reporting
- GitHub Actions CI with Node 18/20/22 matrix

**Final (Task 18):** Updated AGENTS.md architecture, roadmap, known-issues, audit-log

### Test Results
- 201 tests passing (up from 93 at v0.1.0)
- 2 pre-existing timeout failures (cli.smoke.test.ts, bootstrap.test.ts)
- Zero TypeScript errors (`npm run typecheck`)
- Zero lint errors (`npm run lint`)
- Build passes (`npm run build`)

### Discoveries
- `indent` Handlebars helper param order is `(count, text)` not `(text, count)` — spec had it wrong
- Handlebars passes options hash object as last arg to helpers — affects `date` and `join` when called without explicit params
- `ListRemoteBranchesResult` returns `{ branches, credentials }` not `string[]` — credentials needed for clone
- `BbgConfig` uses `gitUrl` (not `url`), `projectName` (not `name`), `version` (not `bbgVersion`)
- ESLint 8 is EOL but ESLint 9+ requires flat config format — tracked as K-026

### Governance Feedback
- Implementation plan specs should be validated against actual type schemas before execution
- The 18-task execution method (subagent-driven development) worked well for mechanical refactoring
- Spec compliance review caught several schema mismatches early
- Coverage target of 80% should be verified with actual coverage run

### Next Steps
- Run `npm run coverage` and assess coverage percentage
- Begin v0.3.0 planning (governance cross-references, context path fixes)
- Migrate to ESLint 9 flat config (K-026)
- Fix pre-existing test timeouts (K-027)

---

## 2026-03-31 — Self-Governance Architecture Design

**Session type**: Architecture / Planning  
**Duration**: Multi-session  
**Tools used**: OpenCode, Claude Code

### Changes Made
- Designed six-layer self-governance maintenance architecture (feedback loop model)
- Created `docs/maintenance/` directory structure:
  - `specs/self-governance-architecture.md` — Architecture spec
  - `roadmap.md` — Living roadmap with v0.2.0–v1.0.0 milestones
  - `known-issues.md` — 16 categorized issues with severity and milestone
  - `governance-feedback.md` — 10 initial governance improvement findings
  - `audit-log.md` — This file

### Discoveries
- 5 duplicated functions across init.ts, add-repo.ts, upgrade.ts, fix.ts
- init.ts is 668 lines with 12 imports — highest coupling in codebase
- 8 of 28 source files have zero tests
- No CI/CD, no linting, no coverage reporting
- Governance cross-references almost completely absent (130+ isolated docs)
- MCP server count mismatch (14 vs 12 documented)
- TypeScript errors in init.ts (ListRemoteBranchesResult type)

### Governance Feedback
- See `governance-feedback.md` for 10 initial findings from this session

### Next Steps
- Generate implementation plan for v0.2.0 milestone
- Begin P0 tasks: extract duplicated functions, split init.ts, add tests

---

## 2026-03-30 — Bug Fixes & Config Corrections

**Session type**: Bug fixing  
**Tools used**: OpenCode, Claude Code

### Changes Made
- Fixed CLI silent exit via `npm link` (realpathSync in cli.ts)
- Fixed double git credential prompts (silent-first + cache between calls)
- Fixed `add-repo` can't re-add deleted repos (overwrite confirmation)
- Fixed OpenCode config (removed invalid plugin/mcp sections)
- Fixed Codex config.toml (complete rewrite to valid format)
- Added `npm run dev:install` script
- Tests: 93/93 passing

### Governance Feedback
- OpenCode and Codex configs generated by BBG need better validation
- BBG's own repo configs should stay minimal (not include content meant for target projects)

---

## Template

```markdown
## YYYY-MM-DD — Session Title

**Session type**: (Bug fix / Feature / Refactor / Planning / Review)  
**Tools used**: (Claude Code / OpenCode / Codex CLI)

### Changes Made
- Change 1
- Change 2

### Discoveries
- Finding 1
- Finding 2

### Governance Feedback
- Feedback item (also add to governance-feedback.md)

### Next Steps
- Next action 1
```
