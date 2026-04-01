# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-01

### Added

- Published to npm as `@buzzxu/bbg-cli`
- Complete README documentation for open-source audience
- CONTRIBUTING.md contributor guide
- CHANGELOG.md covering all versions
- API stability audit and documentation
- npm pack verification for package integrity

### Changed

- Package name from `bbg` to `@buzzxu/bbg-cli`
- Package marked as public (`private: false`)
- LICENSE updated with copyright notice

## [0.4.0] - 2026-04-01

### Added

- Three-way merge for `bbg upgrade` via node-diff3
- `bbg doctor --self` mode for governance content integrity validation (7 self-checks)
- Template consistency checks: `template-files-exist`, `template-version-match`
- Conventional commit changelog parser and auto-generation in `bbg release`
- Plugin architecture: types, discovery, loading, merge, governance integration
- Multi-agent collaboration skills: agent-handoff, agent-pipeline (63 total skills)
- `--interactive` flag for `bbg upgrade`
- `--skip-changelog` flag for `bbg release`

## [0.3.0] - 2026-04-01

### Added

- Full cross-reference system (160 governance docs interlinked)
- 8 language-specific build+test commands (all 5 mainstream languages have 3 commands each)
- writing-plans skill (61 total skills)
- Language support matrix in README

### Changed

- Context files converted to Handlebars templates (dev.md, review.md, research.md)
- Removed scaffold tier — now two-tier template system (generic + handlebars)

### Fixed

- MCP server count mismatch (14 actual, docs updated)
- Flaky test timeouts (increased timeouts, improved mocks)

## [0.2.0] - 2026-03-31

### Changed

- Extracted 10 duplicated functions to shared modules
- Split init.ts into 4 focused modules (553 → 172 lines)

### Added

- ESLint + Prettier configuration
- GitHub Actions CI with Node 18/20/22 matrix
- 106+ new tests across 10 test files
- Coverage reporting with @vitest/coverage-v8

### Fixed

- ListRemoteBranchesResult type errors
- sync.ts direct mutation of repo.stack (immutable pattern)
- Dead BbgAnalyzerError export removed
- AGENTS.md references to non-existent files

## [0.1.0] - 2026-03-30

### Added

- Initial release
- 6 CLI commands: init, add-repo, doctor, sync, release, upgrade
- 25 agents, 60 skills, 34 rules, 32 commands
- 6 AI tool support: Claude Code, OpenCode, Cursor, Codex CLI, GitHub Copilot, Kiro
- Two-tier template system (generic + handlebars)
- 93 tests passing
