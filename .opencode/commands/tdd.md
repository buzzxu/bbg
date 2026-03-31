---
description: Implement features using RED-GREEN-IMPROVE TDD workflow
---

Implement the requested feature using TDD.

Follow the workflow in `agents/tdd-guide.md` and `skills/tdd-workflow/SKILL.md`:

1. Understand the current codebase by reading relevant files
2. Check `rules/common/testing.md` for testing standards
3. Write a failing test in tests/unit/ or tests/integration/ (RED)
4. Write minimal code to make the test pass (GREEN)
5. Refactor while keeping tests green (IMPROVE)
6. Run `npm test` and `npm run build` to verify
7. Use the verification loop from `skills/verification-loop/SKILL.md`

Use vitest. Target 80%+ coverage. Follow existing test patterns.
