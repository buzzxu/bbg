---
description: Run governance health check and template integrity verification
---

Run bbg's own governance health check.

Follow the workflow in `commands/doctor.md`:

1. Run `npm run build` — verify compilation
2. Run `npm test` — verify all tests pass
3. Check for code duplication (grep for `exists(` across src/)
4. Check for unused imports and dead code — see `agents/refactor-cleaner.md`
5. Verify template manifest in src/constants.ts matches actual template files
6. Check governance template integrity:
   - Agents: verify `agents/*.md` files are valid
   - Skills: verify `skills/*/SKILL.md` structure
   - Rules: verify `rules/` directory structure
   - Commands: verify `commands/*.md` files
   - Hooks: verify `hooks/hooks.json` and scripts
7. Run `commands/quality-gate.md` checks

Report issues and suggest fixes.
