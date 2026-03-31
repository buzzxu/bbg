Review the current code changes. Check for:

1. **Security**: No hardcoded secrets, proper input validation, safe file path handling
2. **Code Quality**: Functions <50 lines, proper error handling, no code duplication
3. **TypeScript**: Correct types, no `any`, proper strict mode usage
4. **Testing**: Tests exist for new/changed functionality
5. **Style**: ESM imports with `.js` extensions, lowercase-hyphen file names
6. **DRY**: No duplicated utility functions (use `src/utils/`)

Flag CRITICAL issues that must be fixed before merge.
Flag MEDIUM issues that should be addressed.
Note LOW issues as suggestions.

Run `npm run build` and `npm test` to verify nothing is broken.
