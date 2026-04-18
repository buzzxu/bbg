# Observability Playbook

Use observation sessions when agents need direct runtime evidence.

## Goals

- capture UI artifacts, logs, metrics, and traces together
- make runtime evidence readable to agents
- keep verification tied to concrete artifacts

## Default Flow

1. `bbg observe start "<topic>"`
2. Save screenshots and DOM snapshots under the UI artifact directory
3. Save logs, metrics, and traces under their matching directories
4. Update the session notes with what was captured and why
5. `bbg observe report <id>` before handoff or closure

## Rules

- observation is evidence collection, not promotion
- prefer attaching observation sessions to task environments
- keep artifact notes readable and minimal
