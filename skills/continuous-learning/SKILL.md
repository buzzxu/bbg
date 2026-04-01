---
name: continuous-learning
category: ai-workflow
description: Auto-extract patterns from sessions — identify recurring decisions, create reusable rules, evolve skills
---

# Continuous Learning

## Overview
Use this skill at the end of development sessions or after completing significant tasks. It captures recurring patterns, decisions, and lessons so they become reusable knowledge rather than lost context. This is how skills and rules evolve over time.

## Workflow

### Step 1: Capture — Identify Patterns
After each session, review what happened:
- What decisions were made repeatedly?
- What searches were performed more than once?
- What errors were encountered and how were they resolved?
- What conventions were discovered through trial and error?
- What tool configurations proved useful?

### Step 2: Classify — Categorize the Pattern
Assign each pattern to a category:
- **Rule**: a constraint that should always be enforced (add to AGENTS.md or rules/)
- **Skill**: a reusable workflow or domain knowledge (add to skills/)
- **Convention**: a project-specific style decision (add to project config)
- **Fix**: a solution to a recurring error (add to troubleshooting docs)
- **Anti-pattern**: something that failed and should be avoided

### Step 3: Encode — Write It Down
For each pattern worth preserving:
- Write it as a clear, actionable instruction
- Include the context: when does this apply?
- Include the rationale: why does this matter?
- Include an example if the pattern is complex
- Place it in the correct location (rules/, skills/, AGENTS.md)

### Step 4: Validate — Test the Pattern
- Apply the new pattern to a recent example to verify it works
- Check that it doesn't contradict existing rules
- Get feedback from the team if applicable
- Remove or update patterns that prove incorrect

### Step 5: Prune — Remove Stale Knowledge
- Review existing rules and skills periodically
- Remove patterns that no longer apply to the current codebase
- Update patterns that have evolved with new best practices
- Merge overlapping patterns into single, clear instructions

## Patterns to Watch For

### Recurring Decisions
- If you make the same decision 3+ times, encode it as a rule
- Examples: "always use X library for Y", "always handle error Z this way"

### Discovered Conventions
- If you had to search to find the project's convention, document it
- Examples: "tests use AAA pattern", "errors use AppError class"

### Error-Fix Pairs
- If an error takes more than 5 minutes to debug, document the fix
- Format: symptom → root cause → solution

### Tool Configuration
- If you tuned a tool's config for better results, save the config
- Examples: tsconfig strictness, eslint rules, test timeouts

## Rules
- Capture patterns at the end of every significant session
- Write patterns as actionable instructions, not observations
- Always include context (when to apply) and rationale (why it matters)
- Prune stale patterns at least once per milestone
- Never encode personal preferences as universal rules — require justification

## Anti-patterns
- Capturing too many trivial patterns — focus on high-impact recurring ones
- Writing vague patterns ("be careful with X") instead of actionable ones
- Never pruning — stale rules cause confusion and slow down agents
- Encoding one-time fixes as permanent rules
- Capturing patterns without validation

## Checklist
- [ ] Reviewed session for recurring decisions and patterns
- [ ] Classified each pattern (rule, skill, convention, fix, anti-pattern)
- [ ] Wrote actionable instructions with context and rationale
- [ ] Validated patterns against recent examples
- [ ] Placed patterns in the correct location (rules/, skills/, AGENTS.md)
- [ ] Pruned any stale or contradicting patterns


## Related

- **Commands**: [/learn](../../commands/learn.md), [/learn-eval](../../commands/learn-eval.md)
