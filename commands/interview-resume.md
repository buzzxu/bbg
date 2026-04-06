# /interview-resume

## Description

Resume an in-progress deep-interview session. This command restores prior rounds, displays current ambiguity state, and continues from the next question.

## Usage

```
/interview-resume
/interview-resume --slug stripe-billing
/interview-resume --id a1b2c3d4-e5f6-7890-abcd-ef1234567890
/interview-resume --last
```

## Options

| Flag | Default | Description |
| --- | --- | --- |
| `--slug` | - | Resume by session slug |
| `--id` | - | Resume by interview UUID |
| `--last` | - | Resume most recent in-progress session |
| `--list` | - | List in-progress sessions and ambiguity scores |

If no flag is provided and exactly one session is in progress, it resumes automatically.

## Process

1. Find session by slug, id, or recency
2. Load transcript from interview rounds
3. Restore latest dimension scores
4. Show session summary and current scorecard
5. Continue Socratic loop from next round

## Output

- Session summary (topic, profile, rounds, current ambiguity)
- Abbreviated previous transcript
- Current ambiguity scorecard
- Continued interview rounds

## Rules

- Do not re-ask already answered questions
- Always show restored scorecard before new questions
- Preserve profile and threshold for the session
- If already completed, suggest starting a new interview

## Examples

```
/interview-resume
/interview-resume --slug stripe-billing
/interview-resume --last
/interview-resume --list
```

## Related

- Skills: [deep-interview](../skills/deep-interview/SKILL.md)
- Commands: [/interview](./interview.md)
