# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

Covers: the cards inside ChatGPT and Claude (now), and the landing page and website (later, same rules). Approved screens: [design canvas, page 2](https://claude.ai/artifact/AwqGeQkT8MDxeKkwCArYkQ). Decision numbers (D…) point to [memory.md](./memory.md).

**The job (V1):** When I need a product today and it isn't available online, help me find out which nearby shops have it, and what I'd really pay after offers, without me calling strangers or spending an evening on the phone, so I can walk into the right shop knowing I didn't miss a better deal.
## 1. The feeling, in labels
- **Proof beside every answer:** who called, what time, and the recording. The answer feels believable without our logo.
  
- **Every shop accounted for:** shops that didn't answer stay on the list, with what happened. You know nothing was skipped.
  
- **Unknowns marked, never guessed:** "Unconfirmed" in plain sight. You never act on a wrong fact.
  
- **The final price, not the sticker price:** the price after offers is shown first when a shop gives one. Comparing takes a glance.
  
## 2. References, one per component
Reference list and files: [design-reference/](./design-reference/README.md). Live setup page: [Connect Boomerang](https://claude.ai/artifact/JtHpB48ydhSQGZNGzEy1Bz) (private), copy in [design/pages/](design/pages/connect-boomerang.html).

**The card:** [OpenAI apps-sdk-ui](https://openai.github.io/apps-sdk-ui/)

- Take: spacing, thin borders, how a list sits inside a chat card, card fits its content with no inner scrolling.
  
- Ignore: their example content and colours beyond the system ones.
  

**A card that changes as things happen:** [Shapeshift](https://shapeshiftui.vercel.app/)

- Take: one card that changes shape as the task moves on (shop picker → call status → results).
  
- Ignore: the big text box, the timer and note cards, the "did you mean" chips.
  

**Live call status:** Swiggy / Zomato order tracking

- Take: one calm status line per shop that moves forward on its own. You don't need to watch it.
  
- Ignore: maps, delivery-person photos, promotions.
  

**Rating with count:** Google Maps shop listing

- Take: the exact format "★ 4.6 (1,240)".
  
- Ignore: review text, photos, "popular times".
  

**Recording player:** WhatsApp voice note, [design-reference/voice-note-player-whatsapp.png](./design-reference/voice-note-player-whatsapp.png)

- Take: a speed pill (1x → 1.5x → 2x), a play/pause icon, and waveform bars. Played bars are dark and the rest faded. A dot sits at the play point, and you tap the waveform to jump. Elapsed time sits under the left, and the call time under the right.
  
- Ignore: WhatsApp's green bubble, read ticks, everything around the player.
  

**Proof and timeline:** courier tracking (e.g. Delhivery)

- Take: time-stamped steps, newest last ("Shop hung up on the AI agent · 4:06" → "Human caller is calling · try 1 of 2 · 4:08").
  
- Ignore: barcodes, hub names, delivery partner details.
  
**Landing and setup page hero:** [Wispr Flow](design-reference/wisprflow-hero-centered-contrast-fonts.png)
- Take the principle: the promise sits centred, and contrasting type carries meaning. For us, upright is the price you see online ("₹79,900 on Amazon.") and italic is the real price ("₹75,900 at a shop 4 km away.").
- Ignore: their wording pattern, fonts, cream background and lavender button.

**Call becomes data:** [Wispr Flow wave → text](design-reference/wisprflow-wave-to-text.png)
- Take the principle: messy speech goes in and clean output comes out. For us, the call's words pass through a waveform and become **our own approved shop rows**, three shops with three outcomes, so "every shop accounted for" is visible.
- Ignore: their ribbon and chip styling.

**One thing to copy:** [Monid](design-reference/monid-give-this-to-your-agent.png)
- Take the principle: setup starts with one thing to copy. For our buyers, that's the server address to paste into ChatGPT or Claude.
- Ignore: the developer "give this to your agent" framing, which belongs on a later developer page.

**Rule for all references:** take the principle, never the surface. Start from the buyer's pain and our own screens.

## 3. Type and colour
**Font:**

- Chat cards use the phone's own font: SF Pro on iPhone, the system sans-serif on Android, and `system-ui` on the web. No custom fonts, even full screen; OpenAI's card guidelines require this.
  
- The landing and setup pages use the system font only: bold, tight headings in black on white, with one contrast colour, green, for "the shop has it" (D82). The hero is a scroll story: the Amazon price tag gets cut, and the nearby shop's green price tag appears.
  

**Sizes:**

| Size | Weight | Used for |
| --- | --- | --- |
| 16px | semibold | Card headline, e.g. "5 shops near 500037 may have your iPhone 17" |
| 15px | medium | Shop names, button words |
| 13px | regular | Status lines, answers, line under the headline |
| 12px | regular | Details: rating · distance · hours, addresses, times, small print |

**Colours:**

- **Text and background:** inside ChatGPT and Claude, use the host app's own text and background colours. The card background is white everywhere, including opened rows, with no grey panels (D78). For the landing page: `#1A1A19` text on `#FFFFFF`.
  
- **Accent:** near-black `#1A1A19`, **only** on the main button ("Call 3 shops"). Nothing else gets the accent.
  
- **Errors:** red, only for real errors ("Couldn't load shops right now").
  
- **One meaning per colour (D72):**
  

| Colour | Means | Example |
| --- | --- | --- |
| Green `#17573A` | The shop has it | "In stock · ₹79,900" |
| Blue `#2341B5` with a pulsing dot | A call is happening now | "AI agent calling" |
| Amber `#7A4A00` | Needs attention: retrying, or couldn't reach | "No answer · retry at 4:10" |
| Grey `#55544F` | Answered but no luck, or waiting | "No stock · expected Friday" |
| Red `#B42318` | Something broke | "Calls couldn't start" |

**Shape:**

- "Crisp": 8px corners, flat, thin grey borders (`#DAD7D0`), no shadows, no gradients.
  
- Icon buttons are square-ish outlines at 34px, inside 44px tap areas.

- Use Lucide outline icons through the shared `web/src/Icon.tsx` component on website results, chat cards and the demo. Default size 18px, stroke width 2; do not substitute text symbols for phone or directions actions.
  
**Logo (D108):** the "returning b": a lowercase b, tilted as if mid-throw, whose stroke curves back toward a green dot. Files: [design/brand/final/](design/brand/final/).

- On the website: mark + lowercase "boomerang" in the system font, bold, tight, in the text colour (`.site-brand` on the landing and setup pages, `.brand` in the app's top bar). Favicon and app icon are the white b on a green tile.
- The logo's green `#16A34A` lives **only** in the logo. It never marks a status; "the shop has it" stays `#17573A`.
- Never put the b white-on-black in a square: that is Cartoon Network Boomerang's mark.
- Chat cards still carry no logo (section 6).

## 4. Screens
### Supplied business contacts (D148)
ChatGPT supplies researched or customer-provided business contacts. Use the existing card style with “Businesses” / “Business results”, exact phone numbers and source links (“Provided by you” for customer contacts). No Google attribution, invented ratings, distance, hours or “Near …” line when those details are absent. Show directions only for an actual address/maps URL. Confirm names, numbers, enquiry and maximum charge before calling. One task contains one job per business, including that business's retry attempts.

V1 is one card that changes (D70). It starts as the shop picker and becomes the call card after "Call N shops". This goes against OpenAI's "no multiple views in a card" guideline, so if app review objects, the fallback is a new call card under the picker, with the same screens.
### Shop picker
For choosing which shops we call.

**Top to bottom:**

1. Product photo, the headline, and the line under it (section 5).
  
2. One row per shop, highest Google rating first. Shops with fewer than 50 ratings are hidden unless there aren't 5 others. Each row has:
  

- a tick box
  
- name · area
  
- ★ rating (count) · distance · hours. Unknown hours show as amber "Hours unknown".
  

3. "Show 5 more shops" adds the next five to the same card. Ticked shops stay ticked. In the chat the word follows the request ("Show 5 more institutes"). At the end of the list: "No more <noun> within 10 km. <Noun> with fewer than 50 Google ratings are hidden." When fewer than 10 came up within 10 km, a "Search up to 20 km" button under that line runs the wider search itself (no chat message) and puts the result in the same card; ticks stay. The headline names what the customer gave: "5 institutes near Ameerpet" or "5 shops near 500016".
  
4. The main button.
  
5. Price, just above the main button (D135): "**Up to ₹30** for 3 shops · ₹10 per shop that answers", then "You have ₹100", then the charging rule in small grey text: "You pay only when a shop answers what you asked, even partly or with a condition. No charge if a shop doesn't pick up, asks for a personal call, or can't answer any of it." (D150) If the credit is short, the balance line turns amber: "You have ₹20, enough for 2 shops. Pick fewer shops." and the button is disabled. Under the button: "A listing doesn't confirm stock."
  
6. Charges after calling: each shop row carries one small grey line, "₹10 on hold", "Charged ₹10", "Not charged · shop didn't answer" or "Refunded ₹10". Charge lines are never green; green stays "the shop has it" (D72).
  

**Main action:** "Call 3 shops" (the count follows the ticks) → the same card becomes the call card.

| State | Words |
| --- | --- |
| Empty | "No shops near 500037 seem to sell this. Search a wider area?" + "Search up to 20 km" |
| Loading | "Finding shops near 500037 that may have your iPhone 17…" |
| Error | "Couldn't load shops right now. Try again." + "Try again" (red) |
| Done | Rows shown. At the end of the list: "No more shops within 10 km. Shops with fewer than 50 Google ratings are hidden." |

If ChatGPT can't read the product link, it asks in chat: "I couldn't read that link. What's the product, model and colour?"
### Call card (started → in progress → results)
For following the calls and reading the answers.

**Top to bottom:**

1. Product photo and headline:
  

- started: "Calling 10 shops…"
  
- in progress: "4 of 10 shops done"
  
- results: "10 shops called · 4 have it"
  

2. Progress bar, then small summary tags, e.g. "3 in stock · 4 calling · 2 retrying".
  
3. One line naming what was picked: "3 shops picked: Aptronix, Vijay Sales, Croma".
  
4. One row per shop, collapsed by default:
  

- **Line 1:** name · area
  
- **Line 2:** ★ rating (count) · distance · hours
  
- **Line 3:** a status line in its colour, plus a small "AI", "Human" or "4 tries" tag
  
- **On the right:** small call and map icons

- **Below the summary:** the saved shop phone number, always visible as a tap-to-call link for follow-up, including when the row is collapsed (D146). Show "Phone number unavailable" when missing. Applies to the chat card and website results.
  

5. Tap a row to open it:
  

- the timeline (time-stamped steps)
  
- the answer: price, offers in the shop's own words, note. Unconfirmed fields say "Unconfirmed".
- for a task with a brief (services, enquiries, D150): one row per question from the brief, marked ✓ answered, ~ answered with a condition, or – "Unconfirmed" (amber). The deciding question is a row like the others. Status line: green "Answered your questions", amber "Answered 1 of 3 questions · rest open", grey "Didn't answer your questions". A clear "no" is an answer.
  
- the address
  
- the recording player when there's a recording. Otherwise: "No recording for this call. The answer comes from the caller's notes."
  

6. "Show 5 more shops", then "Open live status on website", which becomes "Open full results on website" when done. Under it: "We also emailed you this link."
  

**Main action:** none while calls run, because the card updates by itself. Per shop: the call icon → opens the phone dialer to call that shop from the user's own number. The map icon → directions. When everything is done, the card posts a short summary into the chat.

| State | Words |
| --- | --- |
| Empty | not possible, since there's always at least one picked shop |
| Loading | "Starting calls to 3 shops…" |
| Error | "Calls couldn't start. You haven't been charged. Try again." (red) |
| Done, someone has it | "10 shops called · 4 have it" |
| Done, nobody has it | "No stock found at the shops we called." |
| Done, nobody answered | "Couldn't reach any of the 3 shops. You haven't been charged." |

**First version (D60, D79):** no human callers yet. When a shop wants a person (it hung up on the AI or asked for one), the row shows amber **"Prefers a personal call"**. Opened, it says what happened, then "Best to call them directly. No charge for this shop." The call icon on the row is the next step. Never say "couldn't finish" or "failed". **Later, when human callers exist:** "Passed to our team", then "Our team is calling · try 1 of 2".
### Recording player
For hearing the call when you want proof. It sits inside an opened row, with no border or background of its own.

**Left to right:**

- the speed pill
  
- a black play icon, with no circle; it turns into a pause icon while playing
  
- the waveform with the moving dot
  

Under it: elapsed time on the left, "Called 4:07 pm" on the right.

**Main action:** tap play → plays. Tap the waveform → jumps to that point.

| State | Words |
| --- | --- |
| Loading | the waveform shows faded until the audio is ready |
| Error | "Recording didn't load. Open it on the website." |
| Done | stops at the end and resets to the start |
### Signed-in website (D153)
Spec: [signed-in redesign](docs/superpowers/specs/2026-10-12-signed-in-chat-redesign.md). Same colours, type and shapes as the cards above. Every signed-in page sits inside the app shell; `/demo/...` shows each page with sample data and no backend.

**Chat page (`/app`)**
- One column, about 760px wide. The composer stays visible at all times; cards (questions, shop picker, call card) appear inside the conversation.
- Empty state: "What should we call about?", one line under it, three starter chips, and the real balance with "₹10 only when a shop answers".
- The picker's price line and main button live inside the picker card. After "Call", the picker folds to one line and the call card follows.
- The noun follows the request: "shops" for products, the service word ("plumbers") or "businesses" otherwise.
- Home visits (D159): the question cards ask "Which area is it in?" and, optionally, "Apartment or building name? We share it only if a plumber asks for more detail." with a "Skip" choice. Never ask for a house or flat number, street address or full name. Brief questions use the area, never the pincode: "Can you come to Gachibowli today?", never "Can you come to 500032 today?". The brief box note reads "We share only what changes their answer: the area, never your flat number, street address or full name. No booking."

**Sidebar / menu**
- Laptop (≥900px): fixed 270px left sidebar. Phone: top bar (menu button, logo, balance pill → account) and a drawer.
- Order: New request · Chats · Live now / Today / Needs you / Earlier · Call log · Use in ChatGPT or Claude · Account and credit (with balance) · Sign out (grey, last).
- A new account with no chats or tasks shows "Your requests" and "No requests yet. Your chats and calls will show here."
- Each task row: label, then one status line in its DESIGN colour; live tasks carry the blue pulse.

**Call log (`/calls`)**
- One row per call try, newest first. Heading "Call log" and "Every call we made for you, every try, and what it cost."
- Totals in four boxes: calls this month (tries), answered, charged in ₹ (not-charged count), credit left (link to account). No "Add credit".
- Filters are pill buttons with `aria-pressed`: All calls · Charged · Not charged · Needs you. Selected = light grey fill and dark outline, never black fill.
- Laptop: a table (When · Business with task and tap-to-call phone · Try N / AI agent · Result in its status colour · Length · Charge · Open). It scrolls sideways inside its own box. Opening shows the shared opened call in a full-width row with call and directions icons.
- Phone: grouped by day ("Today", "9 Oct"), stacked cards; the phone number and the call/directions icons are always visible (D146).
- An earlier unanswered try reads amber "No answer · tried again". Charge lines are grey: "Charged ₹10", "Not charged · reason", "Refunded ₹10", "Free" for a test call to yourself. Never green.
- "Download CSV" exports the rows on screen in rupees, without recording links; text cells starting with = + - @ are escaped.
- Empty: "No calls yet." + "Start a request". Simulated verification tasks never appear.
- Pages of 10 rows (call tries), not "Load more". Controls under the list: "‹ Previous" · "Page N" · "Next ›". Add "of M" only once every call is loaded (a reliable total); until then the label reads "Page 2 · Showing 11–20". Disabled buttons are faded, never hidden; one page only → no controls.
- The filter applies to every loaded call, then the result is paged; when a page is not full and older calls exist, the next batch loads by itself. Changing the filter returns to page 1.
- Changing page closes any opened call, scrolls to the top of the list and moves focus there. Same on phone (stacked cards) and /demo/calls.

**Use in ChatGPT or Claude (`/connect-assistant`)**
- A two-option switch (ChatGPT / Claude) with real tab semantics; selected = light grey fill and dark outline.
- 1. Copy this address (the MCP address, a Copy button that reads "Copied") → 2. three short steps for the chosen app → 3. "Check connection" ("Connected · ChatGPT · last refreshed …" or "Not connected yet").
- Steps stay generic ("add a custom connector"); menu names change often, so name only what our SKILL.md names.
- Then "Or paste this into any AI assistant: Set me up with Boomerang using …/SKILL.md", and a closed fold "Advanced: access keys" with the access-key controls.

**Account and credit (`/account`, signed in)**
- Balance large in rupees, "About N answers · ₹10 per shop that answers" (price from the server), and "Paid top-ups aren't available yet." No payment or top-up buttons until payments are agreed (D140).
- "Charges and refunds": latest five movements, amounts in text colour (−₹10, +₹100), never green; links "See all calls" and "Credit & charges".
- Then: the name the AI gives shops (editable), email, "Use in ChatGPT or Claude" with connection status, and Sign out.

**Signed out, sign in and sign out** (mockups `SignIn.dc.html`, `JourneyPhone.dc.html`)
- Every signed-out route (`/app`, `/account`, `/calls`, `/connect-assistant`, `/tasks`, `/status`, `/credit`, and `/connect` before the assistant consent) shows one page: a plain header (logo · "See a demo" → `/demo`, no other links) and a centred 420px column. The email link brings the customer back to the page they were on.
- Sign in: "Sign in to Boomerang" · "We'll email you a link. No password." · Email · black "Email me a sign-in link" · "New here? You start with ₹100 credit, about 10 answers. You pay ₹10 only when a shop answers what you asked." · "Then just tell us what to call about" with three example requests (not buttons). A sending error stays under the button and keeps the typed email.
- Check your email: the address in bold, "Open it on this device. It expires in 15 minutes." (the real link lifetime, `convex/auth.ts`), "Not there? Check spam, or wait a minute and send it again.", then underlined "Send it again" (waits 30 seconds after each email; reads "Sent again") and "Use a different email".
- Expired or used link: "That link has expired" · "Sign-in links work once, for 15 minutes. We can send you a fresh one." · black "Send a new link" to the last address used in this browser (or an email field when none is known).
- First visit of a new account (no chats, no tasks, credit to spend): the empty chat shows "You're in. Your ₹100 welcome credit is ready, about 10 answers." once, above "What should we call about?", instead of the usual credit line. The amount is the real balance.
- Sign out (menu and Account page) always asks first: "Sign out of Boomerang?" · "Calls already running keep going. Their answers will be here when you sign in again, and we also email you the results." · black "Sign out" · "Stay signed in". Phone: bottom sheet; laptop: small centred dialog. Focus starts on "Stay signed in", stays inside, Escape or the backdrop closes it, and focus returns to where it was (the menu button on phones).
- After signing out: the sign-in page with "You're signed out. Sign in again any time to see your chats and calls." shown once.
- `/demo/signin` (add `?stage=sent`, `?stage=expired` or `?signed_out=1`) and `/demo/welcome` show these screens with no backend; the demo menu's Sign out opens the real dialog.

## 5. The first screen's words
The shop picker card (D66). Numbers, product and pincode fill in from the search.

- **Headline:** "5 shops near 500037 may have your iPhone 17"
  
- **Under it:** "Pick the shops. Our AI calls them for stock and the final price after offers."
  
- **Button:** "Call 3 shops" → our AI starts calling the ticked shops, and the card switches to live call status.
  
## 6. Principles
- **A listing never means stock.** Only a shop's own answer does.
  
- **Unknown stays unknown.** Show "Unconfirmed", never a guess.
  
- **Every shop we called stays on the list,** including failures, with what happened.
  
- **Proof sits next to every answer:** who called, when, and the recording if we have one.
  
- **The final price comes first** when a shop gives one. Offers appear in the shop's own words, whether that's card discounts, buy 1 get 1 or sold by the kilo. Never compute a price the shop didn't give.
  
- **A rating always shows its count:** "★ 4.6 (1,240)".
  
- **One meaning per colour:** green has it, blue calling, amber needs attention, grey no luck, red broke, black main button.
  
- **Collapsed by default.** One short line per shop. Tap for detail.
  
- **Words people use:** "shops" (never "stores"), rupees, "called on your behalf". No jargon.
  
- **Fit inside the host app:** the phone's own font, the host's colours, and our accent only on the main button. No logo; trust comes from showing how the work was done.
  
## 7. Approved designs (Claude Design canvas)
Canvas: [Boomerang ChatGPT Cards](https://claude.ai/artifact/AwqGeQkT8MDxeKkwCArYkQ). It's private until you share it from the canvas's Share menu. Every screen is clickable: press Play on a screen to try it.

Copies of each screen's source are in [design/canvas/](./design/canvas/), taken on 5 October 2026. They only display on the canvas, which supplies the code they run on. Treat the canvas as the live version and these files as a backup.

**Page "Approved screens"**

| Screen on canvas | File | What it shows |
| --- | --- | --- |
| 1 · Shop list | `Main.dc.html` | Shop picker: product photo, approved headline, 5 shops with ratings and counts, tick boxes, "Call 2 shops" |
| 2 · Select shops + show more | `More.dc.html` | Ticking shops, "Show 5 more", the 50-ratings rule, end-of-list message |
| 3a · Calls started (collapsed) | `StatusStart.dc.html` | Call card just after the tap: 5 calling, 5 waiting |
| 3b · Calls in progress (collapsed) | `Status.dc.html` | Mid-way: in stock, prefers a personal call, retrying |
| 3c · Results (collapsed) | `DoneCompact.dc.html` | Final results, summary tags, website link |
| 3a · expanded | `ExpandA.dc.html` | Opened rows: AI calling, waiting |
| 3b · expanded | `ExpandB.dc.html` | Opened rows: in stock (with recording player), prefers a personal call, retrying |
| 3c · expanded | `ExpandC.dc.html` | Opened rows: in stock, prefers a personal call, no stock, couldn't reach |

`DoneCompact.dc.html` holds the shared call card that 3a, 3b, 3c and all the expanded screens display. It also holds the recording player.

**Page "Compare: one card vs two"**

| Screen on canvas | File | What it shows |
| --- | --- | --- |
| Option 2 · Same card changes (chosen) | `FlowOne.dc.html` (uses `Flow.dc.html`) | **Chosen (D70).** Tap "Call 3 shops" and the picker turns into the call card |
| Option 1 · New status card (fallback) | `Flow.dc.html` | Fallback if app review objects: the picker stays and a new call card appears below |

**Mockups match this document** as of 5 October 2026. They use the phone's own font, "shops", the approved headline, a black main button, the "shops picked" line and "Prefers a personal call" instead of human rows. If they ever differ, this document wins.

**Signed-in redesign mockups (reference):** [design/redesign-canvas/](design/redesign-canvas/) holds copies of the "Boomerang App Redesign" canvas (chat, sidebar, call log, connect, wallet, opened call). They are reference only: where they differ from section 4 "Signed-in website" (for example the Wallet's "Add credit" buttons or black selected filters), this document wins.

Known gaps in the mockups:
- All shop names, prices, ratings and answers are sample data.
- No screen shows the "No recording for this call" case right now, because the human-answered example was removed for the AI-only first version.
- The comparison screens (option 1 and 2) are a simpler 3-shop demo. Their rows don't open.

## Not decided yet
- The landing page's first-screen words. The setup page uses "₹79,900 on Amazon. / ₹75,900 at a shop 4 km away." with sample numbers for now.
  
- A developer page with our own SKILL.md for coding agents. Parked.
  
- Dark mode: the exact colour values for ChatGPT and Claude in dark mode. Not checked.
  
- Claude's own card guidelines. Only OpenAI's have been read.
