# Grow CLI — Vision

## What Is It

An AI-native marketing agent for the command line. Not a toolbox of marketing utilities — an agent that **does marketing for you**.

## Who Is It For

Solo marketers and small marketing teams. Most are non-technical. The CLI must feel approachable, not like a dev tool.

## Core Philosophy

- **AI-first**: The agent plans, writes, publishes, and learns — not just generates snippets
- **Opinionated**: Assumes Claude Code CLI is installed (Mac/Linux only)
- **Open source, BYOK**: No backend, no auth, no billing. Users bring their own API keys for providers they want to use
- **Local-first**: All data stored locally in SQLite. No cloud dependencies for storage
- **Multi-provider**: Different AI providers for different tasks. Chinese content via Qwen/Doubao, analysis via DeepSeek, orchestration via Codex/Claude Code

## Target Markets

- Global (English)
- China (Xiaohongshu, Douyin, Weibo) — a major market

## Core Flow

```
init (connect accounts) → audit (where you stand) → plan (markdown) → execute → measure → repeat
```

## Two Operating Modes

### Plan Mode
Agent researches, analyzes, and proposes a plan. Outputs a markdown file. Human reviews, tweaks, approves.

### Execute Mode
Agent runs the approved plan step by step. No human-in-the-loop interruptions.
