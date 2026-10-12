# Signed-in redesign: chat first (D153)

Status: agreed direction, being built on branch `app-redesign` (from `development`). Mockups: [design/redesign-canvas/](../../../design/redesign-canvas/) (copies of the private Claude Design canvas "Boomerang App Redesign"). DESIGN.md rules still apply everywhere: one meaning per colour, black only on the main button, "Unconfirmed" in amber, phone font, 8px corners, thin `#DAD7D0` borders, Lucide icons through `web/src/Icon.tsx`.

## Why

New users must reach the "wow moment" (hearing our AI call a shop for them) without first connecting ChatGPT or Claude. Today the signed-in site is a product + pincode form; requests now also cover services (plumber, painter, notary) and supplied businesses (D148, D150).

## What the signed-in website becomes

| Screen | Mockup file | Route |
| --- | --- | --- |
| Chat (phone + laptop) | `Main.dc.html`, `Desktop.dc.html` | `/app` |
| Menu / sidebar with tasks | `Tasks.dc.html` (phone drawer), sidebar inside `Desktop.dc.html` | on every signed-in page |
| Call log (phone + laptop) | `CallLogPhone.dc.html`, `CallLog.dc.html` | `/calls` |
| Use in ChatGPT or Claude | `Connect.dc.html` | `/connect-assistant` |
| Account and credit | `Wallet.dc.html` | `/account` (signed in) |
| Opened call (shared) | `CallDetail.dc.html` | used in chat results, task page, call log |

### Chat flow (`/app`)
1. Empty state: "What should we call about?", one line under it, 3 starter chips (a service example, a product example, "Call me first, so I hear how it sounds · Free" which uses the existing personal test call), and "You have ₹100 welcome credit, about 10 answers. You pay ₹10 only when a shop answers what you asked." (use the real balance).
2. User sends a request → `briefs.prepare` (D144). Each returned question shows as an assistant message with "Question N of M" when known, tap-to-answer choices, and "Or type your own answer below". Typed answers go through the composer. Ask for the pincode when the brief needs location and none is known.
3. When the brief is ready → a small box "We'll ask each [business]" listing the brief's questions → `discovery.search` with `briefId` (services supported, see below).
4. Shop picker card inside the chat: rows highest rated first, tick boxes, "★ 4.6 (1,240) · distance · hours"; **the price line and the main button live inside the card** ("Up to ₹30 for 3 … · ₹10 per answer · You have ₹100", button "Call 3 plumbers", small print). The composer stays visible at all times (user feedback: never hide the chat).
5. Tap Call → `tasks.start` → the picker folds into one line "3 plumbers picked: …" and the live call card appears in the chat (existing CallCard behaviour, restyled), with the opened-call view below.
6. When finished, a short assistant summary line and chips: "Call more" (re-search) and "New request".
The noun follows the request: "shops" for products, the service word (e.g. "plumbers") or "businesses" otherwise.

### Menu / sidebar
New request · Today / Needs you / Earlier task groups (from `tasks.history`; status line coloured per DESIGN.md; live tasks show the blue pulse) · Call log · Use in ChatGPT or Claude · Account and credit (with balance). Laptop: fixed left sidebar. Phone: drawer from a menu button in the top bar; the top bar also shows the balance pill linking to Account. "Demo" leaves the signed-in navigation.

### Opened call (shared component, must match today's app)
Same as today's `CallCard` opened row: time-stamped timeline with round marks (✓ ok, • live, ! warn, … wait, × fail) → answer table (brief items two columns with ✓ / ~ / – marks, product Price/Offers/Note) → address → `VoicePlayer` or "No recording for this call. The answer comes from the caller's notes." Personal call: "Best to call them directly. No charge for this [shop/business]." Call and directions icons sit at the top right of the row; phone number always visible (D146).

### Call log (`/calls`)
One row per call attempt across all tasks, newest first, grouped by day on phones. Totals: calls this month (and tries), answered, charged, credit left. Filters: All calls · Charged · Not charged · Needs you. Each row: when, business, task, phone, try number and "AI agent", result in its status colour, length, charge line ("Charged ₹10", "Not charged", "Refunded ₹10", never green). Tap/click opens the shared opened-call view. Laptop: table with the open view in a full-width row under the clicked row. Phone: stacked cards. "Download CSV" exports the visible rows.

### Use in ChatGPT or Claude (`/connect-assistant`)
ChatGPT/Claude switch → copy the MCP address (from the existing `VITE_MCP_PUBLIC_URL`/app config) → 3 short steps per app → "Check connection" (shows whether this account has an active assistant connection) → "Or paste this into any AI assistant: Set me up with Boomerang using <SKILL.md URL>" → "Advanced: access keys" fold containing the existing access-key UI.

### Account and credit (`/account`, signed in)
Balance in rupees with "about N answers", recent charges (top 5) with "See all calls" → `/calls`, name the AI gives shops, email, link to Use in ChatGPT or Claude, Sign out. **No top-up buttons**: Dodo payments are planned only (D140); do not add payment UI.

## Backend changes
- Services search: `discovery.search` must find service businesses (plumbers, painters, notaries) as well as shops. Today's query is "[product] retailers" and the classifier prompt is product-only.
- Call log query: paginated attempts for the signed-in user with business name/area/phone/address, task label, attempt number, status/result, times, duration, charge note, recording availability, timeline and answer items — reuse existing presentation helpers where possible.
- Connection status query: whether the signed-in user has an active ChatGPT/Claude (OAuth) connection.

## Out of scope
Payments/top-ups, web research by Boomerang (D148 stays), human callers, any deployment or live call.
