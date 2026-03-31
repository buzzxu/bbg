---
name: eval-harness
category: testing
description: Evaluation framework — define criteria, run checks, score results, identify regressions
---

# Eval Harness

## Overview
Use this skill when you need to systematically measure code quality, agent output, or system behavior. An eval harness defines what "good" looks like, runs checks against that definition, and scores results to track improvements or regressions over time.

## Workflow

### Step 1: Define Criteria
- Identify what you're evaluating (code quality, test output, agent performance, feature correctness)
- Define measurable criteria with clear pass/fail thresholds
- Weight criteria by importance (critical vs. nice-to-have)
- Document the rationale for each criterion

### Step 2: Build Test Cases
- Create representative inputs that exercise the criteria
- Include edge cases: empty input, maximum size, invalid data, unicode, concurrent access
- Include golden examples: known-good outputs to compare against
- Version test cases alongside the code they evaluate

### Step 3: Run Evaluation
- Execute the system under test against all test cases
- Capture structured results: pass/fail, score, timing, resource usage
- Run deterministically — same inputs must produce same evaluation scores
- Automate execution — manual evals don't scale and drift over time

### Step 4: Score Results
- Binary scoring for hard requirements (pass/fail)
- Graduated scoring for quality metrics (0-100 scale)
- Aggregate scores with weighted averages based on criteria importance
- Compare against baseline — is this better or worse than before?

### Step 5: Identify Regressions
- Track scores over time — store results in a structured format
- Alert on threshold violations — any critical criterion failing is a blocker
- Diff against previous run — identify exactly which criteria changed
- Root-cause analysis — trace regressions to specific code changes

## Patterns

### Eval Structure
```
evals/
  criteria.yaml       # What we're measuring and thresholds
  test-cases/          # Input/expected-output pairs
  baselines/           # Previous run results for comparison
  results/             # Current run results
  report.md            # Human-readable summary
```

### Scoring Model
```yaml
criteria:
  - name: correctness
    weight: 0.4
    threshold: 95      # Minimum acceptable score
  - name: performance
    weight: 0.3
    threshold: 80
  - name: code-quality
    weight: 0.2
    threshold: 85
  - name: security
    weight: 0.1
    threshold: 100     # No security issues allowed
```

### Regression Detection
- Compare current scores against stored baselines
- Flag any criterion that dropped below its threshold
- Flag any criterion that dropped more than 5% from baseline
- Block merges when critical criteria regress

## Rules
- Every eval must have a documented baseline to compare against
- Critical criteria (security, correctness) must have 100% pass thresholds
- Evals must run in CI — local-only evals become stale
- Test cases must cover edge cases, not just happy paths
- Scores must be deterministic — flaky evals are worse than no evals

## Anti-patterns
- Evaluating without a baseline — you can't measure improvement without a reference
- Manual-only evaluation — it doesn't scale and introduces bias
- Testing only the happy path — edge cases reveal the real quality
- Ignoring score trends — a slow decline is still a decline
- Adjusting thresholds to make failing evals pass without fixing the code

## Checklist
- [ ] Criteria defined with measurable thresholds
- [ ] Test cases include happy paths and edge cases
- [ ] Baseline scores established for comparison
- [ ] Evaluation runs automatically in CI
- [ ] Scoring model weights reflect priority of criteria
- [ ] Regressions are detected and flagged
- [ ] Results are stored for trend analysis
