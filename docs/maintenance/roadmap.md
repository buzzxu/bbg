# BBG Maintenance Roadmap

**Last updated**: 2026-04-01  
**Current version**: v1.0.0  
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

## v0.3.0 — Governance Quality ✅

**Theme**: Make governance content production-quality with full cross-references.  
**Status**: Complete

### P0 ✅

- [x] Governance cross-reference system (160 docs interlinked: agent↔skill↔rule↔command)
- [x] Context file templatization with Handlebars (dev.md, review.md, research.md)

### P1 ✅

- [x] MCP server documentation sync (14 servers documented across all config files)
- [x] Added 8 language-specific build+test commands (all 5 mainstream languages now have 3 commands each)
- [x] Fixed flaky test timeouts (all 210 tests passing)
- [x] Added coverage configuration

### P2 ✅

- [x] Remove scaffold tier (vestigial — replaced by two-tier system)
- [x] Language coverage audit and alignment (language support matrix added to README)
- [x] Created writing-plans skill (61 total skills)
- [x] Updated doc counts (25 agents, 61 skills, 34 rules, 40 commands)

---

## v0.4.0 — Capability Expansion ✅

**Theme**: New features and extensibility.  
**Status**: Complete

- [x] Plugin architecture for user-extensible agents/skills/rules
- [x] Multi-agent collaboration workflow patterns in skills (agent-handoff, agent-pipeline)
- [x] `bbg upgrade` smart diff/merge with user customization preservation (three-way merge via node-diff3)
- [x] Template consistency validation in `bbg doctor`
- [x] `bbg doctor --self` self-check mode
- [x] Auto-changelog generation in `bbg release`
- [ ] Complete Kotlin/PHP/C++ command coverage (deferred to v1.0.0)
- [ ] New language support based on community demand (deferred to v1.0.0)

---

## v1.0.0 — Stable Release ✅

**Theme**: Production-ready, fully documented, published.  
**Status**: Complete

- [x] API stability audit and documentation
- [x] Complete documentation (README rewrite, CONTRIBUTING.md, CHANGELOG.md)
- [x] Published to npm registry as `@buzzxu/bbg-cli`
- [x] npm pack end-to-end verification
- [x] release/changelog.ts coverage boost to 80%+

---

## Completed

### v1.0.0 — Stable Release

- [x] Package name changed to `@buzzxu/bbg-cli`, public on npm
- [x] LICENSE copyright notice header added
- [x] API stability audit (BbgConfig, CLI commands, template variables, directory conventions)
- [x] npm pack verification (all governance content included)
- [x] README.md rewrite for open-source audience (~350 lines)
- [x] CHANGELOG.md (v0.1.0 through v1.0.0)
- [x] CONTRIBUTING.md contributor guide
- [x] release/changelog.ts test coverage boosted to 80%+
- [x] ~251+ tests passing, build clean

### v0.4.0 — Capability Expansion

- [x] Three-way merge for `bbg upgrade` via node-diff3
- [x] `bbg doctor --self` governance content integrity checks (7 self-checks)
- [x] Template consistency checks in `bbg doctor` (template-files-exist, template-version-match)
- [x] Conventional commit changelog parser + auto-generation in `bbg release`
- [x] Plugin architecture: types, discovery, loading, merge, governance integration
- [x] Multi-agent collaboration skills (agent-handoff, agent-pipeline — 63 total skills)
- [x] ~253 tests passing, build clean

### v0.3.0 — Governance Quality

- [x] Full cross-reference system (160 governance docs interlinked)
- [x] Removed scaffold tier (two-tier template system)
- [x] 8 language-specific build+test commands added
- [x] Context file templatization with Handlebars
- [x] Fixed flaky tests (all 210 passing)
- [x] Coverage configuration added
- [x] MCP docs updated (14 servers)
- [x] Created writing-plans skill (61 total skills)
- [x] Updated doc counts (25 agents, 61 skills, 34 rules, 40 commands)

### v0.2.0 — Foundation Hardening

- [x] Extracted 10 duplicated functions to shared modules
- [x] Split init.ts (553 → 172 lines, 4 focused modules)
- [x] 106+ tests added across 10 new test files
- [x] ESLint + Prettier configuration
- [x] GitHub Actions CI with Node 18/20/22 matrix
- [x] Coverage reporting with @vitest/coverage-v8

### v0.1.0 — Initial Bootstrap

- [x] Core CLI: init, add-repo, doctor, sync, release, upgrade commands
- [x] Template system: 2-tier (generic, handlebars) — scaffold tier removed in v0.3.0
- [x] Governance content: 25 agents, 61 skills, 34 rules, 40 commands
- [x] 6 AI tool support: Claude Code, OpenCode, Cursor, Codex CLI, Copilot, Kiro
- [x] 93/93 tests passing
- [x] Bug fixes: CLI silent exit, double git prompts, add-repo overwrite, OpenCode/Codex configs
- [x] Self-governance architecture designed
