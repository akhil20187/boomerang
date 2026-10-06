# Design: store calls inside ChatGPT and Claude
Written 4 October 2026. Status: design for review. Nothing here is built or tested inside ChatGPT or Claude yet.

Approved screens: [design canvas, page 2](https://claude.ai/artifact/AwqGeQkT8MDxeKkwCArYkQ) (private link). Decisions referenced as D-numbers live in [memory.md](../../../memory.md).
## 1. What we are building
A customer asks ChatGPT (or Claude) to find a product in nearby shops. They share a product link (Amazon, Flipkart or any other shop) or just describe the product, such as "iPhone 17, lavender, 256GB", plus a pincode. A card appears in the chat with nearby stores. They tick the stores they want and tap **Start calls**. Our AI agent phones each store, and a person from our team takes over when the AI can't finish. The same card shows live progress and then each store's answer: stock, final price, card offers, a note and, when available, the call recording.

The website comes after this (D44). The live status page in this design is the first piece of that website.

**Words used in this document**

- **Card:** the small interactive screen we build, shown inside the chat. OpenAI calls these apps (Apps SDK); the shared standard is called **MCP Apps**.
  
- **MCP server:** our backend that ChatGPT or Claude talks to. It offers **tools**, which are named actions such as "find stores".
  
- **Convex:** where our backend, database and hosting live.
  
- **Task:** one customer request: one product, the chosen stores, and all their calls.
  
## 2. In this version, and not
**In:**

- A product link (Amazon, Flipkart or other) or a typed description, plus a pincode, in the chat, and the store card (D58).

- Store selection, five at a time with "Show 5 more stores".
  

- AI calls with one retry, and per-store results.

- Call recordings when we have them.
  
- Call and directions icons for every store.
  
- An email with a live status link, and a second email when the task is done.
  
- A live status web page on our `.convex.site` address.
  

**Not in this version:**

- Buying or holding stock for the customer (D08).
  
- SMS, which is parked (D49).
  
- Human callers and the hand-off to them. Designed and built after AI calling works (D60).
  
- Free guest calls. They stay on the website only; in the chat the customer is signed in (D59).
  
- Chat notifications through MCP Events, planned for later (see section 9).
  
- Payments, which are covered by the open questions.
  
- Languages other than English for real store calls.
  
## 3. The customer's journey
1. **Ask.** The customer writes something like "Need this today near 500037" with a product link, or just describes the product. If the pincode is missing, ChatGPT asks for it before calling us (D45).
  
2. **See stores (screen 1).** Our server reads the product from the link, finds nearby stores through Google, and returns them. The card shows the product photo, name, variant and Amazon price, then up to 5 stores.
  
3. **Choose (screen 2).** The customer ticks stores. "Show 5 more stores" adds the next five to the same card, and ticked stores stay ticked. "No more stores within 10 km" ends the list (D47). The Start button sits at the end of the list and counts the ticked stores: "Start calls · 3 stores".
  
4. **Start.** We create one task and start calling. We email the customer a link to the live status page (D49, D51).
  
5. **Watch (screens 3a, 3b).** The same card switches to call status and updates itself while the chat is open (D57).
  
6. **Results (screen 3c).** Each store shows its final answer. When everything is done, the card posts a short message into the chat so ChatGPT can sum up, for example "Aptronix has it at ₹79,900 with ₹4,000 off on ICICI". We send the "task done" email.
  
7. **Act.** The customer taps the call icon to phone a store from their own number (D52), or the map icon for directions, or opens the full results on the website.
  
## 4. Screens
Same style on every screen (D54): **Crisp**, meaning 8px corners, flat, thin grey borders and square-ish icon buttons.
### Screen 1 and 2: store list and selection
- **Product block:** photo, name, storage and colour, Amazon price.
  
- **Header line:** "5 stores near 500037" and "Highest rated · 50+ Google ratings".
  
- **Each store row:** tick box, name · area, distance · opening hours, and ★ rating with the number of ratings, e.g. "★ 4.6 (1,240)" (D54). When hours are unknown, the row says "Hours unknown" in amber.
  
- **Order:** Google rating, highest first. Stores with fewer than 50 Google ratings are hidden. They only fill in when there aren't 5 stores with 50+ ratings, and then they're tagged "few ratings" (D55).
  
- **Bottom of the list:**
  
  - "Show 5 more stores"
    
  - the Start button
    
  - "Calls use your account credit. A listing doesn't confirm stock." Free guest calls are website-only (D59).
    
### Screens 3a, 3b, 3c: one card at three moments
3a, 3b and 3c are one card that changes over time (D57).

**Top of the card:**

- product photo and a headline:
  
  - 3a: "Calling 10 stores…"
    
  - 3b: "4 of 10 stores done"
    
  - 3c: "10 stores called · 4 have it"
    
- a progress bar
  
- summary tags, such as "3 in stock · 4 calling · 2 retrying"
  

**Each store row, collapsed (the default):**

- **Line 1:** name · area
  
- **Line 2:** ★ rating (count) · distance · hours
  
- **Line 3:** a status line plus a small "AI", "Human", "Queued" or "4 tries" tag. Calls in progress show a pulsing dot.
  
- **On the right:** a call icon and a map icon.
  

**Status lines:**

| State | Example text | Colour |
| --- | --- | --- |
| Waiting | Waiting to call | grey |
| AI calling | AI agent calling | blue, pulsing |
| Retry booked | No answer · retry at 4:10 | amber |
| Handed to human | Handed to human · calling | amber, pulsing |
| Human calling | Human caller calling | blue, pulsing |
| Found | In stock · ₹79,900 | green |
| Not found | No stock · expected Friday | grey |
| Gave up | Couldn't reach | amber |

In the first version there are no human callers (D60). When a shop wants a person (hung up on the AI or asked for one), the row shows "Prefers a personal call" (amber), and the opened row says "Best to call them directly. No charge for this shop." (D79). Later, with human callers: "Passed to our team". The human rows above come back when human callers are built.++}{#s7}

**Tapped open (expanded):**

- **Timeline:** each step with its time, for example "Store hung up on the AI agent · 4:06", then "Human caller is calling · try 1 of 2 · 4:08".
  
- **Answer box,** once the store has answered: price, card offers, note. Anything the store didn't confirm says "Unconfirmed".
  
- **Address.**
  
- **Recording:** "Listen to the call 1:42" when one exists (D50). Otherwise: "No recording for this call. The answer comes from the caller's notes" (D25).
  
- **When a store couldn't be reached:** only the failed tries show. There's no answer box.
  

**Bottom of the card:**

- "Show N more stores", the same as on screen 2
  
- "Open live status on website", which becomes "Open full results on website" on 3c
  
- "We also emailed you this link."
  
## 5. How it works inside ChatGPT and Claude
Both apps support the same standard for cards inside the chat (MCP Apps). ChatGPT adds some extras of its own. We build to the shared standard first.
### Tools our server offers
| Tool | Who calls it | What it does |
| --- | --- | --- |
| `find_stores` | the AI | Takes a product link (Amazon, Flipkart or other) or a typed product description, plus the pincode. Reads the product, finds and ranks stores, and saves a draft. Returns data only, no card. |
| `show_store_card` | the AI | Takes the draft ID and shows the card (screens 1–2). This is the only tool that shows a card, following OpenAI's advice to keep data tools and display tools separate. |
| `more_stores` | the card only | Returns the next 5 stores for the draft. |
| `start_calls` | the card only | Takes the draft ID and the ticked stores, creates the task and starts the calls. Tapping twice must not create two tasks. |
| `task_status` | the card only | Returns the current state of every store in the task. The card asks for this every few seconds while it's open. |
| `recording_link` | the card only | Returns a short-lived link to play one call's recording. |

"Card only" tools are hidden from the AI and can only be used from the card. The standard supports this.
### How the card stays up to date
- **While the chat is open,** the card asks `task_status` every 5 seconds during calls and every 30 seconds while waiting on a human. It changes in place without adding chat messages.
  
- **When the customer leaves and comes back,** the card reloads and asks for the latest status. The customer can also type "any update?".
  
- **When everything is done,** the card posts a message into the chat. The app may ask the customer to allow this.
  
- **Not possible:** we can't reach the customer through ChatGPT after they close the chat. That's why we send the email and keep the web page.
  

### Sign-in

Customers in the chat are expected to have signed up already, mostly on our website (D59). The first time they use our app in ChatGPT or Claude, they link it to their account by signing in once. ChatGPT and Claude both support this "account linking" for apps; the exact setup is not checked yet. Calls then use their account credit. Free guest calls are website-only.

 The card runs in a locked-down frame. We declare our `.convex.site` address so it can fetch status and play recordings from there.

**Still to test in the real apps:**

- whether a "call this number" link opens the phone dialer from inside the card
  
- whether recordings play inside the card
  

**Fallbacks if they don't work:**

- the call icon shows the number with "Copy"
  
- the play button opens the recording on our status page
  
### Sources (read 4 October 2026, docs only)
- [OpenAI: add UI to your MCP server](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
  
- [OpenAI Apps SDK reference](https://developers.openai.com/apps-sdk/reference)
  
- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)
  
- [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
  
## 6. Backend on Convex
All of this lives in Convex: the database, the functions, the MCP server (served from Convex web endpoints), and the status page (Convex static hosting).
### What we store
| Table | Holds |
| --- | --- |
| `drafts` | Product details read from the link, pincode, ranked store list, and when it was created. |
| `stores` | Google details per store: name, area, address, phone, rating, rating count, hours, map link, and when we fetched them. |
| `tasks` | Draft, chosen stores, customer email, overall state, created and finished times, and the private status-page ID. |
| `storeCalls` | One per store in a task: current state, answer fields, which fields are confirmed, notes. |
| `callAttempts` | Every attempt: AI or human, start and end, outcome (answered / no answer / hung up / busy / dead number), recording file. |
| `emails` | Which emails went out for a task, so we never send the same one twice. |
### Call rules the backend follows
These already exist (D28, D06, D37):

1. **First call:** the AI agent calls first.
  
2. **No answer:** the AI tries once more 5 minutes later. If there's still no answer, the store goes to a human.
  
3. **Answered, then hung up**, or the store refused to talk to an AI, or the answer was incomplete: the store goes straight to a human.
  
4. **Human calls:** the human caller gets up to 2 tries and stops as soon as they have the answer.
  
5. **Unanswered calls:** never shown as "no stock". "No stock found" only appears for stores that actually said so.
  

Retries use Convex's scheduled functions, which run code at a set time later.
### Calling
The existing local test (`voice-test/phone.cjs`) connects a Vobiz phone call to OpenAI's realtime voice model. That's a prototype only. Moving it into the product means:

- an always-on bridge for the audio, which a normal Convex function can't hold open, so it runs on one small extra server (approved, D61)
  
- saving recordings to Convex file storage
  
- writing the AI's structured answer into `storeCalls`
  

{==Opening line of every call:==}{>>this is not required. 
Agent would ideally tell that I am calling behalf of {Customer Name} who is looking to buy the {product details}<<}{#c11} The AI agent opens with: "Hi, I'm calling on behalf of {customer's name}, who is looking to buy {product details}." No recording notice for now (D63).

### Human callers (later, D60)

Not in the first version. The whole human-caller flow gets its own design after AI calling works. Notes so far: each human caller needs a simple page on our site. It shows the store, the product, the questions and the earlier attempts, and has a form to enter the answer and notes. Store names come pre-filled, one row per store (D12). Exactly how human callers are assigned work is an open question.

## 7. Google store data
Store search uses Google's official Places service, which you've already set up (D55, D56). The step-by-step requests and rules are in [GOOGLE_STORE_SEARCH.md](../../project/GOOGLE_STORE_SEARCH.md):

1. find the pincode's location
  
2. search for stores that sell this kind of product
  
3. keep stores within 10 km
  
4. rank and filter by rating
  

We keep the rating and rating count, and leave out review text. A store listing never means the store has stock.
## 8. Email and the status page
**Emails** are sent with Resend, from your account (D51):

1. **Calls started:** product, number of stores, and the live status link.
  
2. **Task done:** a short summary (who has it, at what price) and the results link.
  

Each email goes out once per task, and we log it in `emails`.

**Where the email address comes from:** the card asks for it next to the Start button, unless we already have it from sign-in (question 1 in section 13).

**Status page:** `https://<our-app>.convex.site/task/<private-id>`.

- It shows the same layout as the card: stores, status, answers and recordings.
  
- The ID is long and random, so only people with the link can see the task.
  
- It refreshes live, using Convex's live data.
  
- It works on any phone browser, even when ChatGPT is closed.
  
## 9. Later: MCP Events
ChatGPT can sign up for updates from our server and reply in the chat when something happens, such as "task finished". Today this only works in ChatGPT "Work" chats on the website, the desktop app in Cloud mode, and dots. It needs the newest MCP version (2026-07-28), and the customer has to ask ChatGPT to watch.

We add it after the main flow works, as an extra. Email stays the dependable route. Source: [OpenAI MCP Events](https://developers.openai.com/plugins/build/mcp-events).
## 10. When things go wrong
| Problem | What the customer sees |
| --- | --- |
| - Store calls don't announce recording (D63). The AI says who it's calling for and what they want to buy. Whether India requires a recording notice hasn't been checked; check before calling stores at scale.
## 12. Testing plan, in order
1. **Store search alone:** an Amazon link, a Flipkart link and a typed description each give the same ranked list from Google, using the existing trial request (iPhone 17, 256GB, lavender, 500037). Check the ratings filter.

2. **Card in ChatGPT developer mode:** screens 1–2 show up, ticking works, "Show 5 more" works.
  
3. **Live updates:** with fake call data, check that the card moves through 3a → 3b → 3c while the chat is open, and catches up after leaving and coming back.
  
4. **Call and audio inside the card:** does the call link open the dialer? Does the recording play? Check on a phone and on a computer.
  
5. **One real call** through the existing Vobiz bridge to your own number, with its result showing in the card.
  
6. **A test task against real stores:** only after you agree the call script and the recording notice.
  
7. **Emails:** both arrive, each once, and the links work.
  
8. **Claude:** repeat steps 2–4 in Claude and Claude Desktop.
  

Each step only counts as done once it's checked. We'll note what each check did and didn't cover.
## 13. Open questions
1. **Free calls and sign-in in the chat.** {==The website rules give 2 free successful calls before email login and $5 credit (D36–D39). Do the same rules apply inside ChatGPT? How do we recognise a returning customer there?==}{>>good question but mostly the user might have signed up before chatgpt integration. 2 free calls only via website for now.<<}{#c2}
  
2. **Payment** once the free calls are used up. The rules are set (D31, D32), but how it works is not.
  
3. {==**Human callers:** who they are, how they get tasks, and how much they're paid.==}{>>This is yet to be designed. The whole flow.  First lets build the flow for automated AI Agent calling and then will work on the Human callers.<<}{#c3}
  
4. **Where the always-on call bridge runs.** {==Convex functions can't hold an open phone audio stream. This may need a small extra server, and anything outside Convex needs your approval first.==}{>>works. Approved. Let me know when in doubt.<<}{#c4}
  
5. **ChatGPT plan rules.** Which ChatGPT plans can use a custom app during testing, and what OpenAI's review needs before public release. Not checked.
  
6. **Claude on phones:** whether Claude's mobile app shows these cards. Not checked.
  
7. **Sprint submission:** does GrowthX accept a {==ChatGPT app==}{>>I think this will be like a plugin. And is acceptable.<<}{#c5}, or still need a `.convex.site` link? The status page gives us a live link either way.
  
8. **Most stores per task,** and how many calls run at once.
  
## 14. Suggested build order
1. **Store search.** Convex function plus the Google data from section 7.
  
2. **MCP server** with `find_stores`, `show_store_card` and `more_stores`, plus screens 1–2, tested in ChatGPT.
  
3. **Task and status:** `start_calls`, `task_status` and screens 3a–3c, using fake call results.
  
4. **Status page and emails.**
  

5. **Real AI calls**, by moving the Vobiz bridge onto its small extra server (D61), plus recordings.

6. **Human callers:** design the whole flow first, then build the page and hand-off (D60).

7. **Claude checks**, then MCP Events.
  

Each step ends with something you can try.

---
comments:
  c11:
    by: user
    at: 2026-10-04 17:51:18.476000+00:00
  c2:
    by: user
    at: 2026-10-04 17:42:57.194000+00:00
  c3:
    by: user
    at: 2026-10-04 17:43:55.281000+00:00
  c4:
    by: user
    at: 2026-10-04 17:44:46.023000+00:00
  c5:
    by: user
    at: 2026-10-04 17:45:31.062000+00:00
  c1:
    body: "It can be an amazon link or any other product link like Flipkart or product details shared only like iPhone 17 lavender colour 256gb etc.. \nIt should work either way."
    by: user
    at: 2026-10-04 17:41:35.100000+00:00
  c6:
    body: 'Updated. The input can now be a product link from Amazon, Flipkart or any other shop, or a typed description like "iPhone 17 lavender 256GB". Changed in sections 1, 2, 3, 5 (find_stores), 10 and the testing plan. Note: reading every shop''s page reliably is hard, so when a page can''t be read we ask the customer to type the product.'
    by: Claude
    at: 2026-10-04 17:52:00+00:00
    re: c1
  c7:
    body: 'Got it: free calls stay on the website only, and chat users are expected to be signed-up customers. I added a Sign-in part to section 5 (link the app to their account once) and changed the card line to "Calls use your account credit". I''ll update the store card mockup to match.'
    by: Claude
    at: 2026-10-04 17:52:00+00:00
    re: c2
  c8:
    body: 'Agreed. First version is AI-only. Human callers are moved out of scope and the build order now designs that flow later. One effect: a store the AI can''t finish shows "AI couldn''t finish" instead of "Handed to human" for now.'
    by: Claude
    at: 2026-10-04 17:52:00+00:00
    re: c3
  c9:
    body: Thanks, noted as approved. I'll check with you before picking the actual hosting for that small server.
    by: Claude
    at: 2026-10-04 17:52:00+00:00
    re: c4
  c10:
    body: Noted. OpenAI's docs now call these plugins too, so this fits. The live status page still gives a .convex.site link as a backup.
    by: Claude
    at: 2026-10-04 17:52:00+00:00
    re: c5
  c12:
    body: 'Done: the agent now opens with "calling on behalf of {customer''s name}, who is looking to buy {product details}", and the recording notice is removed (section 6 and section 11). Two gentle flags: (1) I haven''t checked whether Indian rules need a recording notice, since we play recordings back to customers. Worth a quick check before calling many stores. (2) Using the customer''s name means the store hears it. First name only seems safer. Tell me if you want the full name.'
    by: Claude
    at: 2026-10-04 18:05:00+00:00
    re: c11
