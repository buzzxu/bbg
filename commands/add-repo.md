# add-repo

Register a new Git repository into the current BBG workspace and refresh shared context.

## Steps

1. Validate the current workspace is initialized with `.bbg/config.json`.
2. Clone or register the repository path into the workspace.
3. Update workspace repo metadata and regenerate any affected governance files.
4. Run repo analysis and refresh workspace-level topology and knowledge unless analysis is explicitly disabled.
5. Record repo registration state and report any partial failures clearly.

## Expected output

- Added repository name and source
- Registration state written to `.bbg/repos/<repo>/registration.json`
- Updated repo/workspace knowledge under `.bbg/knowledge/`
- Refreshed architecture/business docs when analysis succeeds

## Related

- [analyze](analyze.md)
- [start](start.md)
- [workflow-orchestration skill](../skills/workflow-orchestration/SKILL.md)
