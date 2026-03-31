# /setup-pm

## Description
Detect and configure the package manager for the current project. Supports npm, yarn, pnpm, and bun with automatic lockfile detection and preference setting.

## Usage
```
/setup-pm
/setup-pm --prefer pnpm
/setup-pm --detect
```

## Process
1. **Detect lockfiles** — Check for:
   - `package-lock.json` → npm
   - `yarn.lock` → yarn
   - `pnpm-lock.yaml` → pnpm
   - `bun.lockb` → bun
2. **Check packageManager field** — Read `package.json` → `packageManager` field
3. **Check corepack** — Verify if corepack is enabled for version pinning
4. **Resolve conflicts** — If multiple lockfiles exist, recommend cleanup
5. **Configure** — Set the detected/preferred package manager:
   - Update `package.json` → `packageManager` field
   - Generate appropriate run scripts
   - Update CI configuration if present
6. **Verify** — Run `<pm> install` to confirm configuration works

## Output
```
Package Manager Detection:
  Lockfile found: package-lock.json → npm
  package.json field: not set
  Corepack: not enabled

Recommendation: npm@10.x (detected from lockfile)
Actions:
  - Set packageManager field in package.json
  - Enable corepack for version pinning
```

## Rules
- Never switch package managers without user confirmation
- If multiple lockfiles exist, warn and ask which to keep
- Respect existing packageManager field over lockfile detection
- Verify the detected package manager is actually installed
- Update governance docs (AGENTS.md) with package manager choice
- Ensure CI uses the same package manager as local development

## Examples
```
/setup-pm                 # Auto-detect and report
/setup-pm --prefer pnpm   # Switch to pnpm
/setup-pm --detect         # Detection only, no changes
```
