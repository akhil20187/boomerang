# Signed-in experience: second audit (Claude)
7 October 2026. A second opinion alongside the [Codex audit](./2026-10-07-signed-in-ux-audit.md). I only read the code; I didn't change anything, open the live site, or make calls.
## The short version
I agree with Codex's five points. I'd add one theme it underplays: **money**. The app knows exactly what each call cost, but it hardly tells the user. On top of that, it shows two currencies side by side, and it charges for answers it labels "unconfirmed" without saying why. That's a trust problem, and it matters more than layout.
## What a new user sees today
After signing in from the Account page, they land on **My tasks**: an empty list that says "No tasks yet" and has a "Find shops" link. If they click it, the home screen shows, top to bottom:

1. A grey strip: their email, "$1.00 available credit", "$0.00 reserved for calls", and possibly "Add your name before calls"
  
2. The headline "Find it nearby. Let us make the calls."
  
3. A "Try a call to yourself" box
  
4. The search form
  

Nothing explains what $1 buys, what "reserved" means, or how to use Boomerang from ChatGPT or Claude, which is the main way to use it (D44).
## My findings, most important first
### 1. Price is never shown before you approve calls (agree with Codex #2)
The price is $0.10 per shop that gives a useful answer (D92). The "Call 3 shops" button sends that price to the server as your approval, but the screen only says "Calls use your account credit." The user is agreeing to a price they never saw.

**Fix:** under the button, show: "Up to $0.30 · $0.10 per shop that answers · you have $1.00". Add one line under that: "No charge if a shop doesn't pick up or can't help."
### 2. Two currencies on one screen (new)
Credit and charges are in **dollars** ($1.00, $0.10). Product prices from shops are in **rupees** (₹99,900). The customer is an Indian shopper. Seeing "$0.10" next to "₹99,900" makes people stop and wonder whether they'll be charged in dollars, and how much that is.

**Fix (needs your decision):** either show credit in rupees, or keep dollars and say so clearly once (for example, "Boomerang credit is in US dollars"). This is a product choice, not a code detail, so I haven't assumed either.
### 3. Users can't see which calls were charged and which weren't (new, your point)
The server already records every step: credit held, charged, released (not charged) or refunded, for each shop. The screens show only:

- My tasks: "Charged $0.20" per task, once it's finished
  
- Task page: "Approved maximum $0.30 · $0.10 per charged shop answer" while running, then the total
  

What's missing:

- **Per shop:** "Charged $0.10" or "Not charged: shop didn't answer" on each shop row. Today only "prefers a personal call" says "No charge for this shop."
  
- **Refunds:** a refunded shop looks the same as a charged one.
  
- **Credit history:** there's no page listing "Welcome credit +$1.00", "Charge −$0.10 · Croma Banjara Hills", "Released · no answer". The data for it exists.
  

**Fix:** add a "Not charged / Charged $0.10 / Refunded" line on every shop, plus a **Credit & charges** page that lists every money movement.
### 4. "Unconfirmed" answers can still be charged, with no explanation (new)
The server charges when a shop answered and gave _anything_ useful: a price, an offer, a stock answer or even just a note (D18/D92). So a shop marked "Partial answer · details unconfirmed" or "Answered · stock unconfirmed" can cost $0.10. To the user, "unconfirmed" sounds like "didn't work", so a charge there feels wrong.

**Fix:** state the rule in one plain sentence wherever price appears: "You pay $0.10 when a shop answers and tells us something useful, even if they can't confirm everything." Show the per-shop charge next to the answer, so the user can see what they paid for.
### 5. No way to connect an AI assistant from inside the app (agree with Codex #1)
The Account page has "Connect your AI assistant" → "Create access key", and that's all. There's no server address to paste, no steps for ChatGPT or Claude, no "test it" button, and no link to the setup page. A key with nowhere to put it doesn't help.

**Fix:** a **Connect assistant** page: choose ChatGPT or Claude → copy this address → paste it here (with a screenshot or steps) → "Check connection". Move "access keys" under an "Advanced" fold.
### 6. First screen after login has no "what now" (agree with Codex #4)
- Signing in lands on an empty task list, not on a starting point.
  
- The Account page still says "Sign in with your email to search and approve calls" to someone who's already signed in.
  
- Free things aren't explained together: $1 welcome credit (about 10 shop answers) and 5 free test calls to yourself.
  
- The test-call box sits _above_ the search, so the optional thing comes before the main thing.
  

**Fix:** a short "Get started" checklist for new users: ✓ Email verified · Add your name · Connect your assistant · Make your first request. Under it: "Free to start: $1 credit (about 10 shop answers) + 5 test calls to yourself." Hide the checklist once those steps are done.
### 7. Navigation is missing the main destinations (agree with Codex #3)
The header shows **My tasks · Demo · Account**. "Find shops" (the main action) is only reachable through the logo. The demo is in the top menu for real users. There's no Help link, and nothing marks which page you're on.

**Fix:** **Find shops · My tasks · Connect assistant · Help**, with Account (and the credit balance) on the right. Move Demo into Help. Highlight the current page.
### 8. Jargon and internal words leak through (new)
| On screen | What a shopper thinks | Plainer |
| --- | --- | --- |
| "$0.00 reserved for calls" | Reserved? | "$0.30 on hold until calls finish" |
| "Account approval pending" | Do I need to do something? | "We're setting up your account" (or remove it: D97 approves automatically) |
| "Live calling is being connected" | Is it broken? | "Shop calling is paused right now. You can still search." |
| "AI" badge on every shop | Is there a human option? | Remove until humans also call, or add "Called by our AI" |
| "Call status unconfirmed · checking provider" | What provider? | "Checking how the call went…" |
| "Approved maximum" | Did I approve something? | "Up to $0.30" |
### 9. Test calls and real tasks are mixed together (new)
Test calls to yourself show up in **My tasks** alongside real shop requests, and they link to a different screen (the home page) than real tasks do. The test-call list numbers them "Test 5, Test 4…", which reads like a countdown. Keep test calls in their own small section, or label them clearly in the list and open them on the same kind of page as real tasks.
### 10. Two different results screens (agree with Codex #5)
The same task looks different on `/app?task=` and `/status?task=`, with different wording ("Answered · stock unconfirmed" vs "Some details unconfirmed") and different icons (drawn icons vs ☎ ⌖ ⌃ ⌄ text symbols). The website version also links to "Open live status on website" while you're already on the website.
## Where I disagree slightly with Codex
- Codex puts the setup guide first. **I'd put money first** (findings 1–4): it's smaller to build, it's a trust issue on every single call, and the data already exists. The setup guide is bigger and depends on checking current ChatGPT/Claude steps.
  
- Codex says "keep the five free test requests separate from shop-call credit." Agreed, but say both together on the first screen, so the user knows _everything_ that's free.
  
## Suggested order
1. **Money clarity:** price before calling, per-shop charged/not charged, the charging rule in one sentence, credit history page. Decide on currency first.
  
2. **Navigation + Connect assistant page**
  
3. **Get-started checklist** on first login
  
4. **One results screen** and the jargon clean-up
  
## What I didn't check
- Read the code only. I didn't open the live site, sign in fresh, or check phones, zoom, keyboard use or colours.
  
- I didn't check the current setup steps for ChatGPT or Claude.
  
- The $0.10 price comes from memory D92 (set on the development server). I didn't confirm the live server's value.
