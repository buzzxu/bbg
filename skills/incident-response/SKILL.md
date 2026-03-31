---
name: incident-response
category: operations
description: Incident management covering detection, triage, mitigation, root cause analysis, post-mortem templates, and runbook maintenance
---

# Incident Response

## Overview
Load this skill when responding to production incidents, writing post-mortems, building runbooks, or establishing incident management processes. Fast, structured response minimizes user impact and prevents recurrence.

## Workflow
1. **Detect** — Alert fires or user report received; acknowledge within 5 minutes
2. **Triage** — Assess severity, assign incident commander, open communication channel
3. **Mitigate** — Restore service first; rollback, scale, failover, or feature-flag off
4. **Investigate** — Once stable, identify root cause using logs, metrics, and traces
5. **Resolve** — Deploy permanent fix with tests; verify resolution in production
6. **Post-mortem** — Document timeline, root cause, impact, and action items within 48 hours

## Key Patterns

### Severity Levels
| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| SEV1 | Complete outage, data loss risk | Immediate, all-hands | Database down, auth broken |
| SEV2 | Major feature degraded | <15 min, on-call + backup | Payments failing for subset |
| SEV3 | Minor feature impacted | <1 hour, on-call | Search results slow |
| SEV4 | Cosmetic or low-impact issue | Next business day | Tooltip not rendering |

### Mitigation Playbook
- **Rollback** — First option for bad deployments; keep previous version deployable at all times
- **Feature flag off** — Disable the problematic feature without full rollback
- **Scale up** — Add capacity if the issue is traffic or resource exhaustion
- **Failover** — Switch to standby region or replica if primary is degraded
- **Rate limit** — Throttle abusive traffic or runaway internal processes
- **Communicate** — Update status page; silence is worse than bad news

### Root Cause Analysis
- Gather timeline from alerts, deploys, and change logs
- Use the "5 Whys" technique — ask "why" iteratively until systemic cause is found
- Distinguish trigger (what changed) from root cause (why the system was fragile)
- Check for contributing factors: missing monitoring, insufficient testing, unclear runbooks

### Post-mortem Template
```
Title: [SEV level] Brief description — YYYY-MM-DD
Duration: Start time → Resolution time (total minutes)
Impact: Number of users/requests affected, revenue impact if applicable
Timeline: Chronological events from detection to resolution
Root Cause: What broke and why the system allowed it
Contributing Factors: What made detection or mitigation slower
Action Items: Each with owner, priority, and due date
Lessons Learned: What worked well, what needs improvement
```

### Runbook Maintenance
- One runbook per alert — link directly from the alert notification
- Include: symptom description, diagnostic commands, mitigation steps, escalation path
- Test runbooks during game days; update after every incident that reveals gaps
- Store runbooks in version control alongside the service they support

## Best Practices
- Blameless culture — focus on system failures, not individual mistakes
- Incident commander role — one person coordinates; others execute
- Dedicated communication channel per incident (Slack channel, bridge call)
- Update stakeholders every 30 minutes during active incidents
- Track action items from post-mortems to completion — unfinished items cause repeat incidents
- Practice incident response with game days and chaos engineering

## Anti-patterns
- Skipping post-mortems for "small" incidents — patterns only emerge from consistent review
- Blaming individuals — drives hiding of mistakes, prevents systemic improvement
- Writing action items with no owner or due date — they never get done
- Investigating root cause before restoring service — mitigate first, debug second
- Hero culture — relying on one person who "knows the system" instead of documented runbooks
- Ignoring contributing factors — fixing only the trigger guarantees recurrence

## Checklist
- [ ] Severity levels defined with clear response time expectations
- [ ] On-call rotation established with escalation path
- [ ] Runbooks exist for every critical alert
- [ ] Rollback procedure tested and documented
- [ ] Communication template ready for status page updates
- [ ] Post-mortem template adopted and used for all SEV1/SEV2 incidents
- [ ] Action items from post-mortems tracked to completion
- [ ] Game days scheduled quarterly to practice incident response
- [ ] Incident timeline tool configured (logs, metrics, deploy history correlated)
- [ ] Blameless post-mortem culture explicitly established by leadership


## Related

- **Rules**: [security](../../rules/common/security.md)
