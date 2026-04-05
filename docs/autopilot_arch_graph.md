# Autopilot Architecture — Graphs

No orchestrator. Agents own their work, wake on conditions, communicate through a shared board. Two unified data models: WorkItems (hierarchy) + Documents (content). Guards ensure safety as middleware.

---

## 1. Core Model — Self-Directed Agents + Unified Data

```mermaid
graph LR
    subgraph "Agents check the board themselves"
        AG1["PM"] <-->|"read / write"| BOARD["Shared Board"]
        AG2["CTO"] <-->|"read / write"| BOARD
        AG3["Dev"] <-->|"read / write"| BOARD
        AG4["Growth"] <-->|"read / write"| BOARD
        AG5["Sales"] <-->|"read / write"| BOARD
        AG6["Support"] <-->|"read / write"| BOARD
    end

    subgraph "Two Unified Models"
        WI["autopilotWorkItems<br/>initiative → story → spec → task"]
        DOCS["autopilotDocuments<br/>research, notes, content, emails"]
    end

    BOARD --- WI
    BOARD --- DOCS
```

---

## 2. The Shared Board — Unified Data Models

```mermaid
graph TB
    subgraph "Knowledge Base (7 versioned docs)"
        PD["Product Definition"]
        ICP["User Personas & ICP"]
        CL["Competitive Landscape"]
        BV["Brand Voice"]
        TA["Technical Architecture"]
        GOALS["Goals & OKRs"]
        ROAD["Product Roadmap"]
    end

    subgraph "Work Items (one table, parent/child)"
        INIT["type: initiative"]
        STORY["type: story"]
        SPEC["type: spec"]
        TASK["type: task"]
        BUG["type: bug"]
        INIT -->|parentId| STORY
        STORY -->|parentId| SPEC
        SPEC -->|parentId| TASK
    end

    subgraph "Documents (one table, type/tag)"
        D_MR["type: market_research"]
        D_BP["type: blog_post"]
        D_NOTE["type: note"]
        D_EMAIL["type: email"]
        D_SUPPORT["type: support_thread"]
    end

    subgraph "Specialized"
        COMP["Competitors"]
        LEADS["Leads"]
        REVENUE["Revenue"]
    end

    subgraph "Inbox (filtered view)"
        INB["WorkItems + Documents<br/>where needsReview = true"]
    end
```

---

## 3. Work Item Hierarchy

```mermaid
graph TD
    I["Initiative<br/>(PM creates)"]
    S1["Story 1<br/>(PM creates)"]
    S2["Story 2<br/>(PM creates)"]
    SP1["Spec<br/>(CTO creates)"]
    SP2["Spec<br/>(CTO creates)"]
    T1["Task<br/>(Dev executes)"]
    T2["Task<br/>(Dev executes)"]

    I -->|parentId| S1
    I -->|parentId| S2
    S1 -->|parentId| SP1
    S2 -->|parentId| SP2
    SP1 -->|parentId| T1
    SP2 -->|parentId| T2

    style I fill:#818cf8,color:#fff
    style S1 fill:#60a5fa,color:#fff
    style S2 fill:#60a5fa,color:#fff
    style SP1 fill:#a78bfa,color:#fff
    style SP2 fill:#a78bfa,color:#fff
    style T1 fill:#34d399,color:#fff
    style T2 fill:#34d399,color:#fff
```

---

## 4. Work-Driven Agent Wake (No Time Fallbacks)

```mermaid
graph TB
    HEARTBEAT["Heartbeat<br/>(every 3 minutes)"]
    GUARDS{"Guards OK?<br/>Cost / Autonomy / Rate"}

    subgraph "Check BOARD STATE for each agent"
        C_PM{"PM: no initiatives?<br/>New notes? Stories low?"}
        C_CTO{"CTO: stories in todo?"}
        C_DEV{"Dev: approved specs?<br/>Failed runs?"}
        C_GROWTH{"Growth: no research?<br/>Shipped without content?"}
        C_SALES{"Sales: discovered leads?<br/>Follow-ups overdue?"}
        C_CEO{"CEO: stuck reviews?<br/>Agent errors?"}
        C_SUPPORT{"Support: draft threads?"}
    end

    CAP{"Pipeline full?"}
    WAKE["Wake agent"]
    SLEEP["Sleep — no work"]

    HEARTBEAT --> GUARDS
    GUARDS -->|"Blocked"| SLEEP
    GUARDS -->|"OK"| C_PM & C_CTO & C_DEV & C_GROWTH & C_SALES & C_CEO & C_SUPPORT

    C_PM -->|"Work exists"| CAP
    CAP -->|"Full"| SLEEP
    CAP -->|"Capacity"| WAKE
    C_CTO -->|"Work exists"| WAKE
    C_DEV -->|"Work exists"| WAKE
    C_GROWTH -->|"Work exists"| WAKE
    C_SALES -->|"Work exists"| WAKE
    C_CEO -->|"Work exists"| WAKE
    C_SUPPORT -->|"Work exists"| WAKE

    C_PM -->|"No work"| SLEEP
    C_CTO -->|"No work"| SLEEP
    C_DEV -->|"No work"| SLEEP
    C_GROWTH -->|"No work"| SLEEP
    C_SALES -->|"No work"| SLEEP
    C_CEO -->|"No work"| SLEEP
    C_SUPPORT -->|"No work"| SLEEP
```

---

## 5. Agent Execution Flow

```mermaid
graph LR
    WAKE["Agent wakes"]
    GUARDS["Guards<br/>Cost? Autonomy? Rate? Circuit?"]
    KNOWLEDGE["Load knowledge<br/>7 wiki docs"]
    CONTEXT["Load context<br/>Work items + documents"]
    WORK["LLM call<br/>Produce output"]
    OUTPUT["Write to board<br/>Work items + documents"]
    LOG["Log activity"]

    WAKE --> GUARDS
    GUARDS -->|"Blocked"| LOG
    GUARDS -->|"OK"| KNOWLEDGE --> CONTEXT --> WORK --> OUTPUT --> LOG
```

---

## 6. PM + Growth Pipeline

```mermaid
sequenceDiagram
    participant Growth as Growth
    participant Board as Shared Board
    participant PM as PM
    participant CTO as CTO
    participant Dev as Dev

    Growth->>Board: Create document (type: note)<br/>"12 threads about playlist sharing"
    Growth->>Board: Create document (type: market_research)<br/>with relevance score + sources

    PM->>Board: Read Growth's documents + knowledge base
    PM->>Board: Create work item (type: initiative)
    PM->>Board: Create work items (type: story, parent: initiative)

    CTO->>Board: Read stories without specs
    CTO->>Board: Create work item (type: spec, parent: story)

    Dev->>Board: Read spec
    Dev->>Board: Execute via adapter → update work item with prUrl
```

---

## 7. CEO Relay

```mermaid
sequenceDiagram
    participant President as President
    participant CEO as CEO
    participant Board as Shared Board
    participant PM as PM

    President->>CEO: "Focus on enterprise this quarter"
    CEO->>Board: Update Goals knowledge doc
    CEO->>Board: Create document (type: note) for PM
    CEO->>President: "Updated goals, notified PM."

    PM->>Board: Read CEO's note + updated Goals
    PM->>Board: Reprioritize work items toward enterprise
```

---

## 8. Inbox Flow (needsReview flag)

```mermaid
sequenceDiagram
    participant Agent as Any Agent
    participant Board as Shared Board
    participant President as President

    Agent->>Board: Create work item/document<br/>needsReview: true

    President->>Board: View Inbox (query needsReview = true)
    President->>Board: Approve → patches needsReview: false
    
    Note over Board: No separate inbox table.<br/>The item itself tracks review state.
```

---

## 9. Guards — Middleware, Not Orchestrator

```mermaid
graph LR
    WAKE["Agent wakes"] --> COST{"Budget?"}
    COST -->|"Exhausted"| STOP["Skip + log"]
    COST -->|"OK"| AUTO{"Autonomy mode?"}
    AUTO -->|"Stopped"| STOP
    AUTO -->|"OK"| RATE{"Rate limit?"}
    RATE -->|"Exceeded"| BACK["Backoff"]
    RATE -->|"OK"| CIRCUIT{"Circuit breaker?"}
    CIRCUIT -->|"Tripped"| WAIT["Pause 30min"]
    CIRCUIT -->|"OK"| RUN["Execute"]
```

---

## 10. Full System

```mermaid
graph TB
    subgraph "Inputs"
        REPO["GitHub Repo"]
        MARKET["Market"]
        PRESIDENT["President"]
    end

    subgraph "Knowledge Base"
        KB["7 Living Docs"]
    end

    subgraph "Agents"
        CEO_A["CEO"]
        PM_A["PM"]
        CTO_A["CTO"]
        DEV_A["Dev"]
        GRO_A["Growth"]
        SAL_A["Sales"]
        SUP_A["Support"]
    end

    subgraph "Unified Data"
        WI["Work Items<br/>initiative → story → spec → task"]
        DOCS["Documents<br/>research, notes, content, emails"]
        LEADS_B["Leads"]
        COMP_B["Competitors"]
    end

    subgraph "User Interface"
        INBOX_B["Inbox<br/>(needsReview view)"]
        DASH["Dashboard"]
        CHAT["CEO Chat"]
    end

    REPO --> KB
    MARKET --> GRO_A
    PRESIDENT --> CEO_A

    KB --> PM_A & CTO_A & GRO_A & SAL_A

    GRO_A -->|"documents (notes, research)"| DOCS
    GRO_A -->|"competitors"| COMP_B
    SUP_A -->|"documents (support_thread)"| DOCS
    SAL_A -->|"leads"| LEADS_B
    SAL_A -->|"documents (email drafts)"| DOCS

    DOCS --> PM_A
    PM_A --> WI
    WI --> CTO_A --> WI
    WI --> DEV_A

    DEV_A -->|"shipped"| GRO_A & SAL_A

    WI & DOCS -->|"needsReview"| INBOX_B
    CEO_A --> DASH

    PRESIDENT --> CHAT --> CEO_A
```

---

## 11. Knowledge Change Cascade

```mermaid
graph TB
    CHANGE["Knowledge Doc Updated"]
    CASCADE["Check dependency map"]
    FLAG["Flag downstream data as STALE"]

    subgraph "Agents respond on next wake"
        GRO["Growth: re-research"]
        PM["PM: re-evaluate initiatives"]
        SAL["Sales: re-evaluate prospects"]
    end

    CHANGE --> CASCADE --> FLAG
    FLAG --> GRO & PM & SAL
```
