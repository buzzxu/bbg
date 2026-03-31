---
description: Fix build and compilation errors systematically
---

# /build-fix -- Build Error Resolution

Follow `agents/build-error-resolver.md` and `skills/verification-loop/SKILL.md`.

1. Run the build and capture error output
2. Analyze each error to identify root causes
3. Fix errors one at a time (most fundamental first)
4. Re-run build after each fix
5. Run tests to verify no regressions
6. Repeat until build succeeds
