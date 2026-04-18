# Task Environment Playbook

Use task environments when a change needs isolated runtime verification.

## Goals

- isolate active work from the main workspace
- give agents a dedicated place to run apps and collect artifacts
- keep UI, logs, metrics, and traces attached to the task

## Default Flow

1. `bbg task-env start "<task>"`
2. Work inside `.bbg/task-envs/<id>/worktree`
3. Capture artifacts under `.bbg/task-envs/<id>/artifacts/`
4. Attach an observation session when runtime evidence matters
5. `bbg task-env finish <id>` after merge or abandonment

## Rules

- prefer one environment per active task
- do not scatter verification artifacts across temp directories
- close finished environments promptly
