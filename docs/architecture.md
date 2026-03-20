# Grow CLI — Architecture

## High-Level Overview

```
User
  │
  ▼
Grow CLI (Commander.js + Ink)
  │
  ├─ pi-agent-core (agent runtime + tool calling)
  │
  ├─ ACP (JSON-RPC / stdio) ──→ CLI Agents
  │    ├─ Codex CLI (now, primary)
  │    ├─ Gemini CLI
  │    └─ Claude Code (when native ACP lands)
  │
  ├─ Direct API (HTTP) ──→ Cloud Providers
  │    ├─ Qwen (Chinese copy)
  │    ├─ DeepSeek (analysis)
  │    ├─ Doubao (Chinese social content)
  │    ├─ Kimi (long-form Chinese)
  │    └─ Any OpenAI-compatible endpoint
  │
  ├─ MCP ──→ Chrome DevTools (browser automation)
  │    ├─ Xiaohongshu (no public API)
  │    └─ Any platform without API
  │
  ├─ Platform APIs ──→ Social Media
  │    ├─ YouTube Studio API
  │    ├─ TikTok Studio API
  │    ├─ Meta Business Suite API
  │    └─ X/Twitter API
  │
  └─ StorageAdapter ──→ Pluggable Storage
       ├─ "local" driver — SQLite (~/.grow/data.db, default)
       ├─ "mysql" driver — TiDB, PlanetScale, Aurora, etc.
       └─ "postgres" driver — Supabase, Neon, plain PG, etc.
```

## Agent Communication

### ACP (Agent Client Protocol)
- JSON-RPC 2.0 over stdio
- Grow CLI spawns the agent as a subprocess
- Protocol: `initialize` → `session/new` → `session/prompt` → `session/update` (streaming)
- `session/set_mode` for switching between plan and execute modes
- Agent is swappable via config — today Codex, tomorrow Claude Code
- No API key needed — uses agent's own authentication

### Direct API Calls
- Standard HTTP to provider endpoints
- User provides their own API keys per provider
- Used for specialized tasks: Chinese copy (Qwen), analysis (DeepSeek)
- Stateless, prompt-in/text-out

## Provider Configuration

```json
// ~/.grow/config.json
{
  "providers": {
    "codex": { "protocol": "acp" },
    "gemini": { "protocol": "acp" },
    "claude": { "protocol": "acp" },
    "qwen": { "protocol": "api", "base_url": "...", "api_key": "..." },
    "deepseek": { "protocol": "api", "base_url": "...", "api_key": "..." },
    "doubao": { "protocol": "api", "base_url": "...", "api_key": "..." },
    "kimi": { "protocol": "api", "base_url": "...", "api_key": "..." }
  },
  "tasks": {
    "default": "codex",
    "chinese_copy": "qwen",
    "analysis": "deepseek",
    "chinese_social": "doubao"
  },
  "storage": {
    "driver": "local"
  }
}
```

## Plan Mode → Execute Mode Flow

```
1. grow audit <url>
   → Agent crawls site / pulls social analytics
   → Produces audit report (markdown + terminal render)

2. grow plan
   → Agent reads audit results from storage
   → Proposes marketing plan
   → Outputs plan.md
   → Human reviews, edits, approves

3. grow campaign run
   → Agent reads approved plan
   → Executes step by step:
     - Drafts content → human approves → publishes
     - Schedules posts
     - Sends emails
   → No human-in-the-loop after plan approval

4. grow report
   → Agent pulls results
   → Summarizes what worked, what didn't
   → Feeds learnings back into storage
```

## Browser Automation (Chrome DevTools MCP)

For platforms without public APIs (e.g., Xiaohongshu):

1. User launches Chrome with remote debugging: `chrome --remote-debugging-port=9222`
2. User logs into the platform manually
3. Grow CLI connects via Chrome DevTools MCP
4. Agent uses MCP tools: `navigate_page`, `evaluate_script`, `click`, `take_screenshot`
5. Extracts analytics data, posts content, etc.

Existing Xiaohongshu MCP servers can also be integrated:
- `xpzouying/xiaohongshu-mcp`
- `MilesCool/rednote-mcp`

## Storage

### Architecture
- **StorageAdapter interface** — abstract layer (`save()`, `find()`, `delete()` per collection)
- **JSON document model** — schema-less, no migrations
- **Driver-based** — configured in `~/.grow/config.json`

### Drivers

| Driver | Backend | Use case |
|--------|---------|----------|
| `local` | SQLite (`better-sqlite3`) | Default, zero config |
| `mysql` | Any MySQL-compatible | TiDB, PlanetScale, Aurora |
| `postgres` | Any PostgreSQL | Supabase, Neon, plain PG |

### Document Model

All drivers use the same schema-less document table:

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  collection TEXT,  -- 'brand', 'account', 'audit', 'campaign', 'learning'
  data JSON,
  created_at TEXT,
  updated_at TEXT
);
```

Collections:
- **brand** — brand identity, voice, guidelines
- **account** — connected platform credentials (encrypted)
- **audit** — SEO/social audit reports (markdown)
- **campaign** — marketing plans, status, execution history
- **learning** — agent insights per campaign

### Configuration

```json
// ~/.grow/config.json
{
  "storage": {
    "driver": "local"
  }
}
```

Cloud DB example:
```json
{
  "storage": {
    "driver": "mysql",
    "url": "mysql://user:pass@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/grow"
  }
}
```

## Directory Structure

```
~/.grow/
  config.json          # Provider config, API keys, preferences
  data.db              # SQLite database
  plans/               # Generated plan markdown files
  reports/             # Generated audit/campaign reports
```
