# AGENTS.md

This project ships Rayfin agent context.
Load `.agents/skills/rayfin/SKILL.md` and the `rayfin` MCP server in `.mcp.json` before writing Rayfin code.

For React app-code work (app structure under `src/`, pages and components, client use cases, domain models, repository ports and infrastructure adapters, the composition root and dependency injection, declarative `react-router-dom` routing, Tailwind UI, charts, and Playwright/Vitest verification), also load `.agents/skills/rayfin-clean-architecture/SKILL.md`. That skill defers to the `rayfin` skill wherever they overlap (the Rayfin data model — `@entity`/`@role` decorators and RLS — auth methods, the Rayfin client and data API, CLI, schema migration, and deployment), so follow `rayfin` first on those topics.

Rayfin docs are version-locked to the packages installed in this project.
Prefer the MCP tools `search_docs`, `get_doc`, `list_docs`, and `discover_packages` for examples, API details, and troubleshooting.
If MCP is unavailable, run `rayfin docs ...` from the project root so the CLI reads this project's `node_modules`.
If `rayfin` is not on `PATH`, use `npx -y @microsoft/rayfin-cli docs ...` from the project root.

Use `discover_packages` or `rayfin docs discover <topic>` when installed docs do not cover the task.
