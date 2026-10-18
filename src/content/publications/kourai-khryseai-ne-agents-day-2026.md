---
year: "2026"
venue: "North-East AI Agents Day 2026"
venue_type: conference
title: "Kourai Khryseai: Transparent Human-on-the-Loop Multi-Agent Software Development"
authors: "A. Barea"
author_ids:
  - aj-barea
link: { label: "Poster ↗", href: "https://ajbarea.github.io/kourai-khryseai/research/ne-agents-day-2026/" }
project: kourai-khryseai
---

Multi-agent coding systems are increasingly capable, but their coordination decisions are often opaque to the supervisor. Kourai Khryseai treats multi-agent software development as an interpretability problem and organizes the system around three pillars: Monitor, Communicate, and Control. A Hephaestus orchestrator routes requests to specialist agents for planning, coding, testing, style review, and commit synthesis. Every step is observable through OpenTelemetry GenAI spans and a streamed Forge transcript (Monitor); agents pause to request clarification when requirements are ambiguous (Communicate); and a bounded Kallos⇅Techne repair loop plus graceful degradation make recovery deliberate rather than an edge case (Control). The backend combines independent A2A-connected services, MCP-based tool use, shared local SQLite state, and end-to-end tracing through OpenTelemetry, Jaeger, and Prometheus. The same orchestration layer powers a CLI, desktop GUI, and visual-novel-style interface, enabling studies of interface and embodiment without changing backend logic. Claim-driven tests anchor each MCC property to a mechanism in code: transparency is treated as a systems property, not just a UX choice.
