# Money Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all money in rupees, show the maximum cost before calling, show charged / not charged per shop, and add a credit history page.

**Architecture:** Amounts stay integer minor units in existing `*Cents` fields, which now mean paise. Server responses add `currency: "INR"`. One shared formatter `formatPaise` renders every amount. A one-off, per-user conversion mutation multiplies old dollar amounts by 100. The UI changes live in the existing React files plus one new `CreditHistory.tsx`.

**Tech Stack:** Convex (queries/mutations, convex-test + vitest), React 19 + Vite, node:test for web helpers.

**Spec:** `docs/superpowers/specs/2026-10-07-money-clarity-design.md`

## Global Constraints

- Price: ₹10 per useful answer = `ANSWER_PRICE_CENTS=1000`. Welcome credit: ₹100 = `10000`, granted once via `welcome:<userId>`.
- Existing data converts at × 100 (D135). Rows already INR are never converted again.
- Keep field and argument names (`answerPriceCents`, `expectedAnswerPriceCents`, `amountCents`, …). Do not rename.
- Every money-bearing response includes `currency: "INR"`.
- Display: `1000` → "₹10", `1050` → "₹10.50", `1000000` → "₹10,000", `0` → "₹0".
- No "Add credit" button. No payment route.
- The only Convex deployment, `little-kangaroo-718`, is the live one. **Do not deploy, set env vars or run the conversion without the user's explicit go-ahead.**
- Git automatic deployment is disabled in `vercel.json` for the merge. Keep it disabled until the controlled rollout is complete. Every reported conversion mismatch must be reconciled before deploying the website or resuming calls; see the spec's rollout gates.
- Copy rule sentence (exact): "You pay only when a shop answers and tells us something useful, even if they can't confirm everything. No charge if a shop doesn't pick up, can't help, or the call fails."

## Review Focus

1. **A user with no `creditAccounts` row** (balance computed from history): conversion must still produce ×100 balances. Test in Task 3.
2. **Legacy entries without `amountCents`** (only `amount`): `amount` ×100 must keep `balances()` correct. Test in Task 3.
3. **Old quote of 10 after the switch:** start must reject with "price changed" wording, and not charge. Test in Task 2.
4. **Picker when the account query hasn't loaded / chat card with no balance:** the price line still shows, and the balance line is hidden instead of showing ₹0. Covered by `priceSummary` tests in Task 1.
5. **Released shop whose final state is `answered` but with nothing useful:** reason "no useful answer", not "shop didn't answer". Test in Task 4.

---

### Task 1: Rupee formatter and price summary helpers

**Files:** Modify `web/src/taskPresentation.ts`, `web/src/taskPresentation.test.ts`, `package.json` (add taskPresentation test to `npm test`)

**Produces:**
- `formatPaise(paise:number):string`
- `priceSummary({priceCents,selected,availableCents}:{priceCents:number;selected:number;availableCents?:number}):{maxText:string;perText:string;balanceText?:string;affordable:number|null;short:boolean}`
- `notChargedReason(state?:string):string`
- `CHARGE_RULE` (exact copy rule sentence)

- [ ] Write the failing tests:
```ts
test('formats paise as rupees with Indian grouping',()=>{
 assert.equal(formatPaise(1000),'₹10');assert.equal(formatPaise(1050),'₹10.50');
 assert.equal(formatPaise(1000000),'₹10,000');assert.equal(formatPaise(0),'₹0');
});
test('price summary caps by available credit',()=>{
 assert.deepEqual(priceSummary({priceCents:1000,selected:3,availableCents:2000}),{maxText:'Up to ₹30',perText:'₹10 per shop that answers',balanceText:'You have ₹20',affordable:2,short:true});
 assert.equal(priceSummary({priceCents:1000,selected:3}).balanceText,undefined);
 assert.equal(priceSummary({priceCents:1000,selected:3}).short,false);
});
test('not-charged reasons follow the final shop state',()=>{
 assert.equal(notChargedReason('unreachable'),'shop didn’t answer');
 assert.equal(notChargedReason('personal_call_needed'),'shop prefers a personal call');
 assert.equal(notChargedReason('technical_error'),'call didn’t finish');
 assert.equal(notChargedReason('answered'),'no useful answer');
});
```
- [ ] Run `node --test web/src/taskPresentation.test.ts`. It should fail because the exports are missing.
- [ ] Implement:
```ts
export const formatPaise=(paise:number)=>{const r=paise/100;return '₹'+r.toLocaleString('en-IN',{minimumFractionDigits:Number.isInteger(r)?0:2,maximumFractionDigits:2})};
export const CHARGE_RULE='You pay only when a shop answers and tells us something useful, even if they can’t confirm everything. No charge if a shop doesn’t pick up, can’t help, or the call fails.';
export function priceSummary({priceCents,selected,availableCents}:{priceCents:number;selected:number;availableCents?:number}){const known=availableCents!==undefined;const affordable=known?Math.floor(Math.max(0,availableCents)/priceCents):null;return {maxText:`Up to ${formatPaise(priceCents*selected)}`,perText:`${formatPaise(priceCents)} per shop that answers`,...(known?{balanceText:`You have ${formatPaise(availableCents)}`}:{}),affordable,short:known&&selected>affordable!}}
export function notChargedReason(state?:string){return state==='unreachable'?'shop didn’t answer':state==='personal_call_needed'?'shop prefers a personal call':state==='technical_error'||state==='failed'?'call didn’t finish':'no useful answer'}
```
Remove `money()` once all callers are migrated (Task 6).
- [ ] Run the tests until they pass, add the file to the `test` script, and commit.

### Task 2: Server in rupees

**Files:** `convex/schema.ts`, `convex/onboarding.ts`, `convex/credits.ts`, `convex/users.ts`, `convex/tasks.ts`, `convex/access.ts`, `backend-tests/credits.test.ts` (+ fixtures in other tests using `currency:'USD'`)

- Schema: `creditEntries.currency: v.union(v.literal('USD'),v.literal('INR'))`; `tasks.currency: v.optional(v.literal('INR'))`.
- Onboarding: `amount:100, amountCents:10000, currency:'INR', reason:'₹100 welcome credit'`, `addGrantToAccount(ctx,userId,10000)`.
- credits.ts: all inserts use `currency:'INR'`. Reserve error → `` `You have ${formatINR(available)}, enough for ${Math.floor(available/price)} ${n===1?'shop':'shops'}. Pick fewer shops.` `` (server-side copy of formatter in `credits.ts` as `formatINR`).
- users.me: `currency:'INR'`, plus `balanceCents`, `availableCents`, `reservedCents`, and `answerPriceLabel`. Keep `creditBalance`/`availableBalance`/`reservedBalance` (now rupees) for existing callers.
- tasks.start: on mismatch → `` `The price changed to ${formatINR(price)} per answer. Check and press Call again. No calls started and no credit was charged.` ``; insert task with `currency:'INR'`.
- access.ts: "You've used all your credit. Paid top-ups aren't available yet."

- [ ] Update the existing welcome tests to expect `availableBalance` 100, `availableCents` 10000 and `currency` 'INR'. Add a test where an old quote of 10 against price 1000 throws /price changed to ₹10/ and creates no reservation. Add a test for the reserve shortfall message "You have ₹20, enough for 2 shops".
- [ ] Run `npx vitest run backend-tests`. It should fail.
- [ ] Implement, re-run until it passes, and run `npm run typecheck`. Commit.

### Task 3: One-off conversion job

**Files:** `convex/credits.ts` (export `convertUserToRupees` helper), `convex/maintenance.ts` (internal mutations `convertCreditsToRupees({cursor})` and `convertTaskPricesToRupees({cursor})`), `backend-tests/currencyMigration.test.ts`

Per-user, one transaction: if the user has any `USD` entry, check that `creditAccounts.balanceCents` (if present) equals the sum of non-hold entries. If it doesn't match, skip the user and return them in `mismatched`. Otherwise multiply `amount`/`amountCents` on every entry and set `INR`; multiply the account's `balanceCents`/`reservedCents` and every `creditReservations.amountCents`. The batch job paginates `creditEntries` (100 per call), collects the distinct users and converts each one, returning `{converted, mismatched, continueCursor, isDone}`. Tasks job: tasks without `currency` and with `answerPriceCents` → ×100, set `INR`.

- [ ] Tests: (a) an account with a 500¢ grant and three 100¢ holds → after conversion: balance 50000, reserved 30000, available 20000, each reservation row 10000. (b) A legacy entry with no `amountCents`, `amount:5`, and no account row → `availableCents` 50000. (c) Running it twice changes nothing. (d) An account whose balance doesn't match its history is reported and left unchanged. (e) A task with `answerPriceCents:10` → 1000 and `currency:'INR'`; running again leaves 1000.
- [ ] Fail → implement → pass → commit.

### Task 4: Per-shop charge data and task totals

**Files:** `convex/tasks.ts` (`get`, `history`), `backend-tests/credits.test.ts`

- `get`: each shop adds `holdCents` (reserved amount), `refundedCents`, and `chargeNote`: `{kind:'held'|'charged'|'not_charged'|'refunded'|'free', amountCents, reason?}` built from the shop's `billingState` and state. `free` applies when the task is `selfTest` or `verification`. The task adds `heldCents` (sum of held), `releasedCents`, `maxCents = answerPriceCents*shops`, and `currency:'INR'`.
- `history.summary` adds `notChargedCount`, `maxCents`, `currency`.
- [ ] Test: start 3 shops, settle one charged, one released with state `unreachable`, one released with state `answered` and no answer. Expect chargeNote kinds and reasons `shop didn’t answer` / `no useful answer`, `task.chargedCents` 1000 and `releasedCents` 2000. Refund the charged shop → `refunded`.
- [ ] Fail → implement (the reason strings duplicate `notChargedReason`; keep them identical) → pass → commit.

### Task 5: Credit history query and search results with balance

**Files:** `convex/credits.ts` (public query `history`), `convex/discovery.ts`, `convex/drafts.ts`, `convex/mcp.ts`, `web/public/SKILL.md`, `backend-tests/credits.test.ts`

- `credits:history({paginationOpts})`: signed-in only. Uses `creditEntries` `by_user`, `order('desc')`, filters out `reservation`, and returns `{_id,_creationTime,type,amountCents,reason,taskId,productName,shopName}`. Never returns `operationId` or another user's rows.
- `callingQuote()` adds `currency:'INR'` and `answerPriceLabel` (e.g. "₹10"). discovery/drafts/mcp search results add `availableCents` when the user is known.
- mcp tool text: "answerPriceCents is in paise (₹1 = 100 paise); show answerPriceLabel to the customer". `account_status` adds `availableCents`, `currency`. SKILL.md: "$1 test credit" → "₹100 welcome credit", plus a paise note.
- [ ] Tests: two users' entries → each sees only their own, newest first, no reservations, and the shop name is joined. Unauthenticated call throws.
- [ ] Fail → implement → pass. Run `node --test mcp/*.test.mjs` and `scripts/verify-public-mcp.mjs` text checks if affected. Commit.

### Task 6: Website and chat card UI

**Files:** `web/src/App.tsx`, `web/src/TaskDetails.tsx`, `web/src/TaskHistory.tsx`, `web/src/AccountDetails.tsx`, new `web/src/CreditHistory.tsx`, `web/src/types.ts`, `web/src/style.css`/`tasks.css`, `vercel.json`

- Picker footer: price block from `priceSummary` + `CHARGE_RULE`. Disable when `short`, and show "You have ₹20, enough for 2 shops. Pick fewer shops." Balance comes from `data.availableCents`.
- CallCard + DetailsShop: one line per shop from `chargeNote` (held grey / charged default / not charged green / refunded green / free grey). Finished CallCard footer: "Charged ₹20 for 2 of 3 shops."
- TaskDetails request box: running "Up to ₹30 · ₹10 per shop that answers", finished "Charged ₹20 of ₹30 held · ₹10 returned to your credit".
- TaskHistory rows: "Charged ₹20 · 1 shop not charged" / "Up to ₹30 · final charge when calls finish". Heading: "₹80 available" + "View credit" link to `/credit`.
- CreditStatus: "₹100 available · View credit", "₹30 on hold" only when > 0. Remove the dollar strings.
- `/credit` route in `Live()` renders `<CreditHistory/>` (top summary + rule + paginated list with links to `/status?task=`). Add `credit` to the vercel.json SPA route regex. Link from the Account page.
- Delete `money()` and replace its callers with `formatPaise`.
- [ ] `npm run typecheck`, `npm run build`, all tests. Then open the local dev server in a browser at 320px and desktop widths and check the picker block, the demo card, and the empty `/credit` page. A real signed-in check needs the server deployed, which waits for your OK. Commit.

### Task 7: Final verification and memory

- [ ] Run the full suite: `npm test`, `npx vitest run backend-tests`, `npm run typecheck`, `npm run build`.
- [ ] Review the whole branch.
- [ ] Update memory.md with the result, what was verified, and what wasn't. Ask the user for go-ahead on the live rollout (pause calls → deploy server → run conversion → set price 1000 → deploy website → resume).
