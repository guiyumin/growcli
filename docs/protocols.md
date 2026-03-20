# Grow CLI — Protocols & Integrations

## ACP (Agent Client Protocol)

### What It Is
Open standard for communication between clients and AI coding agents. JSON-RPC 2.0 over stdio. Created by Zed Industries, supported by JetBrains.

### How We Use It
Grow CLI acts as an ACP client, spawning CLI agents as subprocesses.

### Supported Agents
| Agent       | Status                          |
| ----------- | ------------------------------- |
| Codex CLI   | Ready, primary agent for now    |
| Gemini CLI  | Ready, ACP-native              |
| Claude Code | Waiting for native ACP support (issue #6686). Adapter exists: `@zed-industries/claude-agent-acp` but requires API key |

### Protocol Flow
```
initialize          → negotiate capabilities
session/new         → create session with cwd
session/prompt      → send user prompt
session/update      → stream responses (notifications)
session/set_mode    → switch plan/execute mode
session/cancel      → abort
request_permission  → agent asks for tool approval
```

### Key Reference
- Spec: https://agentclientprotocol.com/
- Python SDK: `pip install agent-client-protocol`
- TypeScript SDK: `@agentclientprotocol/sdk`
- Claude Code adapter: https://github.com/zed-industries/claude-agent-acp

---

## MCP (Model Context Protocol) — Chrome DevTools

### What It Is
Chrome DevTools MCP server gives AI agents programmatic browser control. 26+ tools across input, navigation, debugging, network, performance, emulation.

### How We Use It
For platforms without public APIs — primarily Xiaohongshu. User logs into the platform in Chrome, we automate via MCP.

### Setup
```bash
npx chrome-devtools-mcp@latest
# or configure as MCP server in Claude Code
```

### Key Tools
- `navigate_page`, `click`, `fill`, `type_text` — interaction
- `evaluate_script` — DOM queries, data extraction
- `take_screenshot` — visual verification
- `list_network_requests` — inspect API calls

### Xiaohongshu-Specific MCP Servers
- `xpzouying/xiaohongshu-mcp` — local browser-based
- `MilesCool/rednote-mcp` — search and retrieval

---

## Direct API Calls

### How We Use Them
For cloud AI providers that don't have CLI agents. Standard HTTP, user provides API keys.

### Providers

| Provider  | Best For                  | API Compatibility     |
| --------- | ------------------------- | --------------------- |
| Qwen      | Chinese copy, Xiaohongshu culture | OpenAI-compatible     |
| DeepSeek  | Analysis, strategy        | OpenAI-compatible     |
| Doubao    | Chinese social content    | ByteDance API         |
| Kimi      | Long-form Chinese content | Moonshot API          |

Most Chinese providers offer OpenAI-compatible endpoints, simplifying integration.

---

## Social Platform APIs

### YouTube Studio API
- Views, watch time, CTR, audience retention, subscriber growth
- OAuth 2.0

### TikTok Studio API
- Views, engagement, follower analytics, content performance
- OAuth 2.0

### Meta Business Suite API
- Instagram/Facebook insights
- OAuth 2.0

### X/Twitter API
- Impressions, engagement rate
- OAuth 2.0

### Xiaohongshu
- No public API
- Use Chrome DevTools MCP for automation

---

## WebMCP (Chrome v146, Future)

Chrome v146 introduces WebMCP — a W3C standard letting websites expose structured tools to AI agents. Two flavors:
- **Declarative**: HTML attributes on `<form>` elements
- **Imperative**: `navigator.modelContext` JavaScript API

Currently in early preview behind a flag. When mature, platforms may natively expose their tools to agents, reducing the need for scraping or API wrappers.
