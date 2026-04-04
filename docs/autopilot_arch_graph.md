# Autopilot Architecture — Mermaid Graphs (Current)

## Agent Hierarchy

```mermaid
graph TB
    President["President (User)"]
    CEO["CEO — Strategy & Coordination"]

    subgraph "Core Pipeline (Always Active)"
        PM["PM — Market Research & Roadmap"]
        CTO["CTO — Technical Strategy & Specs"]
        DEV["Dev — Code Execution & PRs"]
    end

    subgraph "Phased Activation"
        SECURITY["Security — Vulnerability Scanning"]
        ARCHITECT["Architect — Code Health"]
        GROWTH["Growth — Distribution & Content"]
        SALES["Sales — Prospecting & Pipeline"]
        SUPPORT["Support — User Conversations"]
        DOCS["Docs — Documentation Freshness"]
    end

    President <-->|"CEO Chat"| CEO
    CEO -->|"Goals & Strategy"| PM
    CEO -->|"Coordination"| CTO
    CEO -->|"Reports"| President

    PM -->|"User Stories"| CTO
    PM -->|"Roadmap"| GROWTH
    PM -->|"ICP & Signals"| SALES
    CTO -->|"Specs & Tasks"| DEV
    CTO -->|"Architecture"| ARCHITECT

    DEV -->|"PRs"| ARCHITECT
    DEV -->|"PRs"| SECURITY
    GROWTH -->|"Content"| SALES
    SUPPORT -->|"Signals"| PM
    SALES -->|"Signals"| PM
    SECURITY -->|"Signals"| PM
    ARCHITECT -->|"Signals"| PM
```

## Three Data Layers

```mermaid
graph TB
    subgraph "Layer 1: Knowledge Base"
        direction LR
        PD["Product Definition"]
        ICP["User Personas & ICP"]
        CL["Competitive Landscape"]
        BV["Brand Voice"]
        TA["Technical Architecture"]
        GOALS["Goals & OKRs"]
        ROAD["Product Roadmap"]
    end

    subgraph "Layer 2: Structured Records"
        direction LR
        INIT["Initiatives"]
        STORIES["User Stories"]
        SPECS["Technical Specs"]
        TASKS["Dev Tasks"]
        PRS["Pull Requests"]
        LEADS["Leads & Contacts"]
        FINDINGS["Security Findings"]
        THREADS["Support Threads"]
        CONTENT["Content Items"]
        ADRS["Architecture Decisions"]
        DOCPAGES["Doc Pages"]
    end

    subgraph "Layer 3: Signals"
        direction LR
        MO["Market Opportunity"]
        FRP["Feature Request Pattern"]
        TD["Technical Debt"]
        SA["Security Alert"]
        CM["Competitive Move"]
        USS["User Sentiment Shift"]
        GI["Growth Insight"]
        IP["Initiative Proposal"]
    end

    AGENTS["All Agents READ all layers"]
    AGENTS -.->|"read"| PD
    AGENTS -.->|"read"| INIT
    AGENTS -.->|"read"| MO

    PM_W["PM writes"] -->|"exclusive"| PD
    PM_W -->|"exclusive"| ICP
    PM_W -->|"exclusive"| CL
    PM_W -->|"exclusive"| ROAD
    PM_W -->|"exclusive"| INIT
    PM_W -->|"exclusive"| STORIES

    ANY["Any Agent writes"] -->|"open"| MO
    ANY -->|"open"| IP
```

## Feature Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Discovery: Signal detected or market research
    Discovery --> Definition: PM creates initiative
    Definition --> Specification: CTO writes tech spec
    Specification --> Development: Dev builds PR
    Development --> Review: PR submitted
    Review --> Shipped: Architect + Security approve, merged
    Shipped --> Distribution: Growth creates content
    Distribution --> Measurement: PM evaluates metrics

    state Review {
        [*] --> ArchitectReview
        ArchitectReview --> SecurityScan
        SecurityScan --> CICheck
        CICheck --> Approved
        CICheck --> FixNeeded
        FixNeeded --> [*]: Dev fixes, resubmits
    }

    Measurement --> [*]: Roadmap adjusted
    Measurement --> Discovery: New signals from impact analysis
```

## Orchestration Flow

```mermaid
sequenceDiagram
    participant Cron as Cron (2 min)
    participant Orch as Orchestrator
    participant Budget as Cost Guard
    participant Gate as Autonomy Gate
    participant Slots as Slot Allocator (3 max)
    participant Agent as Agent
    participant LLM as LLM (fallback chain)
    participant DB as Knowledge + Records + Signals

    Cron->>Orch: tick
    Orch->>DB: getEnabledOrgs()

    loop Each org
        Orch->>Budget: checkBudget()
        alt Budget exhausted
            Budget-->>Orch: STOP (CEO sends summary)
        else Budget 80%+
            Budget-->>Orch: DEGRADE (critical agents only)
        else Budget OK
            Budget-->>Orch: PROCEED
        end

        Orch->>DB: getDispatchableTasks(priority-sorted)

        loop Each task (up to 3 slots)
            Orch->>Gate: checkAutonomy(agent, action)
            alt Requires approval
                Orch->>DB: createInboxItem()
            else Allowed
                Orch->>Slots: allocateSlot(priority)
                Slots->>Agent: execute()
                Agent->>DB: loadContext(knowledge summaries + relevant records)
                Agent->>LLM: generateObject()
                LLM-->>Agent: result
                Agent->>DB: writeRecords() + raiseSignals()
                Agent-->>Orch: completed / failed
            end
        end
    end
```

## Onboarding Sequence

```mermaid
sequenceDiagram
    participant User as President
    participant System as Reflet
    participant PM as PM Agent
    participant CTO as CTO Agent
    participant CEO as CEO Agent

    User->>System: Connect GitHub repo
    System->>System: Clone & analyze (tech stack, architecture, patterns)
    System->>PM: Generate Product Definition
    System->>PM: Generate User Personas & ICP
    System->>PM: Scan market → Competitive Landscape
    System->>PM: Generate Initial Roadmap (3-5 initiatives)
    System->>CTO: Generate Technical Architecture doc
    System->>CEO: Seed starter Goals & OKRs
    System->>System: Infer Brand Voice from existing copy

    System->>User: Present Company Brief
    User->>System: Review, edit, approve

    Note over System: HARD GATE — nothing runs before approval

    System->>PM: Begin market research cycle
    System->>CTO: Begin spec generation for top initiative
    System->>CEO: Begin coordination loop
```

## Agent Activation

```mermaid
graph LR
    subgraph "Always Active"
        CEO_A["CEO"]
        PM_A["PM"]
        CTO_A["CTO"]
        DEV_A["Dev"]
    end

    subgraph "Auto-Activates"
        SEC["Security<br/>Immediately (lightweight scans)"]
        ARCH["Architect<br/>After 5+ PRs merged"]
        GRO["Growth<br/>First feature shipped"]
        SAL["Sales<br/>ICP defined + content published"]
        SUP["Support<br/>Support channel configured"]
        DOC["Docs<br/>3+ features shipped"]
    end

    subgraph "Manual Activation"
        HIRE["User clicks 'Hire' button<br/>to activate any agent early"]
    end

    HIRE -.->|"override"| SEC
    HIRE -.->|"override"| ARCH
    HIRE -.->|"override"| GRO
    HIRE -.->|"override"| SAL
    HIRE -.->|"override"| SUP
    HIRE -.->|"override"| DOC
```

## Priority System

```mermaid
graph TB
    P1["1. President Directives<br/>(user commands, manual edits)"]
    P2["2. Goal Alignment<br/>(contributes to active OKRs)"]
    P3["3. Urgency Tier<br/>(critical > bug > feature > refactor)"]
    P4["4. Initiative Completion Boost<br/>(+20% at >60% done)"]
    P5["5. Age Boost<br/>(+5% per day pending)"]
    P6["6. Signal Strength<br/>(multiple signals = higher priority)"]
    P7["7. Cost Efficiency<br/>(prefer cheap tasks when budget low)"]

    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7
```

## Bottleneck Detection

```mermaid
graph LR
    STORIES["Stories<br/>(awaiting spec)"] -->|"3x ratio?"| SPECS["Specs<br/>(awaiting dev)"]
    SPECS -->|"3x ratio?"| DEV["Dev<br/>(in progress)"]
    DEV -->|"3x ratio?"| REVIEW["Review<br/>(awaiting review)"]

    STORIES -->|"bottleneck detected"| ALERT["CEO Alert"]
    SPECS -->|"bottleneck detected"| ALERT
    DEV -->|"bottleneck detected"| ALERT
    REVIEW -->|"bottleneck detected"| ALERT
```

## Graceful Degradation

```mermaid
graph TB
    NORMAL["Normal Operation<br/>All agents active"]
    BUDGET80["Budget 80%<br/>Skip Growth, Docs, Sales"]
    BUDGET100["Budget Exhausted<br/>CEO summary only"]
    INBOX40["Inbox >40<br/>Critical items only"]
    PROVIDER["LLM Provider Down<br/>Queue + backoff + fallback chain"]
    AGENT_FAIL["Agent 3x Consecutive Fails<br/>Disable agent, alert CEO"]
    CASCADE["5 Agents Fail in 10min<br/>Pause ALL 30min, alert President"]
    INACTIVE["User Inactive 7+ Days<br/>Essential mode (security + cost tracking)"]

    NORMAL -->|"budget pressure"| BUDGET80
    BUDGET80 -->|"budget exhausted"| BUDGET100
    NORMAL -->|"inbox pressure"| INBOX40
    NORMAL -->|"LLM error"| PROVIDER
    NORMAL -->|"agent error"| AGENT_FAIL
    AGENT_FAIL -->|"cascade"| CASCADE
    NORMAL -->|"user absent"| INACTIVE
```
