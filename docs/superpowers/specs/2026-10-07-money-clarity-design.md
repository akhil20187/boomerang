# Money clarity: rupees, price before calling, per-shop charges, credit history
7 October 2026. Design for piece 1 of the signed-in improvements. Based on [Claude audit](../../engineering/2026-10-07-signed-in-ux-audit-claude.md) findings 1–4 and 8, and decision **D135** (India only, rupees, ₹10 per useful answer, ₹100 welcome credit, existing balances × 100).
## Goal
Before approving calls, users see what calls can cost. Afterwards they see what they paid, for which shop, and why. All amounts are in rupees.

**Done when** a signed-in user can answer these four questions without asking anyone:

1. "How much will this cost me at most?" (before pressing Call)
  
2. "How much credit do I have, and how much is on hold?"
  
3. "Which shops did I pay for, and why wasn't I charged for the others?"
  
4. "Where did my credit go?" (one list of every money movement)
  
## Not in this piece
Country settings and per-user country (later, per D135), navigation, the Connect assistant page, the get-started checklist, merging the two results screens, and payments/"Add credit".
## 1. Rupees everywhere
**How money is stored.** Amounts stay whole numbers in the smallest unit, which for rupees is **paise** (₹1 = 100 paise). So ₹10 is stored as `1000`. Whole numbers avoid rounding errors when adding up charges.

**Field names.** Existing fields such as `amountCents`, `balanceCents` and `answerPriceCents` keep their names. They now mean "smallest currency unit" (paise). Renaming them would break ChatGPT/Claude connections that already send `expectedAnswerPriceCents`. To prevent anyone reading `1000` as $10:

- every place that returns money also returns `currency: "INR"`;
  
- shop-search results and `account_status` add a ready-made label, e.g. `answerPriceLabel: "₹10"`;
  
- the MCP tool descriptions and `web/public/SKILL.md` say "in paise (₹1 = 100 paise)".
  

**Settings.**

- Server setting `ANSWER_PRICE_CENTS` changes from `10` to `1000` (₹10).
  
- Welcome credit in `convex/onboarding.ts` changes from `100` to `10000` (₹100), with the reason "₹100 welcome credit". It is still granted once per account, using the same `welcome:<userId>` record.
  
- Database `currency` allows `"INR"`. New records are always INR.
  

**Converting existing data (one-off, × 100).** A one-off server job converts the old dollar amounts:

| Table | Fields multiplied by 100 | Marker so it only converts once |
| --- | --- | --- |
| `creditEntries` | `amountCents`, `amount` | `currency` changes `USD` → `INR` |
| `creditAccounts` | `balanceCents`, `reservedCents` | new optional `currency: "INR"` |
| `creditReservations` | `amountCents` | new optional `currency: "INR"` |
| `tasks` | `answerPriceCents` | new optional `currency: "INR"` |

The job is safe to run twice, because rows already marked INR are skipped. It runs in small batches so it fits Convex's per-call limits. It stops if it finds an account whose totals don't match its history, and reports that account instead of guessing.

**Order on the live server.** Pause calls → convert → change the price setting → turn calls back on. A shop search shown before the switch quoted 10, so its "Call" request will be rejected as a changed price. The user sees "The price changed to ₹10 per answer. Check and press Call again." The changeover is quick, and I'll check with you before running it on the live server.

**Display helper.** One shared function turns paise into text: `1000` → "₹10", `1050` → "₹10.50", `1000000` → "₹10,000" (Indian digit grouping). It replaces the dollar `money()` helper everywhere. Product prices from shops are already in rupees and keep their own formatting.
## 2. Price before calling (shop picker, website and chat card)
Under the shop list, above the button:

> **Up to ₹30** for 3 shops · ₹10 per shop that answers You have ₹100 · ₹0 on hold You pay only when a shop answers and tells us something useful, even if they can't confirm everything. No charge if a shop doesn't pick up, can't help, or the call fails.

- "Up to" = selected shops × price. It updates as shops are ticked.
  
- **Not enough credit:** if the maximum is more than the available credit, the button is disabled and the message says "You have ₹20, enough for 2 shops. Pick fewer shops." There's no "Add credit" button, because there's no payment route yet.
  
- **No price set / calling off:** keep the current blocked message.
  
- **Where the balance comes from:** shop-search results (website search and the chat card's `find_shops`/`more_shops`) add `availableCents` for signed-in users, so the chat card can show it without a separate sign-in. The server still checks the balance when the call is requested. The number on screen is only a guide.
  
- The button text stays "Call 3 shops".
  
## 3. Charge shown on every shop
`tasks:get` already works out the charge per shop. It will also return each shop's `billingState` (`reserved`, `charged`, `released`, `refunded`). The website task page, the inline call card and the chat card all show one line per shop:

| State | Line shown | Colour |
| --- | --- | --- |
| reserved (call not finished) | "₹10 on hold" | grey |
| charged | "Charged ₹10" | grey |
| released | "Not charged · shop didn't answer" / "· shop prefers a personal call" / "· call didn't finish" / "· no useful answer" (chosen from the shop's final state) | grey |
| refunded | "Refunded ₹10" | grey |
| test task / personal test call | "Free test · no charge" | grey |

Task-level totals use the same words:

- **My tasks rows:** "Charged ₹20 · 1 shop not charged". Running tasks show "Up to ₹30 · final charge when calls finish".
  
- **Task page request box:** "Up to ₹30 · ₹10 per shop that answers" while running, then "Charged ₹20 of ₹30 held · ₹10 returned to your credit".
  
- **Inline/chat card footer:** a one-line total once finished, e.g. "Charged ₹20 for 2 of 3 shops."
  
Charge lines are always small grey text: green means only "the shop has it" (DESIGN.md, D72).

## 4. Credit & charges page (`/credit`)
A new signed-in page. Top section:

- **₹80 available** (large)
  
- "₹30 on hold for calls in progress" (only when above zero)
  
- The charging rule sentence from section 2
  

Below that, a list, newest first, 25 at a time with "Load more":

| Example row | Source |
| --- | --- |
| **+₹100** Welcome credit · 7 Oct | `grant` entry |
| **−₹10** Croma, Banjara Hills · iPhone 17 · 7 Oct | `charge` entry, linked to the task |
| **₹0** Not charged · Reliance Digital · shop didn't answer · 7 Oct | `release` entry |
| **+₹10** Refund · Croma · iPhone 17 · 8 Oct | `refund` entry |

Holds are left out of the list, so a call shows up once, when it settles. Money currently held is shown in the top section instead. Each row that has a task links to that task's page.

New server query `credits:history` (signed-in user only, paginated, `by_user` index). It joins each entry to its task's product name and its shop's name. It never returns other users' rows or internal operation IDs.

**Links to it:** the credit strip on the home screen ("₹100 available · View credit"), the My tasks heading, and the Account page. Proper menu placement comes with the navigation piece.
## 5. Plain-word fixes in the money area
| Today | New |
| --- | --- |
| "$0.00 reserved for calls" | "₹30 on hold" (hidden when ₹0) |
| "Approved maximum $0.30 · $0.10 per charged shop answer" | "Up to ₹30 · ₹10 per shop that answers" |
| "Calls use your account credit." | replaced by the section 2 block |
| "Your available credit cannot cover these shops. Add credit or pick fewer shops." | "You have ₹20, enough for 2 shops. Pick fewer shops." |
| "Your account needs credit before calls can start." | "You've used all your credit. Paid top-ups aren't available yet." |
| "Final charges appear when calls finish" | "Up to ₹30 · final charge when calls finish" |
| SKILL.md "$1 test credit" | "₹100 welcome credit" |
## Files expected to change
- Server: `convex/schema.ts`, `convex/credits.ts` (formatting, history query, conversion job), `convex/onboarding.ts`, `convex/tasks.ts` (billingState per shop, totals), `convex/users.ts`, `convex/discovery.ts` / `convex/drafts.ts` / `convex/mcp.ts` (available credit, currency, labels, tool descriptions), `convex/access.ts` (message)
  
- Website and chat card: `web/src/taskPresentation.ts` (paise formatter), `App.tsx` (picker block, card charge lines, credit strip, `/credit` route), `TaskDetails.tsx`, `TaskHistory.tsx`, `AccountDetails.tsx`, new `CreditHistory.tsx`, `types.ts`, CSS
  
- Docs: `web/public/SKILL.md`, `scripts/verify-public-mcp.mjs` if it checks price text
  
- Tests: `backend-tests/credits.test.ts`, `persistence.test.ts`, `oauth.test.ts`, `testCalls.test.ts`, `web/src/taskPresentation.test.ts`, plus new tests below
  
## Testing
Written before the code (test-first):

- **Conversion:** a $1 account with $0.30 held becomes ₹100 with ₹30 held; history entries are multiplied; running it twice changes nothing; a mismatched account stops the job and is reported.
  
- **Welcome credit:** a new account gets exactly 10000 paise once, marked INR.
  
- **Charging:** with the price at 1000, a useful answer charges ₹10, no answer releases ₹10, refund returns ₹10, balances stay correct.
  
- **Old quote:** a request carrying the old price (10) is rejected with the "price changed" message.
  
- **Per-shop state:** `tasks:get` returns the right `billingState` and "Not charged" reason for answered, unreachable, personal-call and failed shops.
  
- **History:** returns only the signed-in user's rows, newest first, with product/shop names and no holds.
  
- **Formatter:** 1000 → ₹10, 1050 → ₹10.50, 1000000 → ₹10,000, 0 → ₹0.
  
- **Picker:** "Up to" updates with selection; insufficient credit disables the button with the right text.
  

Then a run-through on the development server: search → see the price block → call a test task → see per-shop lines → open `/credit`. I'll also check the page at phone width (320px) and desktop width in a browser.
## Rollout
1. Build and test on the development server.
  
2. **Ask you before** touching the live server: pause calls, run the conversion, set the price to 1000, deploy the website to Vercel, turn calls back on.
  
3. Check your own account on the live site: ₹100 shows, history is correct, and nothing was charged during the switch.
  
## Risks
- **An assistant misreading paise as dollars.** Mitigated by `currency`, ready-made labels and updated tool text. Not fully preventable for assistants that ignore them.
  
- **Calls in progress during the switch.** Their holds are converted with everything else, so they settle correctly at ₹10. Pausing calls first keeps this window small.
