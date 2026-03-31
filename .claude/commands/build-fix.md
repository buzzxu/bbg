Fix the current build errors:

1. Run `npm run build` and capture all errors
2. Categorize errors by type (TypeScript, import, missing dependency)
3. Fix errors one at a time, starting with the most fundamental
4. After each fix, re-run `npm run build` to verify
5. Once build passes, run `npm test` to ensure nothing broke

Do NOT:
- Make architectural changes to fix build errors
- Add `// @ts-ignore` or `as any` to suppress errors
- Change public API signatures unless absolutely necessary
