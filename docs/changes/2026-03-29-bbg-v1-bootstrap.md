# 2026-03-29 bbg v1 bootstrap delivery

## Delivered scope (Task 12)

- Added integration smoke test at `tests/integration/cli.smoke.test.ts` to assert built CLI `--help` includes all v1 commands: `init`, `add-repo`, `doctor`, `sync`, `release`, `upgrade`.
- Added root usage document at `README.md` with concise and accurate v1 command list.
- Captured verification evidence for self-healing smoke behavior (auto-build when `dist/cli.js` is missing).

## Verification evidence

### 1) Smoke test auto-builds when artifact is missing

Command (with no manual pre-build step):

```bash
npm run test -- tests/integration/cli.smoke.test.ts
```

Observed result:

- Test setup detects missing `dist/cli.js` and runs `npm run build` once.
- Smoke assertion then executes `node dist/cli.js --help` successfully.

### 2) Full verification

Commands:

```bash
npm run build
npm run test
node dist/cli.js --help
```

Observed results:

- Build: success (`dist/cli.js` and `dist/cli.d.ts` generated)
- Tests: all passing (`21 passed`, `81 passed`)
- Help output lists all v1 commands:
  - `init`
  - `add-repo`
  - `doctor`
  - `sync`
  - `release`
  - `upgrade`

### 3) Smoke test passes after build

Command:

```bash
npm run test -- tests/integration/cli.smoke.test.ts
```

Observed result:

- `1 passed`

## Notes

- No commits were created as requested.
