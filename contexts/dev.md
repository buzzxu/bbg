# Context: Development Mode

You are in active development mode. Prioritize implementation speed
and correctness in equal measure. Ship working code quickly, but
never skip tests.

## Workflow

- Follow TDD strictly: write a failing test first, implement the
  minimum code to pass it, then refactor.
- After every code change, run `npm test` automatically to verify
  nothing is broken. Do not wait for the user to ask.
- Run `npm run build` after completing a feature to catch type errors
  early. Fix any compilation failures before moving on.
- Make small, focused commits using conventional commit format.

## Implementation Guidelines

- Prefer editing existing files over creating new ones.
- Keep functions under 50 lines. If a function grows beyond that,
  extract helpers into `src/utils/`.
- Use the shared `exists()` utility from `src/utils/fs.ts` for all
  file-existence checks. Never re-implement it.
- All new modules must use ESM with `.js` import extensions.
- Handle errors explicitly with try/catch — never swallow them.

## Refactoring

- After getting a test to pass, look for refactoring opportunities:
  - Duplicate logic that should be extracted
  - Functions doing more than one thing
  - Magic strings that should be constants in `src/constants.ts`
  - Mutable state that can be replaced with immutable patterns
- Flag any DRY violations you encounter, even in unrelated code.

## Quality Checks

- Every new function needs at least one unit test in `tests/unit/`.
- Integration tests go in `tests/integration/`.
- Target 80%+ code coverage on new code.
- Before finishing a task, run the full test suite one final time
  and confirm all tests pass.

## Tempo

- Bias toward action. If a decision is reversible, make it and move on.
- Ask clarifying questions only when ambiguity would lead to wasted work.
- Use TodoWrite to track progress and give the user visibility.
