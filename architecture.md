# Architecture

## High-Level Diagram
```mermaid
graph TD
    UI[Three Chat Pages Next.js] --> Lead[Lead Orchestrator Ollama]
    Lead --> MCP[MCP Servers: FS, GitHub, Postgres, Delegation]
    Lead --> MemPalace[MemPalace]
    Lead --> AutoGPT[AutoGPT Sub-Tasks]
    MCP --> Agents[3rd-Party: Roo Code, Copilot]
    Agents --> MCP
    Lead --> Grok[Hourly Grok 4.1 Fast]
```

## Components
- **Lead**: Planning/delegation/review.
- **MCP**: Gateway for all I/O.
- **Memory**: MemPalace for persistence.
- **Agents**: External coding only.
- **State**: Shared DB/storage.
- **UI**: Transparent monitoring.

Details in [plans/main-plan.md](plans/main-plan.md).