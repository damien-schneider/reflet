# Autopilot Architecture — Graphs

No orchestrator. Agents own their work, wake on conditions, communicate through a shared board. Guards ensure safety as middleware, not gatekeepers.

---

## 1. Core Model — Self-Directed Agents

```mermaid
graph LR
    subgraph "Agents check the board themselves"
        AG1["PM<br/>(wakes on conditions)"] <-->|"read / write"| BOARD["Shared Board<br/>(database)"]
        AG2["CTO<br/>(wakes on conditions)"] <-->|"read / write"| BOARD
        AG3["Dev<br/>(wakes on conditions)"] <-->|"read / write"| BOARD
    end
```

No orchestrator. No dispatcher. Each agent owns its schedule, checks the shared board, and does its work — like employees in a real company.

---

## 2. The Shared Board — Read Everything, Write Your Domain

Every agent reads the entire board. But writing is restricted — each agent can only write to its own domain, for both records and notes.

```mermaid
graph TB
    subgraph "Knowledge Base (wiki — exclusive owner writes)"
        PD["Product Definition (PM)"]
        ICP["User Personas & ICP (PM)"]
        CL["Competitive Landscape (PM)"]
        BV["Brand Voice (Growth)"]
        TA["Technical Architecture (CTO + Architect)"]
        GOALS["Goals & OKRs (CEO)"]
        ROAD["Product Roadmap (PM)"]
    end

    subgraph "Work Board (structured records — exclusive owner writes)"
        INIT["Initiatives (PM)"]
        STORIES["User Stories (PM)"]
        SPECS["Technical Specs (CTO)"]
        PRS["Pull Requests (Dev)"]
        COMP["Competitors (Growth)"]
        LEADS["Leads (Sales)"]
        FINDINGS["Security Findings (Security)"]
        CONTENT["Content Items (Growth)"]
        THREADS["Support Threads (Support)"]
        ADRS["Architecture Decisions (Architect)"]
        DOCPAGES["Doc Pages (Docs)"]
    end

    subgraph "Documents (Notion-like — any agent creates)"
        D_MR["Market Research (Growth)"]
        D_BC["Battlecards (Sales)"]
        D_AA["Architecture Analysis (Architect)"]
        D_ANY["Any type — freeform"]
    end

    subgraph "Notes (quick observations — domain-restricted)"
        NOTES["Each agent writes in its domain"]
    end

    subgraph "Inbox (user approvals)"
        INB["PRs, content, outreach, reports"]
    end

    ALL["All agents READ everything"]
    ALL -.-> PD & INIT & D_MR & NOTES & INB
```

---

## 3. Condition-Driven Agent Wake

No crons. A heartbeat checks conditions and wakes agents when there's a reason.

```mermaid
graph TB
    HEARTBEAT["Heartbeat<br/>(every few minutes)"]

    subgraph "Check conditions for each agent"
        C_PM{"PM: stories < threshold?<br/>New notes? Roadmap stale?<br/>President directive?"}
        C_CTO{"CTO: stories without specs?"}
        C_DEV{"Dev: specs without PRs?<br/>CI fix needed?"}
        C_GROWTH{"Growth: research stale?<br/>Shipped features without content?"}
        C_SALES{"Sales: new prospect notes?<br/>Follow-ups due?"}
        C_SEC{"Security: daily scan due?<br/>New dependency in PR?"}
        C_CEO{"CEO: President message?<br/>Coordination due? Report due?"}
    end

    WAKE_PM["Wake PM"]
    WAKE_CTO["Wake CTO"]
    WAKE_DEV["Wake Dev"]
    WAKE_GROWTH["Wake Growth"]
    WAKE_SALES["Wake Sales"]
    WAKE_SEC["Wake Security"]
    WAKE_CEO["Wake CEO"]
    SLEEP["Sleep (no conditions met)"]

    HEARTBEAT --> C_PM & C_CTO & C_DEV & C_GROWTH & C_SALES & C_SEC & C_CEO

    C_PM -->|"Yes"| WAKE_PM
    C_PM -->|"No"| SLEEP
    C_CTO -->|"Yes"| WAKE_CTO
    C_CTO -->|"No"| SLEEP
    C_DEV -->|"Yes"| WAKE_DEV
    C_DEV -->|"No"| SLEEP
    C_GROWTH -->|"Yes"| WAKE_GROWTH
    C_GROWTH -->|"No"| SLEEP
    C_SALES -->|"Yes"| WAKE_SALES
    C_SALES -->|"No"| SLEEP
    C_SEC -->|"Yes"| WAKE_SEC
    C_SEC -->|"No"| SLEEP
    C_CEO -->|"Yes"| WAKE_CEO
    C_CEO -->|"No"| SLEEP
```

---

## 4. Agent Execution Flow (Every Agent, Every Time)

```mermaid
graph LR
    WAKE["Agent wakes"]
    GUARDS["Guards<br/>Cost? Autonomy? Rate? Circuit?"]
    CLEAN["Self-clean<br/>Cancel stale, retry failed"]
    CONTEXT["Load context<br/>Knowledge + records + notes"]
    WORK["Do work<br/>LLM call → produce output"]
    OUTPUT["Write to board<br/>Records, notes, inbox items"]
    LOG["Log activity + cost"]
    DONE["Done"]

    WAKE --> GUARDS
    GUARDS -->|"Blocked"| LOG
    GUARDS -->|"OK"| CLEAN --> CONTEXT --> WORK --> OUTPUT --> LOG --> DONE
```

---

## 5. PM + Growth Collaboration

Growth researches the market. PM makes product decisions from Growth's findings. Like a real company.

```mermaid
sequenceDiagram
    participant Growth as Growth
    participant Board as Shared Board
    participant PM as PM
    participant CTO as CTO
    participant Dev as Dev

    Note over Growth: Wakes: market research is stale

    Growth->>Board: Search Reddit, HN, GitHub, competitors
    Growth->>Board: Leave notes: "12 threads about playlist sharing"
    Growth->>Board: Leave notes: "Competitor X launched offline mode"

    Note over PM: Wakes: new notes from Growth

    PM->>Board: Read notes + feedback + knowledge base
    PM->>PM: Think: what use cases / features / fixes?
    PM->>Board: Create Initiative: "Social Sharing Features"
    PM->>Board: Create User Stories with acceptance criteria
    PM->>Board: Update Roadmap doc

    Note over CTO: Wakes: stories without specs

    CTO->>Board: Read top-priority user story
    CTO->>Board: Write technical spec

    Note over Dev: Wakes: specs without PRs

    Dev->>Board: Read spec
    Dev->>Board: Create PR via coding adapter
```

---

## 6. CEO Relay — President Commands Flow to Agents

```mermaid
sequenceDiagram
    participant President as President
    participant CEO as CEO
    participant Board as Shared Board
    participant PM as PM
    participant Growth as Growth

    President->>CEO: "Focus on enterprise features this quarter"

    CEO->>Board: Update Goals doc: "Q2 focus: enterprise"
    CEO->>Board: Leave note to PM: "President wants enterprise focus"
    CEO->>Board: Leave note to Growth: "Shift research to enterprise market"
    CEO->>President: "Done. Updated goals, notified PM and Growth."

    Note over PM: Wakes: President directive via CEO note

    PM->>Board: Read CEO's note + updated Goals
    PM->>Board: Reprioritize roadmap toward enterprise stories
    PM->>Board: Create enterprise-focused user stories

    Note over Growth: Wakes: CEO note about enterprise

    Growth->>Board: Research enterprise market segments
    Growth->>Board: Leave notes about enterprise opportunities
```

---

## 7. Onboarding — No Hard Gate

```mermaid
sequenceDiagram
    participant User as President
    participant System as Reflet
    participant Growth as Growth
    participant Security as Security
    participant PM as PM

    User->>System: Connect GitHub repo
    System->>System: Analyze repo → Company Brief (7 docs)
    System->>User: Present Company Brief

    Note over System: Agents start immediately — no gate

    par Background work (brief pending)
        Growth->>Growth: Wake condition met → research market
        Growth->>System: Leave notes (stored for PM)
        Security->>Security: Wake condition met → baseline scan
        Security->>System: Leave findings
    end

    User->>System: Approve Company Brief

    Note over PM: Wakes: new notes from Growth + approved brief

    PM->>PM: Read Growth's research + knowledge base
    PM->>System: Create first initiatives + stories

    Note over System: Full pipeline flowing
```

---

## 8. Self-Cleaning

```mermaid
graph TB
    subgraph "Every Agent (on wake)"
        A_CLEAN1["Cancel own tasks pending > 7 days"]
        A_CLEAN2["Retry own failed tasks (< max retries)"]
        A_CLEAN3["Archive own completed work > 30 days"]
    end

    subgraph "CEO Coordination (~4h)"
        CEO_1["Bottleneck? Stories piling up<br/>with no specs?"]
        CEO_2["Starvation? Agent with 0 work<br/>for 3+ days?"]
        CEO_3["Conflict? Contradictory<br/>knowledge docs?"]
        CEO_4["Cascade? 5+ failures<br/>in 10 min?"]

        CEO_1 -->|"Yes"| FIX1["Leave note for CTO: backlog growing"]
        CEO_2 -->|"Yes"| FIX2["Leave note for idle agent:<br/>suggested work"]
        CEO_3 -->|"Yes"| FIX3["Flag to President"]
        CEO_4 -->|"Yes"| FIX4["Pause all + alert President"]
    end
```

---

## 9. Guards — Middleware, Not Orchestrator

```mermaid
graph LR
    WAKE["Agent wakes"] --> COST{"Budget?"}
    COST -->|"Exhausted"| STOP["Skip"]
    COST -->|"OK"| AUTO{"Autonomy?"}
    AUTO -->|"Stopped"| STOP
    AUTO -->|"Supervised + external action"| INBOX["Route to inbox"]
    AUTO -->|"OK"| RATE{"Rate limit?"}
    RATE -->|"Exceeded"| BACK["Backoff"]
    RATE -->|"OK"| CIRCUIT{"Circuit breaker?"}
    CIRCUIT -->|"Tripped"| WAIT["Wait for reset"]
    CIRCUIT -->|"OK"| RUN["Execute"]
```

---

## 10. Full System

```mermaid
graph TB
    subgraph "Inputs"
        REPO["GitHub Repo"]
        USERS["User Feedback"]
        MARKET["Market"]
        PRESIDENT["President"]
    end

    subgraph "Knowledge Base"
        KB["7 Living Docs"]
    end

    subgraph "Agents (self-directed)"
        CEO_A["CEO"]
        PM_A["PM"]
        CTO_A["CTO"]
        DEV_A["Dev"]
        GRO_A["Growth"]
        SAL_A["Sales"]
        SEC_A["Security"]
        ARC_A["Architect"]
        SUP_A["Support"]
        DOC_A["Docs"]
    end

    subgraph "Work Board"
        INIT_B["Initiatives + Stories"]
        SPECS_B["Specs + PRs"]
        NOTES_B["Notes"]
        LEADS_B["Leads + Content"]
    end

    subgraph "User Interface"
        INBOX_B["Inbox"]
        DASH["Dashboard"]
        CHAT["CEO Chat"]
    end

    REPO --> KB
    USERS --> NOTES_B
    MARKET --> GRO_A
    PRESIDENT --> CEO_A

    KB --> PM_A & CTO_A & GRO_A & SAL_A

    GRO_A -->|"market notes (own domain)"| NOTES_B
    SUP_A -->|"user pattern notes (own domain)"| NOTES_B
    SEC_A -->|"vulnerability notes (own domain)"| NOTES_B
    SAL_A -->|"prospect notes (own domain)"| NOTES_B
    ARC_A -->|"tech debt notes (own domain)"| NOTES_B

    NOTES_B --> PM_A
    PM_A --> INIT_B
    INIT_B --> CTO_A --> SPECS_B
    SPECS_B --> DEV_A

    DEV_A -->|"shipped"| GRO_A & DOC_A & SAL_A
    DEV_A --> ARC_A & SEC_A

    CEO_A --> INBOX_B & DASH
    DEV_A --> INBOX_B
    GRO_A --> INBOX_B
    SAL_A --> INBOX_B

    PRESIDENT --> CHAT --> CEO_A
```

---

## 11. Self-Correcting Company — Knowledge Change Cascade

When the Product Definition changes (pivot, new feature focus, scope change), everything downstream adapts automatically.

```mermaid
graph TB
    CHANGE["Knowledge Doc Updated<br/>(by user or agent)"]

    CASCADE["Check dependency map:<br/>What depends on this doc?"]

    FLAG_DOCS["Flag dependent docs as STALE"]
    FLAG_RECORDS["Flag linked records for REVIEW"]
    FLAG_TASKS["Flag related tasks for RE-EVAL"]

    subgraph "Agents respond on next wake"
        GRO_RESP["Growth: archive stale research,<br/>re-run market scan"]
        PM_RESP["PM: re-evaluate initiatives,<br/>cancel outdated tasks"]
        SAL_RESP["Sales: re-evaluate prospect fit,<br/>update battlecards"]
        DOC_RESP["Docs: flag stale docs<br/>for rewrite"]
    end

    CHANGE --> CASCADE
    CASCADE --> FLAG_DOCS & FLAG_RECORDS & FLAG_TASKS
    FLAG_DOCS --> GRO_RESP & DOC_RESP
    FLAG_RECORDS --> SAL_RESP
    FLAG_TASKS --> PM_RESP
```

## 12. Bottom-Up Change Propagation

Agents can propose changes to the Knowledge Base, not just leave notes.

```mermaid
sequenceDiagram
    participant Growth as Growth
    participant Board as Shared Board
    participant PM as PM
    participant CEO as CEO

    Growth->>Board: Discovers market has shifted
    Growth->>Board: Proposes update to Product Definition
    Growth->>Board: Creates inbox item: "Product Definition update proposed"

    PM->>Board: Reviews proposal
    PM->>Board: Approves + updates Product Definition

    Note over Board: Change cascades automatically

    Board-->>Growth: Competitive Landscape flagged stale
    Board-->>PM: Roadmap flagged for re-evaluation
    Board-->>CEO: Knowledge drift detected in coordination check
```

## 13. Why This Can't Stop

| Failure mode | Why it can't happen |
|---|---|
| PM finds nothing → 0 tasks | PM reads Growth's notes + Knowledge Base. Growth researches daily. Pipeline never empty. |
| No orchestrator → nothing runs | Each agent owns its schedule via heartbeat conditions. No central point of failure. |
| Company Brief not approved → blocked | No hard gate. Agents work in background. Brief approval unlocks full pipeline. |
| Task caps full with stale work | Each agent cleans own stale tasks on every wake. Caps count pending + in_progress. |
| One agent fails → cascade | Agents are independent. One failing doesn't affect others. CEO detects patterns. |
| No market research → no leads | Growth researches market independently. Sales also discovers its own leads from GitHub/community. |
| President goes silent | Company keeps running on its own strategy. CEO sends weekly digest to re-engage. |
| Product pivots → old work invalid | Knowledge change cascade automatically flags stale data. Agents archive old work and re-align. |
| Agent uses wrong product context | No silent fallbacks — agents halt if knowledge is missing. No generic placeholder text anywhere. |
| Bottom-up insight contradicts strategy | Agents propose knowledge doc updates. PM/CEO approves. Cascade realigns the company. |
