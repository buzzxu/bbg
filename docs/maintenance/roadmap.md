# BBG Maintenance Roadmap

**Last updated**: 2026-03-31  
**Current version**: v0.2.0  
**Architecture**: [Self-Governance Feedback Loop](specs/self-governance-architecture.md)

---

## v0.2.0 — Foundation Hardening ✅

**Theme**: Fix first, build later. Eliminate tech debt, add quality gates.  
**Status**: Complete

### P0 — Must Have ✅

- [x] Extract 10 duplicated functions to shared modules
  - `sanitizePromptValue()` → `src/utils/prompts.ts`
  - `isParseableGitUrl()` → `src/utils/git-url.ts`
  - `inferRepoName()` → `src/utils/git-url.ts`
  - `collectStackInfo()` → `src/utils/prompts.ts`
  - `resolveBuiltinTemplatesRoot()` → `src/utils/paths.ts`
  - `resolvePackageRoot()` → `src/utils/paths.ts`
  - `toSnapshotRelativePath()` → `src/utils/paths.ts`
  - `normalizeWorkspaceRelativePath()` → `src/utils/paths.ts`
  - `readIfExists()` → `src/utils/fs.ts`
  - `expectedRepoIgnoreEntries()` → `src/doctor/shared.ts`
- [x] Split `init.ts` (553 → 172 lines, 4 focused modules)
  - `init.ts` — orchestrator
  - `init-manifest.ts` — template registries + plan building
  - `init-prompts.ts` — interactive wizard + config collection
  - `init-gitignore.ts` — gitignore managed block logic
- [x] Add tests for untested source files
  - `src/constants.ts` — 6 tests
  - `src/analyzers/index.ts` — 7 tests
  - `src/templates/engine.ts` — 30 tests
  - `src/templates/governance.ts` — 5 tests
  - `src/upgrade/diff.ts` — 14 tests
  - `src/utils/fs.ts` — 10 tests
  - `src/utils/prompts.ts` — 1 test
  - `src/doctor/shared.ts` — 4 tests
  - `src/utils/git-url.ts` — 15 tests
  - `src/utils/paths.ts` — 14 tests

### P1 — Should Have ✅

- [x] Add ESLint + Prettier configuration (`.eslintrc.cjs`, `.prettierrc`)
- [x] Add GitHub Actions CI workflow (`.github/workflows/ci.yml`, Node 18/20/22 matrix)
- [x] Add npm scripts: `typecheck`, `coverage`, `lint`, `lint:fix`
- [x] Set up vitest coverage reporting with `@vitest/coverage-v8`

### P2 — Nice to Have ✅

- [x] Fix `sync.ts` direct mutation of `repo.stack` (immutable `config.repos.map()` pattern)
- [x] Remove unused `BbgAnalyzerError` export from `src/utils/errors.ts`
- [x] Fix AGENTS.md references to non-existent files
- [x] Fix init.ts TypeScript errors (ListRemoteBranchesResult type — zero TS errors now)

---

## v0.3.0 — Governance Quality

**Theme**: Make governance content production-quality with full cross-references.  
**Status**: Not started

### P0

- [ ] Governance cross-reference system (130+ docs interlinked: agent↔skill↔rule↔command)
- [ ] Fix hardcoded BBG paths in `contexts/` (dev.md, review.md, research.md)

### P1

- [ ] Template consistency validation in `bbg doctor`
- [ ] MCP server documentation sync (14 actual → docs updated)
- [ ] `bbg doctor --self` self-check mode

### P2

- [x] Remove scaffold tier (vestigial — replaced by two-tier system)
- [ ] Complete Kotlin/PHP/C++ command coverage
- [ ] Language coverage audit and alignment

---

## v0.4.0 — Capability Expansion

**Theme**: New features and extensibility.  
**Status**: Not started

- [ ] Plugin architecture for user-extensible agents/skills/rules
- [ ] Multi-agent collaboration workflow patterns in skills
- [ ] `bbg upgrade` smart diff/merge with user customization preservation
- [ ] New language support based on community demand

---

## v1.0.0 — Stable Release

**Theme**: Production-ready, fully documented, automated.  
**Status**: Not started

- [ ] API stability guarantee
- [ ] Complete documentation
- [ ] `bbg release` with auto-changelog
- [ ] Full language coverage across all governance categories
- [ ] Published to npm registry

---

## Completed

### v0.1.0 — Initial Bootstrap (current)
- [x] Core CLI: init, add-repo, doctor, sync, release, upgrade commands
- [x] Template system: 2-tier (generic, handlebars) — scaffold tier removed in v0.3.0
- [x] Governance content: 25 agents, 61 skills, 34 rules, 40 commands
- [x] 6 AI tool support: Claude Code, OpenCode, Cursor, Codex CLI, Copilot, Kiro
- [x] 93/93 tests passing
- [x] Bug fixes: CLI silent exit, double git prompts, add-repo overwrite, OpenCode/Codex configs
- [x] Self-governance architecture designed
