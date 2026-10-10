# Working instructions

## Read memory first

**At the start of every session, read `memory.md` in this directory before answering or doing project work. Re-read its relevant decisions before proposing or changing scope, user flows, pricing, timing or positioning.** Treat it as the project decision record; consult linked documents for supporting detail.

## Read DESIGN.md before screen work

Before building or changing any screen (chat cards, website, emails), read `DESIGN.md`. If a choice is not covered there, ask instead of guessing.

## Handle contradictions

- Compare new statements with active decisions in `memory.md`.
- When a statement conflicts, cite the decision ID, explain the conflict in plain words and ask one concrete question: keep the earlier decision or replace it?
- While the conflict is unresolved, retain the recorded decision for dependent work and continue useful independent work. Override an inconsistent assumption or proposal with the recorded decision; do not silently override an explicit change from the user.
- An explicit instruction to change a decision supersedes the old decision. Record the new decision and mark the old entry superseded, preserving its history.
- Research findings and assistant suggestions are evidence and proposals, respectively; neither becomes a user decision without agreement. Challenge factual claims using verified evidence.

## Maintain memory

- After each agreed material decision, update `memory.md` before finishing the turn.
- Give each decision a stable ID, recorded date, status, decision and source. Preserve exact user wording where it matters.
- Distinguish decisions, provisional numbers, reported personal evidence, research findings and open questions.
- Record changes with the reason and the entry they replace. Keep unresolved contradictions visible until resolved.
- Record completed work and its file links. Mark an outcome verified only when it was checked; identify the limits of that check.
- Keep memory concise. Link detailed research rather than copying it. Never store passwords, keys or payment details.

## Communication and execution

- Use concise, direct, plain words. Explain technical terms when needed. Avoid filler, hype and emojis.
- Before using tools, say what you will do in one line. Explain a skill or subagent the first time it is used.
- Ask one product question at a time with concrete choices. Choose routine technical details yourself.
- Take action within the authorised scope and finish the requested work. Verify it before claiming completion; state what remains untested.
- If a command fails, inspect the cause, fix it and retry. If the same failure repeats twice, explain the blocker in plain words and continue unaffected work.
- Push back on mistakes respectfully, with a reason. Preserve the user's ability to change direction.
- End with one practical next step when the response format permits it.

## Project context

We are building **Boomerang** for the GrowthX Build Sprint: a service through which a customer's AI assistant can request work from a human and receive the result back. MCP is the connection standard that lets an agent request that service. The broader vision covers both completing work AI could not finish and getting an expert second opinion.

### First use case and customer benefit

The selected first customer is an urgent buyer who needs to find a particular product in nearby physical stores. The service saves the customer time and effort calling shops for stock, final prices, discounts and credit-card offers. The customer chooses where to buy.

The first build is a ChatGPT/Claude-style chat interface, because that is where customers find the value (D44); the public mobile website follows. The website phase uses an Amazon link and pincode to produce confirmed product details, optional comments and selectable relevant stores ordered highest-rated first. Store discovery is first value. The intended website guest allowance is two successful calls (D36); chat calls require sign-in. Under D97, verified email signups are automatically approved and get one-time ₹100 welcome credit immediately (D135: India only, all money in rupees, ₹10 per useful shop answer). Existing welcome grants and balances are preserved; no manual approval or invitation is needed for new signups. Credit covers work; insufficient credit pauses new calls for payment.

### Intended workflow

**Supplied business contacts (D148, implemented):** ChatGPT researches business websites or uses customer-supplied contacts, then passes the business names, phone numbers and available source details to Boomerang. These calls remain saved tasks using the existing briefing, recipient/price confirmation, credit and results flow. Google Places and a discovery pincode are not prerequisites for known recipients; ask for location only when the enquiry needs it. Boomerang does not research websites in this slice. Detailed design is in docs/superpowers/specs/2026-10-10-supplied-business-contacts-design.md ; implementation and verification are recorded in docs/engineering/2026-10-10-supplied-contacts-release.md.

1. The customer opens the website on their phone, pastes a product URL and enters their pincode without login. Fetch product details for confirmation, show potential nearby sellers with sources and listed hours, and let them select stores. Mark unknown hours; a listing does not confirm stock. D35 supersedes the earlier typed-product primary input.
2. Confirm fetched details, add optional comments, show relevant stores ordered highest-rated first and let customers select shops individually. “Start calls” allows two successful calls without login (D36), per visitor across searches without search/refresh resets (D38). Success requires answered plus some product details; immediate pickup/disconnect does not count (D37). Human follow-up is included and shares this allowance (D39). Further calls require email login, eligible credit and approval. Preserve context; mark partial answers. Minimum fields, visitor tracking and failed-attempt limits remain unresolved or untested. Prior credit eligibility stays active pending clarification.
3. Show call progress on the website. Unanswered AI calls retry once after five minutes, then pass to a human. Answered-then-disconnected calls go directly to a human. Humans get up to two attempts; refusal and incomplete answers also need handoff. Preserve context. English is the first test language.
4. Return shop-by-shop answers with notes; unresolved details stay unconfirmed. Notes-only answers can be delivered and charged. Transcripts and post-call recordings are later evidence improvements. These are intended capabilities, not tested behaviour.

Confirming and holding inventory is a possible subsequent task. Expert second opinions remain part of the broader vision, with no selected first workflow. Pricing and timing are provisional; fifteen minutes is a trial target, not the value proposition.

### Build status and source of truth

We have documented the idea, prepared a store-call trial and researched competitors. A working end-to-end service has not been verified. Progress toward building continues without making the manual trial a prerequisite.

Next build slice is the ChatGPT/Claude app (D44), designed in docs/superpowers/specs/2026-10-04-chatgpt-store-calls-design.md: product link or description plus pincode, in-chat store card, AI-only calls first (D60), signed-in customers only in chat (D59), acceptable as the sprint submission (D62). The website store-search page follows. The supplied agreed sprint feedback targets a live .convex.site submission link; no app or deployment is verified.

The current URL-first MVP is written in docs/project/MVP_FLOW.md: confirmed product, selected stores, one saved task, real per-store AI/human status and returned notes. Extraction fallback and remaining operating rules are explicitly open.

`memory.md` is authoritative for current decisions, changes and open questions. Update this brief when an agreed scope change affects it. `docs/project/IDEA_SCOPE.md` contains the draft lock sheet and original wording; it is not a submitted or locked product specification. Detailed competitor findings live in the research documents linked from memory.
