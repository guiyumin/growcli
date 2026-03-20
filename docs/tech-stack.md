# Grow CLI — Tech Stack

## Final Stack

| Layer          | Choice                                          |
| -------------- | ----------------------------------------------- |
| Language       | TypeScript                                      |
| CLI Framework  | Commander.js                                    |
| TUI + Output   | Ink (covers colors, spinners, tables, layout)   |
| Agent Runtime  | pi-agent-core (`@mariozechner/pi-agent-core`)   |
| CLI Agents     | ACP — Codex, Gemini CLI, Claude Code (when ready) |
| API Agents     | Direct API calls — Qwen, DeepSeek, Doubao, Kimi |
| Browser        | Chrome DevTools MCP                             |
| Storage        | StorageAdapter — local (SQLite), mysql, postgres |
| Build          | tsup                                            |
| Test           | Vitest                                          |
| Package        | npm                                             |

## Key Decisions & Rationale

### TypeScript over Python
- Target users (marketers) are non-technical. `npx growcli` just works.
- Claude Code prerequisite means Node.js is already installed.
- MCP/ACP ecosystems are npm-native.
- AI ecosystem advantage of Python doesn't apply — we're making API calls, not running local models.

### Ink over pi-tui / Rich+Textual
- Ink is React for the terminal — great developer experience, composable components.
- Covers all output needs: `<Text color>` (chalk), `<Spinner>` (ora), `<Box>`, `<Table>`.
- pi-tui is good but Ink is more mature and flexible.

### ACP + Direct API over pi-ai
- pi-ai is a convenience wrapper. Direct API calls keep dependencies minimal and give full control.
- ACP is the emerging standard for CLI agent communication. No translation layer.
- Each provider speaks its native protocol: ACP for CLI agents, HTTP API for cloud providers.

### pi-agent-core
- Agent runtime with tool calling, state management.
- Used by OpenClaw in production — proven.
- Gives us the agent loop without building from scratch.

### StorageAdapter with pluggable drivers
- Local-first: default `"local"` driver uses SQLite (`better-sqlite3`), zero config, `~/.grow/data.db`.
- Schema-less: single `documents` table with JSON `data` column — no migrations.
- Cloud-optional: `"mysql"` driver for TiDB/PlanetScale/Aurora, `"postgres"` for Supabase/Neon.
- HydraDB rejected — no free tier, not open source.
- Power users can point at a cloud DB for multi-device sync; default path has zero onboarding friction.

### No @anthropic-ai/sdk
- We don't call Claude API directly.
- Claude Code is accessed via ACP (uses user's existing subscription).
- No API key needed for the primary agent.
