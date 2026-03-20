# Grow CLI — Features

## Foundation

### `grow init`
Onboard your product and brand: name, audience, value prop, tone, URLs. Connect social accounts (OAuth). This becomes the agent's persistent context.

### `grow brand`
Update and refine brand knowledge over time.

## Audit (The Entry Point)

### `grow audit <url>` — SEO Audit
Crawl a public website and produce a report:
- Meta tags, heading structure
- Page speed, mobile-friendliness
- Internal linking
- Keyword analysis, content gaps
- Competitor comparison

### `grow audit --social` — Social Media Audit
Pull analytics from platform APIs:
- YouTube Studio API — views, watch time, CTR, audience retention, subscriber growth
- TikTok Studio API — views, engagement, follower analytics, content performance
- Meta Business Suite API — Instagram/Facebook insights
- X/Twitter API — impressions, engagement rate
- Xiaohongshu — via Chrome DevTools MCP (no public API)

### Cross-Channel Insights
The audit report ties SEO + social together: "Your YouTube is growing 20%/month but your website isn't capturing any of that traffic."

### Output
- Rendered beautifully in terminal via Ink
- Written to markdown file
- Prioritized, actionable recommendations
- Feeds directly into `grow plan`

## Campaigns

### `grow campaign "launch feature X"`
Agent plans a full campaign: channels, copy, timeline, assets. Human reviews and approves.

### `grow campaign run`
Executes approved steps (posts, emails, schedules).

### `grow campaign status`
Dashboard of active campaigns, metrics, pending approvals.

## Content & Publishing

### `grow publish --twitter|--youtube|--xiaohongshu|...`
Agent drafts content, human approves, agent publishes via platform API or Chrome MCP.

### `grow blog "topic"`
Agent writes a full blog post. Outputs markdown or pushes to CMS.

### `grow email draft` / `grow email subject`
Generate email campaigns and subject line variations.

## Strategy

### `grow plan`
Agent analyzes current state (audit results, analytics) and proposes a marketing plan as a markdown file.

### `grow compete <url>`
Agent studies a competitor and suggests positioning.

## Feedback Loop

### `grow learn`
Feed results back to the agent ("this post got 10k views") so it adapts.

### `grow report`
Agent summarizes what it did, what worked, what to try next.

## Chat

### `grow chat`
Open-ended conversation with the agent about your marketing. It remembers everything.

## Utilities

### `grow utm <url>`
Generate UTM-tagged URLs.

### `grow qr <url>`
Generate QR codes.

### `grow shorten <url>`
URL shortener.

## Three Starting Scenarios

1. **`grow audit <url>`** — You have a site. Let's see where you stand.
2. **`grow social`** — You have social accounts. Let's plan content.
3. **`grow start`** — You have nothing. Let's build from scratch.
