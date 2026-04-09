---
name: task-intake
category: workflow
description: Intake requirements from text or file, drive deep-interview confirmation, and start execution workflow with traceable artifacts
---

# Task Intake

## Overview

Standardize how new tasks enter the development pipeline.

## Workflow

1. Capture requirement input (text prompt or file)
2. Run deep-interview clarification using selected profile
3. Require explicit user confirmation of crystallized requirement
4. Save confirmed requirement to `docs/specs/YYYY/MM/<slug>.md`
5. Ingest into wiki knowledge layer
6. Start selected workflow preset

## Rules

- No implementation starts before confirmation
- Preserve requirement provenance back to interview rounds
- Use dated folders for requirement snapshots

## Related

- Commands: `commands/task-start.md`, `commands/interview.md`, `commands/workflow-start.md`
- Skills: `skills/deep-interview/SKILL.md`, `skills/workflow-orchestration/SKILL.md`
