---
name: autopilot-debug
description: Debug and diagnose Reflet Autopilot issues — stuck tasks, silent agents, LLM failures, cap limits, and orchestration problems
---

# Autopilot Debug Skill

Use this skill when diagnosing why the autopilot isn't working as expected. Follow the checklist below, then produce a report.

## Diagnostic Checklist

### 1. Is autopilot enabled for the org?

```bash
bunx convex run autopilot/queries:getConfig
```

Check: `enabled: true`, `autonomyMode` is not `"stopped"`.

### 2. Are agents enabled?

```bash
bunx convex run autopilot/queries:getConfig
```

Check the `agents` object — each agent has `enabled: true/false`. Disabled agents won't receive tasks.

### 3. Are there pending tasks?

```bash
bunx convex run autopilot/queries:getDashboardStats
```

Check `pendingTasks` count. If zero, the PM hasn't created tasks yet — check PM cron logs.

### 4. Are task caps blocking new tasks?

```bash
bunx convex run autopilot/queries:getDashboardStats
```

Check `pendingTasksByAgent` against `maxPendingTasksPerAgent` (default: 2) and total pending against `maxPendingTasksTotal` (default: 5). If at cap, tasks are being silently dropped.

**Fix:** Increase caps:
```bash
bunx convex run autopilot/mutations:updateConfig '{"maxPendingTasksPerAgent": 3, "maxPendingTasksTotal": 8}'
```

### 5. Are prerequisites failing?

Check activity logs for "Skipping [agent]: [reason]" messages. Prerequisites log once per 24h max, so check recent logs:

```bash
bunx convex run autopilot/queries:getActivityLogs '{"limit": 50}'
```

Look for patterns like:
- "Skipping ops: No deployment data" → Need real deployments first
- "Skipping analytics: No user metrics" → Need real user activity first
- "Skipping growth: No completed work" → Complete some tasks first
- "Skipping sales: No leads" → Add leads to the pipeline first

### 6. Is the gate blocking actions?

```bash
bunx convex run autopilot/queries:getActivityLogs '{"limit": 50}'
```

Look for "Gate blocked:" entries. Common causes:
- Rate limit exceeded (daily action cap)
- Approval required but no one approved
- Adapter not configured

### 7. Is self-healing cleaning up correctly?

```bash
bunx convex run autopilot/queries:getDashboardStats
```

Check `failedTasks` and `cancelledTasks`. If growing, self-healing is working but tasks keep failing. Investigate the root cause in activity logs.

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No tasks created | PM prerequisites failing or PM disabled | Check PM agent enabled + feedback exists |
| Tasks stuck in pending | Orchestrator not dispatching (caps full or all agents busy) | Check caps, check agent status |
| Tasks stuck in_progress | Agent action hung or failed silently | Self-heal will catch after 1h; check LLM errors |
| Agent "skipping" every run | Prerequisites not met | Check agent-specific prerequisites |
| "Gate blocked" on every action | Rate limit or autonomy mode | Check daily limits, check autonomyMode |
| Tasks immediately cancelled | Self-heal finds agent disabled | Enable the agent or stop creating tasks for it |
| Inbox items pile up | Supervised mode, no one approving | Approve items or switch to full_auto for low-risk actions |
| LLM errors | Model quota or bad prompt | Check model availability, check error messages in logs |
| Cost cap reached | Daily spend limit hit | Wait for reset (midnight) or increase `dailyCostCapCents` |

## Report Format

After running diagnostics, produce a report:

```markdown
## Autopilot Health Report

**Org:** [name]
**Status:** 🟢 Healthy / 🟡 Degraded / 🔴 Broken
**Autonomy Mode:** [supervised/full_auto/stopped]

### Agent Status
| Agent | Enabled | Pending | Cap | Status |
|-------|---------|---------|-----|--------|

### Issues Found
1. [Issue description + fix]

### Recommendations
- [Action items]
```

## Quick Fixes

**Reset a stuck task:**
```bash
bunx convex run autopilot/mutations:updateTaskStatus '{"taskId": "<id>", "status": "failed", "error": "Manual reset"}'
```

**Force self-healing run:**
```bash
bunx convex run autopilot/self_heal:runSelfHealing
```

**Check specific agent prerequisites:**
```bash
bunx convex run autopilot/prerequisites:checkOpsPrerequisites '{"orgId": "<id>"}'
bunx convex run autopilot/prerequisites:checkAnalyticsPrerequisites '{"orgId": "<id>"}'
bunx convex run autopilot/prerequisites:checkGrowthPrerequisites '{"orgId": "<id>"}'
bunx convex run autopilot/prerequisites:checkDocsPrerequisites '{"orgId": "<id>"}'
bunx convex run autopilot/prerequisites:checkSalesPrerequisites '{"orgId": "<id>"}'
```

**View task cap usage:**
```bash
bunx convex run autopilot/config:getTaskCapUsage '{"orgId": "<id>"}'
```
