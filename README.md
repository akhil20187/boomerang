# Boomerang — GrowthX Build Sprint

## Application

- [Development app](https://little-kangaroo-718.convex.site)
- [Interactive demo](https://little-kangaroo-718.convex.site/demo): sample answers and audio; no phone calls.
- [Setup guide preview](https://little-kangaroo-718.convex.site/setup.html): approved design; chat connections are awaiting publication.
- [Build verification and remaining work](docs/engineering/BUILD_VERIFICATION.md)
- [Architecture scope](docs/engineering/ARCHITECTURE_SCOPE.md)
- [Voice server configuration](call-bridge/README.md)

Live calling remains disabled. The public MCP/account-linking routes are prepared locally and await publication permission. Credit prices and payment setup remain open; visible account credit is not proof of working paid billing.

Run `npm install`, then `npm run dev` for the website or `npm run build` for the website and chat widget. `npm test` runs local mocks without calling shops or sending emails; `npm run test:backend` checks Convex persistence and access rules. Local HTTP tests require permission to bind a port in a restricted sandbox.

Keep `.env` files and provider credentials private. They are excluded from Git and frontend builds. Only the backend/voice process may access provider keys.

Start with [the project home page](index.html) to browse both screenshot galleries and the documents.

## Folder map

```text
AGENTS.md                 Working instructions and project brief
memory.md                 Decisions, changes and open questions
index.html                Visual entry point
docs/project/             Idea scope, sprint reference and phone trial
research/market/          Market comparison and billing research
research/competitors/
  humwork/                Humwork reports
  rentahuman/             RentAHuman reports
research/raw/             Original dated research responses
humwork-audit/             Humwork gallery, journey and 57 screenshots
rentahuman-audit/          RentAHuman gallery, journey and 22 screenshots
```

## Screenshot galleries

- [RentAHuman](rentahuman-audit/index.html): 22 supplied captures, filters, captions and enlarged views.
- [Humwork](humwork-audit/index.html): 57 captures and observed journey.

Both galleries work by opening their `index.html` file in a browser; images are stored locally. Their existing/supplied screenshots are evidence, not proof of completed service delivery.

## Project and research

- [Current decisions](memory.md)
- [Idea scope](docs/project/IDEA_SCOPE.md)
- [Phone search trial](docs/project/PHONE_SEARCH_TRIAL.md)
- [Sprint reference](docs/project/BUILD_SPRINT_REFERENCE.md)
- [Humwork market research](research/competitors/humwork/HUMWORK_MARKET_RESEARCH.md)
- [Humwork screenshot analysis](research/competitors/humwork/HUMWORK_SCREENSHOT_RESEARCH.md)
- [RentAHuman screenshot analysis](research/competitors/rentahuman/RENTAHUMAN_SCREENSHOT_RESEARCH.md)
- [RentAHuman services](research/competitors/rentahuman/RENTAHUMAN_SERVICES.md)
- [RentAHuman social and demos](research/competitors/rentahuman/RENTAHUMAN_SOCIAL_DEMOS.md)
- [RentAHuman later social findings](research/competitors/rentahuman/RENTAHUMAN_MONID_FINDINGS.md)
- [Broad market research](research/market/MARKET_RESEARCH_HUMAN_MCP.md)
- [Store-call alternatives](research/market/MARKET_RESEARCH_STORE_CALLS.md)
- [Competitor activity](research/market/HUMAN_MCP_COMPETITOR_ACTIVITY.md)
- [Competitor billing](research/market/COMPETITOR_BILLING.md)

Reorganisation preserved document content while updating local links. Original RentAHuman Desktop files remain in place; the gallery uses copies inside this project.
