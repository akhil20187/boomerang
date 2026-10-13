# Luna named-business search: live replay (redesign step 9, D163, D164)

Date: 2026-10-13. Local Convex backend from the `app-redesign` worktree, branch `inc9-named-business`, real GPT-6 Luna, Google Places and OpenAI web search, as the owner's local test account. `LIVE_CALLS_ENABLED=false`; no Call button was pressed and no task was created. Phone numbers below are shortened. Cards are shown as `[kind] text`; picker rows are listed under their card.

## 1. The failing chat, replayed (chat `kh715nqb…`)

```
USER: I want you to call ainapur consultants and engineers
  [question] What do you want to ask or discuss with Ainapur Consultants and Engineers?
             (choices: Enquire about their services | Ask about availability for a meeting | Request pricing or a quote | Something else)
USER: Something else
  [text] Sure. Type what you’d like us to ask, in your own words.          ← no model call, no second choice list
USER: Ask about ESG and Sustainability services
  [question] Which area are you looking for their ESG and Sustainability services in?
USER: 500049 miyapur
  [brief] Gayatri will call Ainapur Consultants and Engineers to ask about their ESG and Sustainability services for the Miyapur (500049) area.
  [picker] Matches for “Ainapur Consultants and Engineers” near Miyapur ()   ← "()" fixed afterwards (commit "Area text drops empty brackets")
      - Ainapur Consultants and Engineers Pvt Ltd | Google, 2.6 km | phone listed
USER: hi
  [text] Hi! You can choose Ainapur Consultants and Engineers from the card and tap Call when you’re ready.   ← no search
USER: you have ainapur consultants and engineers, can you search
  [text] The card above already shows Ainapur Consultants and Engineers; select it and tap Call when you’re ready.   ← repeat points to the card
USER: search the web for Ainapur Consultants and Engineers
  [text] I couldn’t find Ainapur Consultants and Engineers on Google or the web near Miyapur (). …
```

Finding: the firm **is** on Google Maps (Miyapur, 4.8★ from 5 ratings, phone listed). It never appeared before because Luna only ran a category search ("ESG consultants"). A search by name finds it.

Web lookup for Ainapur (explicit "search the web"): server log `{"searched":true,"kept":[],"dropped":[]}`, so the web search returned no results. In an earlier run the same lookup returned one result whose number was **not printed on its source page**; it was dropped (`"number not printed on the source page"`). The last reply's wording ("on Google or the web", "()") was fixed afterwards: it now names only where we looked ("on the web") and the brackets are gone.

## 2. A findable named business, then the web (chat `kh7dqpp1…`)

```
USER: call Aarvee Associates in Hyderabad and ask if they do ESG audits
  [question] Which area in Hyderabad is Aarvee Associates located in?
USER: Not sure, anywhere in Hyderabad
  [brief] Gayatri will call Aarvee Associates in Hyderabad to ask if they conduct ESG audits, as requested.
  [picker] Matches for “Aarvee Associates” near Hyderabad
      - Aarvee - Corporate Headquarters | Google, 4.1 km
      - Aarvee - Bigups and EWSS Building | Google, 4.9 km
      - Aarvee Associates - Highways PMC | Google, 5.0 km | no phone
      - Aarvee - Sai Chandra Building (Highways) | Google, 5.3 km
      - Aarvee - Rail Division | Google, 5.5 km | no phone
      - aarvee assosiates - GMT lab | Google, 9.6 km
USER: please also search the web for Aarvee Associates
  [brief] I will call Aarvee Associates in Hyderabad to check if they conduct ESG audits and get details about their services.
  [picker] Web results for “Aarvee Associates”
      - Aarvee | found on www.aarvee.com | number printed on that page
```

Server log: `{"searched":true,"kept":[{"name":"Aarvee","site":"www.aarvee.com"}],"dropped":[]}`.

## 3. Not found, then the customer sends the number (chat `kh78aahs…`)

```
USER: call Zyxorva Precision Fabricators in Miyapur 500049 and ask if they do laser cutting
  [brief] We will call Zyxorva Precision Fabricators in Miyapur and ask if they offer laser cutting services.
  [text] I couldn’t find Zyxorva Precision Fabricators on Google or the web near Miyapur. If you have their phone number, send it and I’ll set up the call. Or I can look for similar businesses nearby.
USER: their number is 98490 12345
  [brief] We'll call Zyxorva Precision Fabricators to check if they offer laser cutting services.
  [picker] 1 business you sent
      - Zyxorva Precision Fabricators | provided by you | +91984…45
```

(Made-up firm and number; no call was started.)

## 4. A typed list of names and numbers (chat `kh79xbe5…`)

```
USER: Call these and ask if they repair split ACs: Cool Breeze Services 98490 12345, Arctic Air Care 040 2345 6789
  [brief] We'll ask if they repair split ACs.
  [picker] 2 businesses you sent
      - Cool Breeze Services | provided by you | +91984…45
      - Arctic Air Care | provided by you | +91402…89
```

Sections 2 (web), 3 and 4 use the D148 supplied-contacts path the ChatGPT/Claude app uses: a new brief holding the contacts (`prepareBrief` with `contacts`), then `contacts.prepare`. The customer picks rows and taps Call (D149).

## Not checked live

- The new picker titles and the "Found on … · number from a website, may be out of date" row line were not opened in a browser (backend replay only).
- Pressing Call on a supplied or web card (live calls are off locally).
- Pages that block bots or load the phone number with JavaScript: their numbers can't be checked, so they are dropped.
