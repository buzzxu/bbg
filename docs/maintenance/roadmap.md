# BBG Maintenance Roadmap

**Last updated**: 2026-03-31  
**Current version**: v0.1.0  
**Architecture**: [Self-Governance Feedback Loop](specs/self-governance-architecture.md)

---

## v0.2.0 — Foundation Hardening

**Theme**: Fix first, build later. Eliminate tech debt, add quality gates.  
**Status**: Not started

### P0 — Must Have

- [ ] Extract duplicated functions to `src/utils/shared.ts`
  - `sanitizePromptValue()` — duplicated in init.ts, add-repo.ts
  - `isParseableGitUrl()` — duplicated in init.ts, add-repo.ts
  - `inferRepoName()` — duplicated in init.ts, add-repo.ts
  - `collectStackInfo()` — duplicated in init.ts, add-repo.ts
  - `resolveBuiltinTemplatesRoot()` — duplicated in init.ts, upgrade.ts, fix.ts
- [ ] Split `init.ts` (668 lines → 3-4 focused modules)
  - Template manifest management
  - Repository setup flow
  - Governance deployment
  - Prompt/interaction handling
- [ ] Add tests for 8 untested source files
  - `src/constants.ts`
  - `src/analyzers/index.ts`
  - `src/templates/engine.ts`
  - `src/templates/governance.ts`
  - `src/upgrade/diff.ts`
  - `src/utils/fs.ts`
  - `src/utils/prompts.ts`
  - `src/config/schema.ts`

### P1 — Should Have

- [ ] Add ESLint + Prettier configuration
- [ ] Add GitHub Actions CI workflow (build + test + lint on push/PR)
- [ ] Add npm scripts: `typecheck`, `coverage`, `lint`
- [ ] Set up vitest coverage reporting (target: 80%)

### P2 — Nice to Have

- [ ] Fix `sync.ts` direct mutation of `repo.stack` (immutability violation)
- [ ] Remove unused `BbgAnalyzerError` export from `src/utils/errors.ts`
- [ ] Fix AGENTS.md references to non-existent files (`src/utils/logger.ts`, `src/templates/manifest.ts`)
- [ ] Fix init.ts TypeScript errors (ListRemoteBranchesResult type issues)

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

- [ ] Activate scaffold tier (expand from 1 vestigial file)
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
- [x] Template system: 3-tier (generic, handlebars, scaffold)
- [x] Governance content: 25 agents, 60 skills, 34 rules, 32 commands
- [x] 6 AI tool support: Claude Code, OpenCode, Cursor, Codex CLI, Copilot, Kiro
- [x] 93/93 tests passing
- [x] Bug fixes: CLI silent exit, double git prompts, add-repo overwrite, OpenCode/Codex configs
- [x] Self-governance architecture designed
