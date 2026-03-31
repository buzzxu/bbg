---
description: Fix build and TypeScript compilation errors
---

Fix the current build errors.

Follow the workflow in `agents/build-error-resolver.md` and `agents/typescript-build-resolver.md`:

1. Run `npm run build` and capture errors
2. Categorize by type (TypeScript, import, dependency)
3. Check `rules/typescript/coding-style.md` for TypeScript conventions
4. Fix incrementally, re-running build after each fix
5. Run `npm test` to verify no regressions
6. Use the verification loop from `skills/verification-loop/SKILL.md`

Never use `@ts-ignore` or `as any`. Don't make architectural changes.
