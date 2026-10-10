# Supplied business contacts implementation

Approved design: ../specs/2026-10-10-supplied-business-contacts-design.md

1. Add failing backend checks for supplied-contact intake, preparing a saved draft, one task/two business jobs, immutable recipient selection, auth/credit guards and duplicate numbers.
2. Add validated contacts to intake; make location conditional for these requests. Store the contacts with the brief. `prepare_contacts(briefId)` builds a reviewable draft from those saved contacts, keeping later calls bound to that brief and those numbers.
3. Make discovery metadata optional, retain legacy Google behavior, and reuse task creation/dispatch/reservations. Add tool schemas and routing to both MCP implementations.
4. Render supplied business names, phone numbers and source links on picker/results; omit absent Google details and name-only maps. Preserve existing shop search UI.
5. Verify backend/MCP tests, types, build, simulated dispatch and browser views. Update customer tool instructions, design rules and memory. Save a scoped commit and deploy the backend and static assets only after checks pass; verify public endpoints without calling businesses.

The separate writing-plans skill referenced by brainstorming is not installed; this file supplies the concrete implementation sequence. No new framework or parallel calling system is needed.
