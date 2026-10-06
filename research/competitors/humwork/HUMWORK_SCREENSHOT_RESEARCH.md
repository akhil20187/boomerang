# Humwork: screenshot and product-flow research

Reviewed 3 October 2026. Source: the supplied [57-screen audit and interaction record](</Users/akhilesh/Documents/ChatGPT/Growthx - Idea 2 - HumanMCP/humwork-audit/user-journey.md>). This report visually checks the key service, pricing, integration and expert screens and uses that record for observed account interactions. For current public evidence, social activity, funding and demos, see [online market research](</Users/akhilesh/Documents/ChatGPT/Growthx - Idea 2 - HumanMCP/research/competitors/humwork/HUMWORK_MARKET_RESEARCH.md>).

## What Humwork is selling

Humwork offers on-demand human expertise inside an AI agent's workflow. Its described loop is: AI gets stuck → requests help → an expert receives context and solves the issue → the agent receives the solution and continues. This directly overlaps the proposed human handoff and second-opinion mechanisms. The connecting technology is therefore not a distinct advantage by itself.

The strongest visible focus is knowledge work, particularly software development. The homepage mentions engineers and designers. Starter and Pro plan descriptions address AI coding agents. Expert settings describe “programming skills and specialties.” This supports a coding-oriented product focus, despite much broader marketing language. It does not prove their other domains are unavailable.

The screenshots do not show offline store calling, geographic dispatch, product-stock confirmation, reservations, or local-shopping card-offer comparison. That is an evidence boundary, not proof that Humwork cannot provide them.

![Humwork headline and two-sided entry points](</Users/akhilesh/Documents/ChatGPT/Growthx - Idea 2 - HumanMCP/humwork-audit/screenshots/27-home-hero.jpg>)

## Breadth and depth of services

Five carousel cards are visible. Four are named domains; the fifth is an open-ended catch-all. These are descriptions, not a searchable catalogue of verified available providers.

| Domain | Specific example shown | Evidence | What remains unknown |
|---|---|---|---|
| Software engineering | Senior engineer diagnoses a bug the coding agent repeatedly fails to resolve | Screen 20 | Supported languages, actual availability, consultation quality |
| Product and business strategy | Strategist refines weak positioning and an outreach angle | Screen 21 | Industries, deliverables, breadth of real specialists |
| Marketing and copy | Brand strategist rewrites an AI-generated hook in the client's voice | Screen 22 | Available specialties and proven conversion improvement |
| Design and UX | Expert restructures an interface flow when users leave | Screen 23 | Research versus review capability, implementation scope |
| “Your Domain” | Finance, research, operations, HR and compliance | Screen 24 | Credentials, boundaries, availability and specific services |

Statements about doubling click-through or fixing a flow in ten minutes are promotional examples. No measured engagement or completed client work appears in the audit. Finance in a catch-all card does not establish a financial-planning, insurance or education-advisory service. Those would require separate evidence.

The service appears to support both short questions and interactive chats: builder metrics distinguish Questions and Chats, while expert Queue and History anticipate incoming work. No completed task shows whether experts produce files, execute actions outside chat, or only return advice.

## Builder journey and first value

The existing audit verified email/password account creation, a four-step welcome tour, a dashboard, sign-out and successful returning login. No email-verification gate appeared in that tested path. Other login providers were displayed but not tested.

The tour covers API key, integration, usage history and credits. An API key is a credential that lets software request the service; MCP is the connection standard used by the agent. The main dashboard then supplies platform-specific setup instructions. This makes the intended customer a builder connecting an AI tool, rather than a shopper placing a direct task through a consumer form.

The first useful experience observed is setup guidance, not receiving human help. Completing the tour still leaves external installation and payment activation. Usage starts empty with zero questions, chats and credits. The “first month free” banner requires subscribing to start consulting experts; the checkout still requests a card. No subscription or consultation was completed.

That matters for your product: someone urgently buying a phone may benefit from staying inside the assistant they already use, with a clear request and approved budget. This is a possible product distinction, not validated customer preference or a decision to redesign your scope.

## Integration coverage

The inspected instructions cover Claude Code, Cursor, Windsurf, Codex CLI, Lovable and OpenClaw. Claude Code offers plugin and direct MCP paths; Cursor, Windsurf, Codex and OpenClaw show configuration steps; Lovable uses a connector with browser authentication. A downloadable agents.md is described as teaching the AI when to validate with experts versus working alone.

These instructions show intentional integration work. They are not evidence that every installation works: no external agent setup was installed or tested. A Cline logo appears on the pricing screen, but a Cline setup path was not inspected. ChatGPT and Hermes compatibility should not be inferred from the generic claim “AI agents.”

## Payment model and exact captured prices

| Item | Price shown | Entitlement / distinction |
|---|---|---|
| Starter subscription | $30/month | 30 credits/month; all domains and real-time chat; auto-refill described |
| Pro subscription | $100/month | 110 credits/month; priority queue and premium expert access |
| Enterprise | Custom | Volume pricing, dedicated experts, SSO and service-level agreements advertised |
| Buy Credits package | $30 | 30 credits; $1 per purchased credit |
| Larger credit package | $100 | 110 credits; displayed $0.91 per purchased credit |

The credit page states each credit represents $1. This describes balance value, not a verified $1-per-minute, $1-per-question or $1-per-session price. The screenshots do not establish consultation consumption, refund rules, expiration, rollover, platform commission or expert compensation. Subscription plus separate credit purchase also needs clarification.

![Captured monthly plans](</Users/akhilesh/Documents/ChatGPT/Growthx - Idea 2 - HumanMCP/humwork-audit/screenshots/44-builder-pricing.jpg>)

A live Starter checkout captured ₹0 due today and ₹2,999.34 per month starting the next month. It displayed a USD-to-INR rate of 99.9780, including a 4% conversion fee, and warned charges vary with exchange rates. Those are capture-time checkout values, not a fixed Indian price. No payment details were entered or subscription submitted.

![Captured credit packages and subscription banner](</Users/akhilesh/Documents/ChatGPT/Growthx - Idea 2 - HumanMCP/humwork-audit/screenshots/41-builder-credits.jpg>)

## Timing and expert supply

The homepage advertises expert matching in under 30 seconds; the audit records a separate average-first-reply claim under two minutes. Neither was measured. Builder settings default to a ten-minute session: up to four minutes for matching and six for live chat. A custom wait-time override exists. A maximum timeout and an average performance claim can differ, so this is not automatically a contradiction. It does show timing is part of the product's operational design.

The expert account was observed signed in, offline, with zero earnings, zero tasks answered and no rating. The intervening signup submission was not observed. Its dashboard requires a 10–15-minute qualification interview and a Stripe payout setup, also labelled 10–15 minutes. Skills are locked until qualification. Queue is empty pending approval. Work hours are paused. Payouts require account connection and identity verification.

![Expert qualification and payout gates](</Users/akhilesh/Documents/ChatGPT/Growthx - Idea 2 - HumanMCP/humwork-audit/screenshots/49-expert-dashboard.jpg>)

This is evidence of designed supply controls, not evidence of available experts, verified credentials, fulfilled jobs or paid earnings. Qualification entry was blocked by the earlier audit's approval review; assessment completion, approval, going online and Stripe onboarding were not performed. No new assessment attempt is needed to analyse these screenshots.

## Friction and practical lessons

- **Separate roles:** builder credentials were rejected by expert login in the observed flow. A person doing both has another entry step.
- **Payment before proof:** pricing and activation are found after signup in the inspected route; a free month still leads to card collection.
- **Supply is more than signup:** approval, payout eligibility, availability, schedule and alerts all matter before an expert can reliably receive tasks.
- **Matching is not delivery:** an available worker, first response and useful finished result are separate events. Measure them separately in your own workflow.
- **Credit clarity matters:** customers need the consumption rule, spending cap and no-result charge before authorising a task.
- **Breadth is partly a promise:** the broad carousel does not establish capacity in every domain. Avoid treating it as evidence of a functioning universal marketplace.

Other observed issues include fixed-header overlap at the captured viewport, a demo calendar loading after surrounding content, and a Mobile App menu opening profile settings rather than a dedicated app-download view. The audit did not compare desktop and mobile layouts.

## What this means for Human MCP

Humwork is a direct comparator for expert intervention inside AI work. Your urgent local-store information task is a different visible job: executing calls, collecting confirmed stock and offers, and returning structured evidence. That difference is worth investigating without declaring it unique.

Borrow the clear stuck-agent-to-human-to-agent loop, explicit expert qualification and platform-specific setup. Investigate a task-level budget and structured store results as your own operating choices. Do not copy broad categories as evidence that you can staff them.

Next: combine this audit with the linked public-source research, then compare one completed handoff against Humwork. The essential unknowns are actual expert availability, real response time, consultation cost and the quality of returned work—not whether account creation works.
