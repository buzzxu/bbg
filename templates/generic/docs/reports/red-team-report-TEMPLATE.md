# Red Team Report

**Project:** <!-- AI-FILL: project name -->
**Date:** <!-- AI-FILL: YYYY-MM-DD -->
**Tester:** <!-- AI-FILL: agent or human name -->
**Workflow ID:** <!-- AI-FILL: workflow_id if part of a workflow -->

---

## Executive Summary

**Verdict:** <!-- AI-FILL: PASS | CONDITIONAL | BLOCK -->

| Severity | Count | Status |
| --- | --- | --- |
| Critical | <!-- AI-FILL --> | <!-- AI-FILL: all fixed / N open --> |
| High | <!-- AI-FILL --> | <!-- AI-FILL --> |
| Medium | <!-- AI-FILL --> | <!-- AI-FILL --> |
| Low | <!-- AI-FILL --> | <!-- AI-FILL --> |
| Info | <!-- AI-FILL --> | <!-- AI-FILL --> |

**Total Findings:** <!-- AI-FILL -->
**Endpoints Tested:** <!-- AI-FILL -->
**Attack Categories Tested:** <!-- AI-FILL: N/22 -->

---

## Round 1: Systematic Sweep

**Duration:** <!-- AI-FILL: Xm Ys -->
**Endpoints Checked:** <!-- AI-FILL -->
**Categories Checked:** <!-- AI-FILL: N/22 -->

### Findings Matrix

| Endpoint | AA | IV | BL | RC | DS | ST |
| --- | --- | --- | --- | --- | --- | --- |
| <!-- AI-FILL: endpoint --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> |

### Round 1 Findings

#### Finding R1-001: <!-- AI-FILL: title -->

- **ID:** <!-- AI-FILL -->
- **Attack ID:** <!-- AI-FILL -->
- **Domain:** <!-- AI-FILL -->
- **Endpoint:** <!-- AI-FILL -->
- **Severity:** <!-- AI-FILL -->
- **Score:** <!-- AI-FILL -->
- **Description:** <!-- AI-FILL -->
- **Reproduction Steps:**
  1. <!-- AI-FILL -->
  2. <!-- AI-FILL -->
- **Evidence:** <!-- AI-FILL -->
- **Remediation:** <!-- AI-FILL -->
- **Status:** <!-- AI-FILL -->

<!-- Repeat per finding -->

---

## Round 2: Adversarial Creative Attack

**Duration:** <!-- AI-FILL: Xm Ys -->
**Attack Chains Explored:** <!-- AI-FILL -->

### Attack Chain C-001: <!-- AI-FILL: title -->

- **Chain ID:** C-001
- **Preconditions:** <!-- AI-FILL -->
- **Steps:**
  1. <!-- AI-FILL -->
  2. <!-- AI-FILL -->
  3. <!-- AI-FILL -->
- **Impact:** <!-- AI-FILL -->
- **Severity:** <!-- AI-FILL -->
- **Score:** <!-- AI-FILL -->
- **Mitigation:** <!-- AI-FILL -->
- **Status:** <!-- AI-FILL -->

### Additional Round 2 Findings

#### Finding R2-001: <!-- AI-FILL: title -->

- **Attack ID:** <!-- AI-FILL -->
- **Type:** <!-- AI-FILL: timing/boundary/creative -->
- **Description:** <!-- AI-FILL -->
- **Severity:** <!-- AI-FILL -->
- **Score:** <!-- AI-FILL -->
- **Status:** <!-- AI-FILL -->

---

## Remediation Summary

| Priority | Finding ID | Title | Severity | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | <!-- AI-FILL --> | <!-- AI-FILL --> | Critical | <!-- AI-FILL --> | <!-- AI-FILL --> |
| 2 | <!-- AI-FILL --> | <!-- AI-FILL --> | High | <!-- AI-FILL --> | <!-- AI-FILL --> |

---

## Risk Acceptance

| Finding ID | Title | Severity | Justification | Accepted By | Date |
| --- | --- | --- | --- | --- | --- |
| <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> |

---

## Appendix

### Endpoint Inventory

| Method | Path | Auth Required | Description |
| --- | --- | --- | --- |
| <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> | <!-- AI-FILL --> |

### SQLite Records

- Round 1 ID: <!-- AI-FILL -->
- Round 2 ID: <!-- AI-FILL -->
- Total findings recorded: <!-- AI-FILL -->
- Total chains recorded: <!-- AI-FILL -->
- Query: `SELECT * FROM red_team_rounds WHERE workflow_id = '<workflow_id>'`
