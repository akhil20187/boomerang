# Agent setup for Boomerang: Hermes, OpenClaw, Grok

Checked against official docs on 6 October 2026. Nothing here has been tested against Boomerang's server yet.

## Hermes Agent (Nous Research)
- Remote MCP: `~/.hermes/config.yaml` → `mcp_servers.boomerang.url` + `auth: oauth`; then `/reload-mcp`. OAuth with dynamic client registration and PKCE is automatic; `hermes mcp login boomerang` re-runs sign-in; tokens in `~/.hermes/mcp-tokens/`. [MCP docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), [guide](https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes)
- Skills: `~/.hermes/skills/` (agentskills.io format). [Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- Unverified: `hermes mcp add` with `--url` for remote servers (docs show only local commands).

## OpenClaw
- Remote MCP: `openclaw mcp add boomerang --url … --transport streamable-http --auth oauth`, `openclaw mcp login boomerang`, `openclaw mcp doctor boomerang --probe`; remote browser: `--code`. [Registry](https://docs.openclaw.ai/cli/mcp/registry), [Transports](https://docs.openclaw.ai/cli/mcp/transports)
- Skills: `~/.openclaw/skills/`, workspace `skills/`, also `~/.agents/skills`; `openclaw skills install ./boomerang --as boomerang --global`. [Skills](https://docs.openclaw.ai/tools/skills)
- Unverified: whether OpenClaw uses dynamic client registration automatically.

## Grok (xAI)
- grok.com: grok.com/connectors → New Connector → Custom → MCP URL + authentication. [Connectors](https://docs.x.ai/grok/connectors) (updated 17 July 2026). Unverified: dynamic client registration, plan eligibility; no official skill upload.
- xAI API remote MCP: bearer token via `authorization`, no browser sign-in, no skills. [Remote MCP](https://docs.x.ai/developers/tools/remote-mcp)
- Grok Build CLI (early beta, SuperGrok / X Premium Plus): `grok mcp add --transport http boomerang <url>`, browser OAuth on first use, `grok mcp doctor`; skills in `~/.grok/skills/`. [MCP](https://docs.x.ai/build/features/mcp-servers), [Skills](https://docs.x.ai/build/features/skills-plugins-marketplaces), [launch](https://x.ai/news/grok-build-cli)
