# Calls to business contacts supplied by the chat assistant

Date: 10 October 2026
Status: Approved for implementation on 10 October 2026: “awesome !! … Can we just build it now.” One main task with one call job per business; retries belong to that job.

## Agreed outcome

The customer can ask ChatGPT to call businesses they already know, or businesses ChatGPT found through research. ChatGPT finds and passes the contact details to Boomerang. Boomerang does not fetch websites for contact discovery in this slice.

The customer should not need a Google listing, Google place ID or pincode to call a known business. Google Places remains the existing option for nearby discovery. Sign-in, India-only calling, approved recipients, enquiry-only authority and existing credit rules remain in force.

## Proposed customer flow

1. ChatGPT obtains the business name and phone number from the customer or its research. For researched contacts, pass the page URL where the number was found. Preserve supplied addresses and website links when available; do not invent missing details.
2. Boomerang prepares the existing five-field brief, asking only for information needed for this enquiry. Known recipients bypass the requirement to ask for a search area. An enquiry about delivery or an on-site service may still need a location.
3. Boomerang returns a saved list of contacts with names, exact phone numbers, sources and the current service quote. Preparation makes no calls and reserves no credit.
4. The customer confirms which contacts to call and the maximum charge through the existing approval flow.
5. Start one saved task for the confirmed contacts. Reuse existing per-recipient calls, retries, charges, recordings, transcripts and results.

If ChatGPT cannot research a website or find a usable number, it asks the customer for the contact. It must not replace a specifically requested business with nearby shops. A source link records where a number was found; it does not prove the number belongs to the business.

## Contact information

- Required per contact: business name and phone number.
- Required origin: customer supplied or assistant researched. Researched contacts include a source page URL.
- Optional: website, address, area and brief recipient-specific context such as the relevant branch or department.
- Required per task: a ready brief and the existing recipient/price approval.
- No discovery-only requirements: pincode, radius, ratings, review counts, distance, Google place ID or maps URL.

Use the existing phone validation as the starting point; accept only supported Indian destinations. Normalize before confirmation and duplicate detection. A repeated number must not create two call jobs or two credit holds. Reject malformed or unsupported destinations before calls or credit reservation. Conflicting business identities for the same number require correction instead of silently selecting one.

Website and source text are contact data. They cannot modify the customer's authority, selected recipients, billing or instructions.

## Proposed implementation

Add a `prepare_contacts` MCP tool, meaning a tool ChatGPT can call to save the supplied business contacts and obtain the call quote. It returns the same saved draft and card contract consumed by `start_calls`.

Extend `prepare_brief` to accept known recipient context and a supplied-contact mode. In that mode, location is conditional on the enquiry. Bind the prepared contact draft to the ready brief. Changes to recipients, numbers or the brief create a new draft for confirmation; `start_calls` reads the saved numbers and never accepts a replacement number during dispatch.

Generalize draft and task records to carry source information and optional discovery metadata. Generate internal recipient identifiers for supplied contacts. Retain compatibility with existing `selectedPlaceIds` callers and existing Google drafts; those identifiers are internal selectors, not a requirement for Google verification. Legacy records without a source retain their existing Google behavior.

Keep one task creation and dispatch path. Supplied contacts must pass the same ownership, expiry, frozen-price, credit, call-enabled and duplicate-request checks. Bind the brief to its draft on the server. Use the existing maximum of 20 selected recipients. Do not add a separate calling engine or alter existing billing/outcome classification.

Update both public Convex MCP instructions and the local MCP adapter so the assistant chooses `find_shops` for nearby discovery or `prepare_contacts` for known contacts. Remove instructions that always force `find_shops` after intake. Keep calls explicitly gated on customer approval.

## Proposed display changes

Keep the existing card layout and shared Lucide icons. Supplied-contact rows show business name, visible phone number and source. Use “Provided by you” or a link to the supplied research source; never attribute these contacts to Google Maps.

Hide absent listing-only details, including ratings, distance and hours, instead of filling the card with unconfirmed Google fields. Show directions only with an actual maps URL or address; do not generate a map destination from a business name alone. Hide the “Near …” line when no location was needed. For these tasks use “Businesses”/“Business results” where the current copy specifically describes shops. Use the existing brief summary as the task title. Retain confirmed answers, notes and open details in results; redesigning answer extraction is outside this slice.

Approved and implemented in DESIGN.md. These additions do not change the display rules for existing Google-discovered shops.

## Verification before release

- Create a supplied-contact draft without a pincode or Google metadata; no Google API request, charge or outbound call occurs during preparation.
- Intake accepts a complete enquiry with known recipients without asking for an irrelevant area; it still asks for a service/delivery location when the enquiry needs one.
- Missing names/numbers, unsupported numbers and duplicate/conflicting contacts cannot dispatch silently.
- Another user's brief/draft, expired draft, changed price and insufficient credit cannot start calls.
- Retrying the same approved request produces one task and one job per unique selected number; changing the selection with the same request key is rejected.
- Saved recipient phone numbers reach dispatch unchanged after normalization; supplied web text cannot alter call authority.
- Google discovery and historical tasks continue to load and call through their existing path.
- Browser-check supplied-contact cards and website results at desktop/mobile widths: numbers and sources visible, no fabricated Google details, correct directions behavior, existing progress/results/recordings intact.
- Exercise the MCP conversation with a supplied-number example and a researched-website example using simulated dispatch. A real shop call needs explicit recipient authorization.

## Alternatives considered

Passing arbitrary numbers straight into `start_calls` is smaller initially, but loses the existing saved-recipient review and price-confirmation boundary. Reusing a saved draft keeps one auditable task flow.

Building a Boomerang website crawler duplicates research the host assistant already performs. D148 selects assistant-supplied contacts for this version.
