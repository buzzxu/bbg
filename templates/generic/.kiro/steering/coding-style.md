---
inclusion: auto
description: Core coding style rules and governance resource references
---

# Coding Style -- Kiro Steering

Follow the coding rules defined in `rules/common/coding-style.md` and language-specific rules in `rules/<language>/`.

## Key Principles

- Small, focused functions (< 50 lines)
- Descriptive naming conventions
- Consistent formatting and indentation
- Handle errors explicitly with try/catch
- Never mutate function arguments
- Extract shared logic -- never duplicate functions
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## Governance Resources

- Agents: `agents/` -- Specialized AI agent definitions
- Skills: `skills/` -- Workflow instructions
- Rules: `rules/` -- Language-specific coding rules
- Commands: `commands/` -- Slash commands
