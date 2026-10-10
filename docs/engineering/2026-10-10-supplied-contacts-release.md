# Supplied business contacts

Boomerang now accepts business contacts supplied by the customer or researched by ChatGPT. ChatGPT passes names, Indian phone numbers and source links with `prepare_brief`; after the brief is ready, `prepare_contacts` returns the saved recipients and quote for approval. No Google listing or discovery pincode is required.

`start_calls` creates one main task with one call job per selected business. Retries stay within that job. The existing credit, call dispatch, recordings and results paths are reused. Preparation does not call or reserve credit. Changed contacts require a new brief and confirmation.

The contact picker, chat results, website results and task history recognize supplied businesses. They show saved numbers and sources without invented Google ratings or distances. Directions require an address. Nearby Google discovery remains available.

## Verification

- 103 backend tests pass, including 17 supplied-contact tests: public MCP tool flow, auth, immutable recipients, invalid/duplicate numbers, credit and price guards, repeated preparation, two business jobs under one task, retry timing and credit settlement.
- 100 existing MCP, bridge and frontend tests pass; TypeScript and the production/widget build pass.
- Local Chrome checked actual picker, chat card and website result components with simulated data at 1280, 390 and 320 pixels. Phone/source links, address-only directions, selection, maximum charge, low-credit blocking and expanded notes work; no horizontal overflow or browser errors. Mobile screenshot inspected. Temporary preview files removed.
- Independent review found two issues: an old Google draft could be paired with a supplied-contact brief, and preparation could create a second draft after twenty later searches. Both are fixed with regression tests; follow-up review found no release blockers.

## Release

Convex functions and the new draft lookup index are deployed to `little-kangaroo-718`. Chat widget/static deployment `c665f97c-56e8-44d4-b99a-f66b3c3a2fd9` is published. Website rollout and public endpoint verification are in progress.

## Limits

No real business was called. The intake model and provider callbacks were simulated in automated tests; a real ChatGPT conversation and live call through the new path remain untested. A source link records where the contact was found, not proof of ownership. Existing stock-oriented answer fields remain; general enquiry findings are preserved in notes.

Next: refresh the Boomerang tools in the chat host and try a supplied-contact enquiry with explicitly approved recipients.
