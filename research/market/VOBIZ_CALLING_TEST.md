# Vobiz for Human MCP

Researched 4 October 2026. Documentation review only: no account, credentials, rates, domestic eligibility or calls verified. This is a proposal, not an agreed provider decision.

## Fit and API model

Human MCP's current flow is product URL and pincode, confirmed product, selected stores, calls, returned notes. Vobiz supplies telephone connectivity; a voice platform supplies the conversational agent. Human MCP must own task state, allowance, result quality, retry timing and human assignment.

- Direct Vobiz REST calls use base `https://api.vobiz.ai/api/v1`, `X-Auth-ID` and `X-Auth-Token`. Its introduction describes `POST /Account/{auth_id}/Call/` with `from`, `to`, `answer_url`. The answer URL returns call instructions; making a call alone does not create an intelligent agent.
- Vobiz's Vapi integration registers SIP credentials (the phone connection), associates a Vobiz caller-ID number, and starts calls through Vapi's API. The guide uses `POST https://api.vapi.ai/call/phone` with `assistantId`, `phoneNumberId`, and `customer.number`. Confirm current Vapi contract before implementation.
- Vapi sends status updates and end-of-call reports to a server URL, called a webhook: an address that receives automatic event messages. Structured outputs can extract fields from the conversation; treat extraction as unverified until checked against what was said. Retrieval must handle post-call output availability.
- Vobiz documents live transfer through Vapi. Human MCP's recorded handoff usually means a later human callback after failed/incomplete calls, not a live transfer. Preserve the existing workflow.

Sources: [Introduction](https://www.vobiz.ai/docs/introduction), [Vapi API setup](https://www.vobiz.ai/docs/integrations/vapi-api), [Vapi dashboard and transfer](https://www.vobiz.ai/docs/integrations/vapi-dashboard), [Vapi server events](https://docs.vapi.ai/server-url/events), [Vapi structured outputs](https://docs.vapi.ai/assistants/structured-outputs).

## Approaches

1. **Vobiz + Vapi, proposed first test:** documented dashboard and API setup; quickest way to isolate phone and conversation quality. Additional platform account and costs.
2. **Vobiz + Retell:** documented managed-agent alternative. Compare only if an existing account or first-test result gives a reason.
3. **Vobiz + custom audio agent:** more control, but additional work on real-time audio, interruption handling, hosting and monitoring. Defer for the sprint test.

Sources: [Integrations](https://www.vobiz.ai/docs/integrations), [Retell dashboard guide](https://www.vobiz.ai/docs/integrations/retellai-dashboard).

## Proposed staged test

1. Check account readiness: outbound number, balance, India route eligibility and chosen agent's supported media location. Do not buy or dial as part of this research.
2. Configure one English assistant. Give it one exact product and variant. It identifies itself as an automated assistant checking availability for a buyer, asks whether the recipient can answer, then asks stock, final price and discounts. Card offers are optional; never guess unknown answers.
3. Call the founder's phone as a mock shop, one call at a time with a proposed two-minute limit. Give stock and a specific price, interrupt it, offer a different variant, and leave one detail unknown.
4. Return exact product match, stock, price/currency, offers/conditions, unknown fields, notes, call ID, timestamps and outcome. Verify against the actual conversation. A connected call alone cannot count as guest success (D37).
5. Exercise unanswered calls, immediate pickup/disconnect, refusal and partial answers. Apply D28: unanswered retry once after five minutes then human; answered/disconnected goes directly to human. Create a human work item with product, questions and attempt history. For this test, founder acts as worker and supplies callback notes. No real worker operations are established.
6. After account eligibility and route suitability are confirmed, test one willing shop. Judge exact product/price capture, recipient experience, returned results and actual total provider cost. Provider minute costs do not change D18's customer pricing by verified answers.

Pass: audible two-way English conversation, correct explicit facts, unknowns preserved, real status/results saved, failure routing matches D28, no duplicate calls. Test limit is separate from the public guest quota. D38/D39 still require two successful calls per visitor across searches shared with human follow-up; full enforcement is outside the initial isolated call experiment.

## India dependency and remaining uncertainty

Vobiz's own India docs require an India-registered business, KYC, a Vobiz Indian caller ID and domestic media anchoring for domestic routes. They also describe consent/UCC restrictions. Ask Vobiz to confirm eligibility and treatment of buyer-requested enquiries to publicly listed shops, plus the chosen AI platform's media routing. These are vendor documentation claims, not independent legal verification or a conclusion that this workflow is permitted/prohibited.

Source: [Vobiz India calling requirements](https://www.vobiz.ai/docs/compliance/india/calling-regulations), [KYC](https://www.vobiz.ai/docs/compliance/india/kyc).

Exact number fees, telecom rate, AI/model/voice charges, transfer-leg costs, taxes and account eligibility remain unverified. Read actual account quotes before choosing a paid test budget. Documentation's signup credit does not establish that Indian calling is enabled.

Next question: does the founder already have a Vobiz account with an active outbound number?
