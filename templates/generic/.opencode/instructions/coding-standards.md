# Coding Standards

Follow the coding rules in `rules/common/coding-style.md` and language-specific rules in `rules/<language>/`.

## Key Principles

- Small, focused functions (< 50 lines)
- Descriptive naming conventions
- Handle errors explicitly -- never silently swallow exceptions
- Never mutate function arguments or shared state
- Extract shared logic -- never duplicate functions
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## Before Making Changes

1. Read the relevant agent in `agents/` for your task type
2. Follow the skill workflow in `skills/` for structured guidance
3. Check `rules/` for language-specific coding standards

## References

- Rules: `rules/`
- Agents: `agents/`
- Skills: `skills/`
