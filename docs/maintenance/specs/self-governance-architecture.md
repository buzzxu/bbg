# BBG Self-Governance Architecture Spec

**Status**: Approved  
**Date**: 2026-03-31  
**Author**: AI-assisted design  
**Version**: 1.0

## Background

BBG (BadBoy Genesis) is an AI Development Workflow Governance CLI that generates governance scaffolding (agents, skills, rules, commands, hooks, MCP configs) for 6 AI coding tools. As a governance tool, BBG has a unique opportunity: it can use its own governance output to guide its own development, creating a feedback loop that continuously improves both the tool and its governance content.

### Current State (v0.1.0)

- **Source**: 28 files, 3,779 lines across 7 modules
- **Governance**: 25 agents, 60 skills, 34 rules, 32 commands, 6 hooks, 14 MCP servers
- **Tests**: 93/93 passing, 21 test files (14 unit + 7 integration)
- **Known issues**: Code duplication (5 functions), 8 untested files, no CI/CD, no linting, governance cross-references absent, init.ts oversized (668 lines)

## Architecture: Feedback Loop Self-Governance

### Core Principle

```
Use BBG's governance → Develop BBG → Discover governance gaps → Improve governance → Better governance → Loop
```

BBG maintains itself using its own governance content. Problems discovered during development are recorded and fed back into governance improvements, creating a positive reinforcement cycle.

### Six-Layer Maintenance System

#### Layer 1: Analysis (持续健康监控)

**Purpose**: Continuously understand BBG's health state.

| Component | Description | Output |
|-----------|-------------|--------|
| `bbg doctor --self` | New self-check mode: validate governance cross-references, template sync, doc consistency | Health report |
| Coverage reporting | CI generates coverage on every push | `docs/maintenance/coverage-report.md` |
| Dependency audit | `npm audit` + outdated check | Recorded in audit-log |
| Tech debt tracking | Categorized issue list with severity and milestone | `docs/maintenance/known-issues.md` |

#### Layer 2: Design (架构决策可追溯)

**Purpose**: All architectural decisions are recorded and traceable.

| Component | Description | Location |
|-----------|-------------|----------|
| ADR (Architecture Decision Records) | One file per major decision (context → decision → consequences) | `docs/maintenance/decisions/` |
| Living roadmap | Organized by milestone, each task tagged with status | `docs/maintenance/roadmap.md` |
| Module specs | Written before major refactors | `docs/maintenance/specs/` |

#### Layer 3: Implementation (修复技术债、加固基础)

**Purpose**: Fix first, build later. Eliminate all known tech debt before expanding.

**v0.2.0 Milestone — Foundation Hardening**:

| Priority | Task | Impact |
|----------|------|--------|
| P0 | Extract 5 duplicated functions to `src/utils/shared.ts` | Eliminate duplication across init/add-repo/upgrade |
| P0 | Split `init.ts` (668 lines → 3-4 modules) | Reduce coupling, improve testability |
| P0 | Add tests for 8 untested files | Coverage → 80%+ |
| P1 | Add ESLint + Prettier config | Code style consistency |
| P1 | Add GitHub Actions CI (build + test + lint) | Automated quality gate |
| P1 | Add `typecheck`, `coverage`, `lint` npm scripts | Complete dev toolchain |
| P2 | Fix `sync.ts` immutability violation | Align with stated principles |
| P2 | Remove unused `BbgAnalyzerError` | Dead code cleanup |
| P2 | Fix AGENTS.md references to non-existent files | Documentation accuracy |

#### Layer 4: Optimization (提升governance质量)

**Purpose**: Make governance content production-quality.

**v0.3.0 Milestone — Governance Quality**:

| Priority | Task | Impact |
|----------|------|--------|
| P0 | Governance cross-reference system | 130+ docs interlinked: agent↔skill↔rule↔command |
| P0 | Fix hardcoded paths in contexts | Generated contexts work for target projects |
| P1 | Template consistency validation | `bbg doctor` checks manifest matches actual files |
| P1 | MCP server doc sync | 14 actual vs 12 documented → align |
| P2 | Activate scaffold tier | From 1 vestigial file to practical usage |
| P2 | Language coverage alignment | Complete Kotlin/PHP/C++ commands |

#### Layer 5: Upgrade (v1.0准备)

**Purpose**: Prepare for stable release.

**v0.4.0+ Milestones**:

| Component | Description |
|-----------|-------------|
| Plugin architecture | Allow users to extend agents/skills/rules beyond built-in |
| Multi-agent collaboration | Skills for coordinated multi-agent workflows |
| `bbg upgrade` enhancement | Smarter diff/merge preserving user customizations |
| Release automation | `bbg release` with auto-changelog generation |

#### Layer 6: Pending / Feedback Loop (持续收集改进项)

**Purpose**: Continuously collect and classify improvement items.

| Mechanism | Description |
|-----------|-------------|
| `docs/maintenance/audit-log.md` | Per-session log: date, changes, new findings, governance feedback |
| `docs/maintenance/known-issues.md` | Severity-sorted issue list with milestone assignment |
| `docs/maintenance/governance-feedback.md` | Governance improvements discovered while developing BBG (loop core) |
| Milestone retrospective | Review roadmap after each release, adjust priorities |

### Feedback Loop Operation

**Concrete example**:

```
1. Developer uses agents/tdd-guide.md to write tests for BBG
2. Discovers: tdd-guide.md doesn't link to skills/tdd-workflow/SKILL.md
3. Records finding in governance-feedback.md:
   "tdd-guide.md missing cross-reference to tdd-workflow skill"
4. In v0.3.0 iteration: add cross-references throughout governance docs
5. Updated tdd-guide.md now links to the skill → more effective
6. Continue developing with improved governance...
```

### Milestone Summary

| Version | Theme | Key Metrics |
|---------|-------|-------------|
| **v0.2.0** | Foundation hardening | Test coverage ≥80%, CI green, 0 code duplication, lint passing |
| **v0.3.0** | Governance quality | Cross-references 100%, template sync verified, contexts fixed |
| **v0.4.0** | Capability expansion | New languages/commands, scaffold activated, plugin groundwork |
| **v1.0.0** | Stable release | API stable, docs complete, release automation, full language coverage |

### File Structure

```
docs/maintenance/
├── roadmap.md                           # Living roadmap by milestone
├── known-issues.md                      # Severity-sorted issue tracker
├── governance-feedback.md               # Feedback loop: governance improvements
├── audit-log.md                         # Per-session maintenance log
├── specs/
│   └── self-governance-architecture.md  # This document
└── decisions/
    └── (ADRs as needed)
```

## Development Tools

BBG is developed using three AI coding tools: Claude Code, Codex CLI, and OpenCode. Each has minimal-but-functional configuration in the repo (`.claude/`, `.codex/`, `.opencode/`). The governance content BBG generates for OTHER projects is the comprehensive set (25 agents, 60 skills, etc.).

## Success Criteria

1. Every maintenance session records its findings in audit-log.md
2. Governance feedback items are addressed within the next milestone
3. Known issues list trends downward over time
4. Test coverage monotonically increases toward 80%+
5. CI remains green across all milestones
6. BBG's own governance configs remain minimal (not bloated with content meant for target projects)

## Risks

| Risk | Mitigation |
|------|------------|
| Feedback loop becomes busywork | Keep governance-feedback.md entries actionable; delete noise |
| Scope creep in milestones | Strict P0/P1/P2 prioritization; defer P2 if milestone is large |
| Self-governance overhead > value | Review ROI at each milestone; simplify if overhead is excessive |
| Divergence between BBG's own configs and generated configs | `bbg doctor --self` validates alignment |
