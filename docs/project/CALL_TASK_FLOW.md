# Customer request to call summary

Agreed workflow, 8 October 2026 (D142). This document describes the intended behavior; it does not establish that the application implements every step.

1. **Customer makes a request.** Use the customer's words and any relevant context already provided.
2. **Understand the requirement and intent.** Establish what they need, why the call is needed and what a useful answer would look like. If information needed to carry out the request is missing or unclear, ask the customer for more details, one question at a time. Use known context instead of asking again; do not invent answers.
3. **Create a brief.** Fill the five agreed fields: task context, call purpose, possible expected outcome, who the agent represents, and call recipient details. Carry clarifications into this brief. Keep shared conversation preferences and enquiry-only limits outside the five fields.
4. **Make the calls.** Use the brief to guide a natural conversation with the selected, authorised recipients. Ask one question at a time, adapt to actual answers, skip answered questions and stay within the customer's authority. Existing sign-in, credit and call-start rules still apply.
5. **Summarize the information.** Return what each recipient confirmed, relevant limitations, unanswered questions and the next step. Separate facts from assumptions and do not turn planned HR follow-up into a refusal or claim a catalogue was received when it was only discussed.

## When information is missing

Ask before calling when the gap prevents carrying out the request: for example, an unclear budget unit, unknown organization being represented, or no usable recipient contact. Keep the question concrete. If a new gap arises during a call and cannot be resolved from the brief or the recipient, report it to the customer instead of inventing a detail or making a commitment.

Judge what is needed against the **requested outcome**. An exploratory enquiry about Diwali gift options can proceed without final gift contents or an exact delivery address; a call to check whether a delivery deadline can be met needs that deadline. Unknown supplier facts are questions for the supplier, rather than questions the customer must answer first.

The calling agent has no SMS or email sending access. It returns findings through the existing task/chat flow; the customer or their team handles catalogue exchange and further contact.

Example: [the approved Diwali gifting brief](DIWALI_HAMPER_CALL_BRIEF.md). Sources: D139 (five fields), D141 (natural supplier conversation), D142 (request → understand/clarify → brief → calls → summary). This flow does not expand the live task catalogue or authorise a new call by itself.

Implementation (9 October 2026): the `prepare_brief` MCP tool runs steps 2 and 3 server-side, one question per turn, and `start_calls` passes the ready brief to the caller. See [the tool design](../superpowers/specs/2026-10-09-prepare-brief-mcp-tool-design.md). Built and unit-tested; not yet exercised through a live chat host or a live call.

Additional draft examples: [notary availability and house painting](SAMPLE_SERVICE_CALL_BRIEFS.md). Both show how to preserve unknowns and ask only for information needed for the intended call.
