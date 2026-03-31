# /ts-build

## Description
Fix TypeScript/JavaScript build errors by running the compiler and build tools, categorizing errors, and fixing them systematically with re-verification after each fix.

## Usage
```
/ts-build
/ts-build src/commands/
/ts-build --noEmit
```

## Process
1. **Run type check** — Execute `npx tsc --noEmit` and capture all errors
2. **Run build** — Execute `npm run build` (tsup/esbuild/webpack) and capture errors
3. **Categorize errors** — Group by type:
   - Type errors (mismatched types, missing properties, generic constraints)
   - Import errors (missing `.js` extension, circular dependencies, unresolved modules)
   - Module errors (CJS/ESM interop, missing `type: "module"` in package.json)
   - Build tool errors (tsup/esbuild/webpack configuration, missing loaders)
4. **Prioritize** — Fix in order: module config → imports → types → build tool config
5. **Fix one at a time** — Apply smallest change to resolve each error
6. **Re-verify** — Run `npx tsc --noEmit` after each fix
7. **Final check** — Run `npm run build && npm test`

## Output
For each error fixed:
- Error message and file:line location
- Root cause analysis
- Fix applied
- Remaining error count

Final summary:
- Total errors found and fixed
- Type check status: pass/fail
- Build status: pass/fail
- Test status: pass/fail

## Rules
- Fix import extensions first — ESM requires `.js` extensions for relative imports
- Check `tsconfig.json` settings if module resolution errors appear
- Never loosen `strict` mode to fix errors — fix the code instead
- Use `npm ls` to diagnose dependency version conflicts
- Check for circular dependencies with `madge --circular` when import errors persist
- Verify `"type": "module"` in package.json for ESM projects
- Run `npm run typecheck` if available as a separate step from build

## Examples
```
/ts-build                    # Build entire project
/ts-build src/commands/      # Focus on specific directory
/ts-build --noEmit           # Type check only, no output
```
