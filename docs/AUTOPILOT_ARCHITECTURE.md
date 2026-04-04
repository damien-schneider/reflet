# Autopilot Architecture

Living document — maintain whenever the architecture changes.

## Agent Hierarchy & Communication

```mermaid
graph TB
    User[👤 President / User]
    CEO[🤴 CEO Agent<br/>Always On]

    subgraph "Core Pipeline"
        PM[📋 PM<br/>Feedback → Tasks]
        CTO[🧠 CTO<br/>Tasks → Specs]
        DEV[💻 Dev<br/>Specs → PRs]
    end

    subgraph "PM's Extended Team"
        GROWTH[🚀 Growth<br/>Shipped → Content]
        SUPPORT[🎧 Support<br/>Users → Escalations]
    end

    subgraph "Specialist Agents"
        SECURITY[🛡️ Security<br/>Scans & Alerts]
        ARCHITECT[📐 Architect<br/>Code Health]
        ANALYTICS[📊 Analytics<br/>Metrics & Anomalies]
        DOCS[📄 Docs<br/>Auto-Update]
        QA[🧪 QA<br/>E2E Tests]
        OPS[⚙️ Ops<br/>Deploy Health]
        SALES[💰 Sales<br/>Lead Pipeline]
    end

    User <-->|CEO Chat| CEO
    CEO -->|Coordinates| PM
    CEO -->|Coordinates| SECURITY
    CEO -->|Reports to| User

    PM -->|Creates tasks for| CTO
    PM -->|Creates tasks for| GROWTH
    PM -->|Creates tasks for| SECURITY
    CTO -->|Creates dev subtask| DEV

    SUPPORT -->|Escalates bugs/features| PM
    GROWTH -->|Uses completed tasks| DEV
    SECURITY -->|Creates fix tasks| DEV
    ARCHITECT -->|Creates refactor tasks| DEV
    QA -->|Creates test tasks| DEV

    ANALYTICS -->|Feeds insights to| PM
    OPS -->|Creates incident tasks| DEV
```

## Orchestration Flow

```mermaid
sequenceDiagram
    participant Cron as Cron (2min)
    participant Orch as Orchestrator
    participant Gate as Gate Check
    participant Prereq as Prerequisites
    participant Agent as Agent
    participant LLM as LLM
    participant DB as Database

    Cron->>Orch: runOrchestrator()
    Orch->>DB: getOrgsWithPendingWork()
    loop Each org with work
        Orch->>DB: getDispatchableTasks()
        loop Each task (max 3/tick)
            Orch->>Gate: checkGate(agent, action)
            alt Gate: blocked
                Gate-->>Orch: { proceed: false, reason }
                Orch->>DB: logActivity("Skipped: reason")
            else Gate: requires_approval
                Gate-->>Orch: { proceed: true, requiresInbox: true }
                Orch->>DB: createInboxItem(task)
            else Gate: allowed
                Orch->>Prereq: checkPrerequisites(agent)
                alt Not ready
                    Prereq-->>Orch: { ready: false }
                    Orch->>DB: logActivity("Skipping: reason") [1x/day max]
                else Ready
                    Orch->>Agent: runAgentWithTaskLifecycle()
                    Agent->>LLM: generateObject()
                    LLM-->>Agent: result
                    Agent->>DB: createInboxItem / createTask / etc
                    Agent-->>Orch: completed/failed
                end
            end
        end
    end
```

## Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: Created by PM/Support/Security/User
    pending --> in_progress: Dispatched by orchestrator
    pending --> cancelled: Agent disabled (self-heal)
    pending --> cancelled: Unrecoverable error (self-heal)
    in_progress --> completed: Agent finished successfully
    in_progress --> failed: Agent error / timeout
    in_progress --> failed: Stuck > 1 hour (self-heal)
    in_progress --> paused: Autonomy mode → stopped
    paused --> in_progress: Autonomy mode resumed
    failed --> pending: Retry (exponential backoff, max 3)
    completed --> [*]
    cancelled --> [*]
    failed --> [*]: Max retries exceeded
```

## Autonomy Modes

```mermaid
graph LR
    subgraph "Supervised (default)"
        A1[Analysis ✅ Auto]
        A2[Draft content ✅ Auto]
        A3[Create tasks ✅ Auto]
        A4[Create inbox ✅ Auto]
        A5[Create PR ⏳ Needs approval]
        A6[Send email ⏳ Needs approval]
        A7[Publish ⏳ Needs approval]
        A8[Deploy ⏳ Needs approval]
        A9[Sales outreach 🔒 Always approval]
    end

    subgraph "Full Auto"
        B1[Analysis ✅ Auto]
        B2[Draft content ✅ Auto]
        B3[Create tasks ✅ Auto]
        B4[Create PR ✅ Auto + delay]
        B5[Send email ✅ Auto + delay]
        B6[Publish ✅ Auto + delay]
        B7[Deploy ✅ Auto + delay]
        B8[Sales outreach 🔒 Always approval]
    end
```

## Task Cap System (V8)

```mermaid
graph TB
    PM[PM Agent] -->|wants to create task| CapCheck{Task Cap Check}
    CapCheck -->|per-agent cap reached| SKIP[Skip + log]
    CapCheck -->|total cap reached| SKIP
    CapCheck -->|within limits| CREATE[Create Task]
    CREATE --> Pending[(Pending Queue)]

    SH[Self-Healing Cron] -->|every 10 min| Pending
    SH -->|stuck > 1h| Failed[Mark Failed]
    SH -->|agent disabled| Cancelled[Cancel]
    SH -->|unrecoverable error| Cancelled
```

**Default Caps:**
- Max pending per agent: **2**
- Max total pending: **5**

## Prerequisites System (V8)

Each agent checks for required data before calling the LLM:

| Agent | Prerequisite | What it checks |
|-------|-------------|----------------|
| Ops | Real deployment data | OpsSnapshots with deployCount > 0 |
| Analytics | User metrics | AnalyticsSnapshots with activeUsers > 0 |
| Growth | Completed work | Completed tasks in last 7 days or feedback |
| Docs | Shipped changes | Completed tasks or support conversations |
| QA | Task specs | Pending QA tasks with acceptance criteria |
| Sales | Leads exist | At least one lead in the pipeline |
| Support | Always ready | Gracefully handles empty conversations |
| Dev | Adapter credentials | Valid credentials for configured adapter |

When prerequisites fail: no LLM call, one log message per 24h max.

## Cron Schedule

| Cron | Interval | Agent | What |
|------|----------|-------|------|
| Orchestrator | 2 min | system | Dispatch pending tasks |
| Self-healing | 10 min | system | Clean stuck/orphaned tasks |
| CEO coordination | 30 min | CEO | Cross-agent health check |
| PM analysis | 6 hours | PM | Scan feedback → create tasks |
| Ops monitoring | 1 hour | Ops | Check deployments |
| Ops snapshot | Daily 23:00 | Ops | Capture daily metrics |
| Security scan | Daily 07:00 | Security | Full OWASP scan |
| Architect review | Weekly Wed | Architect | Code health review |
| Analytics snapshot | Daily 07:30 | Analytics | Capture metrics |
| Analytics brief | Weekly Mon | Analytics | Weekly trends report |
| Docs stale check | Weekly Wed | Docs | Find outdated docs |
| Support triage | Daily 10:00 | Support | Fallback scan (event-driven primary) |
| Shipped notifications | Daily 11:00 | Support | Notify users of shipped features |
| Sales follow-up | Daily 09:00 | Sales | Check follow-up queue |
| CEO daily report | Daily 08:00 | CEO | Generate daily report |
| CEO weekly report | Weekly Mon | CEO | Generate weekly report |
| Inbox expiration | Daily 01:00 | system | Expire old pending items |
| Cost reset | Daily 00:00 | system | Reset daily cost counters |
| Intelligence scans | Daily 06:00 | system | Competitor analysis |
| Intelligence digest | Weekly Mon | system | Weekly intelligence report |

## File Structure

```
packages/backend/convex/autopilot/
├── prerequisites.ts      ← V8: Agent readiness checks
├── self_heal.ts          ← V8: Stuck task cleanup cron
├── tableFields.ts        ← Table schemas & validators
├── config.ts             ← Config management & task cap queries
├── tasks.ts              ← Task DAG management (with cap enforcement)
├── gate.ts               ← Universal autonomy gate
├── crons.ts              ← Orchestrator & cron handlers
├── mutations.ts          ← Frontend-facing mutations
├── queries.ts            ← Frontend-facing queries
├── inbox.ts              ← Inbox item management
├── dedup.ts              ← Duplicate detection
├── execution.ts          ← Task execution via adapters
├── autonomy.ts           ← Autonomy mode logic
├── cost_guard.ts         ← Cost tracking & daily caps
├── agents/
│   ├── pm.ts             ← Product prioritization + cap awareness
│   ├── cto.ts            ← Technical spec generation
│   ├── ceo.ts            ← Cross-agent coordination
│   ├── ops.ts            ← Deploy health (with prerequisites)
│   ├── analytics.ts      ← Metrics (with prerequisites)
│   ├── growth.ts         ← Content generation (with prerequisites)
│   ├── support.ts        ← Conversation triage
│   ├── sales.ts          ← Lead pipeline (with prerequisites)
│   ├── docs.ts           ← Doc freshness (with prerequisites)
│   ├── qa.ts             ← E2E test generation
│   ├── security.ts       ← Vulnerability scanning
│   ├── architect.ts      ← Code health review
│   ├── models.ts         ← LLM model definitions
│   ├── prompts.ts        ← Agent system prompts
│   └── shared.ts         ← Common utilities
├── adapters/             ← Coding adapter implementations
└── intelligence/         ← Competitor analysis module
```
