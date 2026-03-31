# /go-build

## Description
Fix Go build errors by running `go build`, categorizing errors, and fixing them systematically with re-verification after each fix.

## Usage
```
/go-build
/go-build ./cmd/server/
/go-build --vet
```

## Process
1. **Run build** — Execute `go build ./...` and capture all errors
2. **Run vet** — Execute `go vet ./...` for static analysis issues
3. **Categorize errors** — Group by type:
   - Import errors (missing/unused packages)
   - Type errors (mismatched types, missing methods)
   - Syntax errors (missing brackets, malformed expressions)
   - Linker errors (missing symbols, circular imports)
4. **Prioritize** — Fix in order: syntax → imports → types → vet warnings
5. **Fix one at a time** — Apply smallest change to resolve each error
6. **Re-verify** — Run `go build ./...` after each fix
7. **Final check** — Run `go build && go vet && go test ./...`

## Output
For each error fixed:
- Error message and file:line location
- Root cause analysis
- Fix applied
- Remaining error count

Final summary:
- Total errors found and fixed
- Build status: pass/fail
- Vet status: pass/fail
- Test status: pass/fail

## Rules
- Fix imports first — many type errors resolve when imports are correct
- Run `go mod tidy` if there are module dependency issues
- Never fix tests to match broken code — fix the code
- Use `go build -v` for verbose output when debugging linker issues
- Check `go.sum` consistency if module verification fails

## Examples
```
/go-build                    # Build entire project
/go-build ./cmd/server/      # Build specific package
/go-build --vet              # Include go vet findings
```
