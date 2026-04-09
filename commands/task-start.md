# /task-start

## Description

Unified entrypoint to start a development task from requirement text or requirement file, then move through interview, planning, implementation workflow, and optional delivery report generation.

## Usage

```
/task-start "Build notification center with user preferences"
/task-start --file docs/workflows/requirement-template.md
/task-start --workflow full-feature
```

## Options

| Flag          | Default        | Description                            |
| ------------- | -------------- | -------------------------------------- |
| `--file`      | none           | Requirement file path                  |
| `--workflow`  | `full-feature` | Workflow preset to run                 |
| `--profile`   | `standard`     | Deep-interview profile                 |
| `--auto-wiki` | `true`         | Ingest confirmed requirement into wiki |

## Process

1. Capture requirement from prompt or file
2. Run `/interview` for Socratic clarification
3. Confirm crystallized requirement with user and save dated spec
4. Ingest confirmed spec into wiki knowledge layer
5. Start selected workflow preset (`/workflow-start`)
6. At workflow completion, ask whether to generate client delivery report

## Output

- Confirmed requirement spec in `docs/specs/YYYY/MM/<slug>.md`
- Workflow execution records in runtime store
- Optional delivery report in `docs/delivery/YYYY/MM/`

## Rules

- Do not run implementation workflow without confirmed requirement spec
- Always preserve requirement provenance from interview transcript
- Use dated folders for specs and delivery artifacts

## Related

- **Skills**: [task-intake](../skills/task-intake/SKILL.md), [deep-interview](../skills/deep-interview/SKILL.md), [workflow-orchestration](../skills/workflow-orchestration/SKILL.md)
- **Commands**: [/interview](./interview.md), [/workflow-start](./workflow-start.md), [/deliver](./deliver.md)
