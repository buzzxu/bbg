---
description: Review code changes for quality, security, and style
---

Review the current code changes.

Follow the workflow in `agents/code-reviewer.md` and `skills/code-review-checklist/SKILL.md`:

1. Security: no hardcoded secrets, proper input validation (see `rules/common/security.md`)
2. Code Quality: functions <50 lines, no duplication, proper error handling (see `rules/common/coding-style.md`)
3. TypeScript: correct types, no `any`, ESM imports with `.js` (see `rules/typescript/coding-style.md`)
4. Testing: tests exist for new/changed code (see `rules/common/testing.md`)
5. DRY: no duplicated utilities (should use src/utils/)
6. Patterns: follows established patterns (see `rules/common/patterns.md`)

Run `npm run build` and `npm test`. Flag issues as CRITICAL/MEDIUM/LOW.
