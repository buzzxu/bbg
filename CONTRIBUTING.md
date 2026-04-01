# Contributing to BBG

Thank you for your interest in contributing to BBG (BadBoy Genesis)! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js >= 18
- Git

### Getting Started

```bash
git clone https://github.com/buzzxu/bbg.git
cd bbg
npm install
npm run build
npm test
```

### Available Scripts

| Script              | Description               |
| ------------------- | ------------------------- |
| `npm run build`     | Build with tsup           |
| `npm test`          | Run tests with vitest     |
| `npm run dev`       | Development mode with tsx |
| `npm run typecheck` | TypeScript type checking  |
| `npm run lint`      | ESLint check              |
| `npm run lint:fix`  | ESLint auto-fix           |
| `npm run coverage`  | Test coverage report      |

## Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run coverage        # Coverage report (target: 80%+)
```

Tests are located in:

- `tests/unit/` — Unit tests
- `tests/integration/` — Integration tests

## Coding Standards

BBG uses TypeScript in strict mode with ESM-only modules. For the full coding rules, see [RULES.md](./RULES.md).

Key points:

- **File naming**: lowercase with hyphens (`detect-stack.ts`)
- **Imports**: Use `.js` extensions for ESM compatibility
- **Functions**: Small (<50 lines), focused, well-named
- **Immutability**: Always create new objects, never mutate existing ones
- **Error handling**: Always handle errors explicitly with try/catch
- **Shared utilities**: Use `src/utils/` — never duplicate utility functions
- **Constants**: Centralize in `src/constants.ts`

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve specific bug
refactor: restructure without behavior change
docs: update documentation
test: add or update tests
chore: maintenance tasks
perf: performance improvement
ci: CI/CD changes
```

Examples:

```
feat: add Kotlin build resolver agent
fix(doctor): handle missing governance directory gracefully
docs: update language support matrix
test: add integration tests for upgrade command
```

## Pull Request Process

1. **Branch from master**: `feature/`, `fix/`, `refactor/`, `docs/` prefixes
2. **Write tests first** (TDD): RED → GREEN → IMPROVE
3. **Run the full check suite** before submitting:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```
4. **Keep PRs focused**: One logical change per PR
5. **Describe user-facing impact** in the PR summary

## Adding Governance Content

### Adding a New Agent

1. Create `agents/<name>.md` with the agent definition
2. Add the agent to the governance manifest in `src/templates/governance.ts`
3. Add cross-references to related skills, rules, and commands
4. Update `AGENTS.md` agent count

### Adding a New Skill

1. Create `skills/<name>/SKILL.md` with the skill workflow
2. Add the skill to the governance manifest in `src/templates/governance.ts`
3. Add cross-references to related agents and commands

### Adding a New Rule

1. Create `rules/<lang>/<name>.md` with the rule content
2. Add the rule to the governance manifest in `src/templates/governance.ts`
3. Follow existing patterns in the same language directory

### Adding a New Command

1. Create `commands/<name>.md` with the command definition
2. Add the command to the governance manifest in `src/templates/governance.ts`

### Adding Language Support

A fully-supported language needs:

- Language reviewer agent (`agents/<lang>-reviewer.md`)
- Build resolver agent (`agents/<lang>-build-resolver.md`)
- 3 commands: `<lang>-review`, `<lang>-test`, `<lang>-build`
- Language-specific skills (patterns, testing)
- Language-specific rules (coding-style, testing, security)

See the Language Support table in [README.md](./README.md) for current coverage.

## License

By contributing to BBG, you agree that your contributions will be licensed under the [AGPL-3.0-only](./LICENSE) license.
