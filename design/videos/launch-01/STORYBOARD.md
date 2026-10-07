---
format: 1920x1080
duration: 26s
message: "Har dukaan ko call — every shop near you gets a call, and the answer comes back."
arc: Hook → Problem → Drop/Turn → Ask → Calls → Answer → CTA
audience: Indian buyers who compare prices online but never call nearby shops
mode: collaborative
music: custom — assets/audio/soundtrack.wav (Lyria desi track + phone ring + overlapping recreated sample calls), mounted once at the root for the full 26 s
captions: skipped (no narration)
---

# Boomerang — desi launch video

## Video direction

- **No voiceover.** Every reveal is cued to the **music beat grid**, not words. Track: ~128 BPM, beat = 0.47 s, beats fall at 0.09 + n×0.47 s (absolute). **The drop lands at 7.13 s** (Frame 3 start). Bars are 1.88 s. Each frame lists its local hit times; land key reveals on them.
- **Palette (frame.md desi wrapper):** title cards use hot pink `pink`, saffron `green`, marigold `yellow`, teal `blue`, warm paper `cream`, always with **black ink** text and the 4px black border + hard offset shadow atoms. Never put white text on the bright fills.
- **Real product screens stay real.** The PNG screenshots in `assets/screens/` are shown untouched (no recolouring, no filters) inside a clean white browser/device frame with the blockframe border + shadow. Their own colours (green = has it, amber = needs attention, grey = no luck) keep their meaning. Overlays may sit *around* or *on top of* a screen (stickers, pointers, rings) but never repaint it.
- **Desi type voice:** big Hinglish lines in the display ramp (uppercase, 800 weight), each with a small English subline in the body/label style beneath, so non-Hindi viewers follow. Hinglish words are written in Latin script.
- **Motion grammar:** hard and percussive — **beat slams** (scale 1.3→1 with a fast settle), spring pops for stickers, hard cuts on beats, a few whip pushes. Long-tail `power3`/`expo` settles; slight overshoot allowed on stickers only. Tilted stickers (±3–6°) like signboard stickers.
- **Held / breather frames:** Frame 6's price holds still for its last ~1.2 s; Frame 7's end card holds still for its last ~1.5 s. Everything else keeps moving on the beat.
- **Logo rules:** use `assets/brand/boomerang-logo.svg` (dark mark + wordmark) on light fills only. **Never** a white "b" on a black square. The logo's green lives only in the logo.
- **Honesty labels:** any shop price other than Apple's ₹99,900 carries a small "Sample" label; Frame 6 shows "Recreated sample call · AI voices". Never say "saved" or "cheaper than online".
- **Negative list:** no purple/blue "AI" gradients, no bokeh, no fake brand logos, no invented UI states, no browser chrome beyond a minimal frame, no slideshow (front-load then freeze), no screensaver drift, no white text on bright fills. Plan content in the top ~83% (bottom band clear).

## Frame 1 — Online price

- scene: "₹99,900 online" slams in; "Online toh dekh liya." then "Shayad offline mein aur kam mile?"
- duration: 2.9s
- poster: 2.0s
- transition_in: cut
- type: hook
- beat: curiosity
- status: animated
- src: compositions/frames/01-online-price.html
- asset_candidates: none (pure type)
- blueprint: kinetic-type-beats (Adapt)
- focal: price type
- roles: none
- music_hits_local: 0.09, 0.56, 1.03, 1.50 (strong), 1.97, 2.44, 2.90 (strong)

Adapt: keep the in-place token swap; three quick beats on one cream field.
Scene 1 (0.0–0.9s): warm-paper `cream` full-bleed ground with a thin truck-art strip band (`assets/gen/truck-art-strip.png`, cropped thin) across the very top edge. Centered, ~55% of frame: label-pill "ONLINE" (marigold) + "iPhone 17 · 256GB" heading-md + "₹99,900" heading-xl all slam in together at 0.09 (one beat slam, black ink). Tiny source line under the number: "Apple India store price · 7 Oct 2026".
Scene 2 (0.94–1.9s): price group shrinks up to the top third; "ONLINE TOH DEKH LIYA." heading-lg on a marigold block slams beneath at 0.94, English subline "You've checked online."
Scene 3 (1.88–2.9s): that line swaps in place (hard cut) to "SHAYAD OFFLINE MEIN AUR KAM MILE?" heading-lg on a hot-pink block, tilted −3°, English subline "Maybe it's even less at a shop nearby?"; a saffron star-burst "?" pops at its upper-right on 2.44. Hold to the cut.
- handoff_out: the hot-pink "SHAYAD OFFLINE MEIN AUR KAM MILE?" block — centred horizontally, its centre at y=60% of frame, scale 1, opacity 1, rotation −3°, static at the cut.

## Frame 2 — Kaun karega?

- scene: Evening bazaar of phone shops; "Par dukaan ko call kaun karega? 10 dukaan. 10 calls." builds to the drop
- duration: 4.23s
- poster: 3.2s
- transition_in: cut
- type: pain_point
- beat: frustration → tension
- status: animated
- src: compositions/frames/02-kaun-karega.html
- asset_candidates: assets/gen/bazaar-shutters.png
- blueprint: kinetic-type-beats (Adapt)
- focal: assets/gen/bazaar-shutters.png
- roles: bazaar-shutters = background (full-bleed, slow push-in, darkened ~35% at the top third for text)
- music_hits_local: 0.07, 0.54, 1.01, 1.48, 1.95, 2.42, 2.89, 3.36, 3.83 (the drop follows at 4.23 = cut)

Adapt: keep the escalating relay of short statements landing alone; stage them over the bazaar photo instead of a bare canvas.
- handoff_in: the hot-pink "SHAYAD OFFLINE MEIN AUR KAM MILE?" block from Frame 1 — centred horizontally, centre at y=60%, scale 1, opacity 1, rotation −3°, static.
Scene 1 (0.0–1.4s): bazaar photo full-bleed (cut in on 0.0), slow continuous push-in across the whole frame. The carried-over hot-pink "SHAYAD OFFLINE MEIN AUR KAM MILE?" block (with its English subline) stays exactly where Frame 1 left it, then at 0.54 slides up into the upper third.
Scene 2 (1.48–2.8s): at 1.48 the block swaps in place to "PAR DUKAAN KO CALL KAUN KAREGA?" heading-lg on a marigold block, English subline "But who's going to call the shops?". Small phone-ring sticker icons (saffron/teal circles, black phone glyph) pop one per beat over the shop fronts — 1.95, 2.42 — with a count pill ticking "1 → 4 CALLS".
Scene 3 (2.89–4.23s): at 2.89 the headline swaps to "10 DUKAAN. 10 CALLS." heading-xl on a saffron block, tilted −4°, English subline "Ten shops. Ten calls."; stickers keep popping on 3.36 and 3.83 while the count pill ticks to "10 CALLS"; stickers jitter and the push-in accelerates into the cut at the drop.

## Frame 3 — Ab Boomerang karega

- scene: On the drop, the truck-art frame bursts in and Boomerang lands: "Ab Boomerang karega."
- duration: 1.87s
- poster: 1.2s
- transition_in: cut
- type: product_intro
- beat: release / payoff
- status: animated
- src: compositions/frames/03-ab-boomerang.html
- asset_candidates: assets/gen/truck-art-frame.png, assets/brand/boomerang-logo.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/brand/boomerang-logo.svg
- roles: truck-art-frame = background (full-bleed, its magenta centre is the stage) · boomerang-logo = cutout
- music_hits_local: 0.00 (DROP), 0.47, 0.94, 1.41

Adapt: keep the spring-bloom-from-zero signature on the mark; one fast bloom, no orbiting parts.
Scene 1 (0.0–0.5s): exactly on 0.00 the truck-art frame slams in from scale 1.15 → 1 with a one-frame white flash. Centered inside the magenta centre: a warm-paper `cream` card (4px border, 8px shadow) springs open from zero; the Boomerang logo blooms inside it.
Scene 2 (0.47–1.87s): "AB BOOMERANG KAREGA." heading-xl in black on a marigold block slams in under the card at 0.47; English subline "Now you can." on 0.94. Small hot-pink sticker "AI CALLS SHOPS FOR YOU" pops tilted at upper-right on 1.41. Hold.

## Frame 4 — Bas pick karo

- scene: The real chat: an iPhone 17 request, five nearby shops listed and ticked, "Call 5 shops" pressed
- duration: 3.76s
- poster: 2.8s
- transition_in: cut
- type: feature_showcase
- beat: clarity
- status: animated
- src: compositions/frames/04-bas-pick-karo.html
- asset_candidates: assets/screens/chat-window.png
- blueprint: device-surface-showcase (Adapt)
- focal: assets/screens/chat-window.png
- roles: chat-window = supporting hero inside a white browser frame (real screenshot, untouched)
- music_hits_local: 0.00, 0.47, 0.94, 1.41, 1.88 (bar), 2.35, 2.82, 3.29

Adapt: keep the held device-surface hero; the "screen cycle" becomes staged reveals of one real screenshot via masks plus a camera push to the button.
Scene 1 (0.0–1.4s): teal `blue` ground with a subtle stripe-block corner. Right ~65% of frame: white browser frame holding `chat-window.png`, entering with a quick whip-slide from the right landing on 0.00. A top-to-bottom mask reveals only the user's message bubble first (0.0–0.47), then the assistant line and shop card header (0.47–0.94). Left 35%: "BAS PICK KARO." heading-lg on a marigold block slams at 0.47; subline "Ask your AI. Pick the shops." at 0.94.
Scene 2 (1.41–2.8s): the mask continues down the five shop rows, one row per half-beat (cascade), each row's tick visible as it is revealed. A hot-pink sticker "5 DUKAAN · NEAR 500037" pops beside the list on 1.88.
Scene 3 (2.82–3.76s): camera pushes in toward the black "Call 5 shops" button; a press-spring ring overlay (black ink ring, not recolouring the button) pulses on it at 2.82 and again at 3.29. Into cut.

## Frame 5 — Ek saath, sab ko call

- scene: The call map — five shops ringing at once, Hinglish questions popping like signboard stickers over overlapping call voices
- duration: 5.64s
- poster: 4.2s
- transition_in: wipe
- type: feature_showcase
- beat: momentum / many at once
- status: animated
- src: compositions/frames/05-ek-saath.html
- asset_candidates: assets/screens/call-map.png, assets/gen/truck-art-strip.png
- blueprint: agent-progress-theater (Adapt)
- focal: assets/screens/call-map.png
- roles: call-map = hero inside a white card (real screenshot, untouched) · truck-art-strip = supporting (thin band top and bottom edges of frame)
- sound: overlapping call voices + phone ring already in the soundtrack from 12.76 s absolute (local 0.0)
- music_hits_local: 0.00, 0.47, 0.94, 1.41, 1.88, 2.35, 2.82, 3.29, 3.76, 4.23, 4.70, 5.17

Adapt: keep the "machine visibly working, then the receipt" spine; the loader theater is ringing pulses + sticker questions, and the receipt is the map's own status chips.
Scene 1 (0.0–1.9s): hot-pink `pink` ground; truck-art strip bands across top and bottom edges (thin). Centered-left ~55%: white card (4px border, 8px shadow) holding `call-map.png`. Concentric black ring pulses radiate from the map's centre dot ("You · 500037") on every beat. Top-right: "EK SAATH, SAB KO CALL." heading-lg on marigold, slams at 0.0; subline "Every shop gets a call. At the same time." at 0.47. A counter pill "CALLING 5 SHOPS" pops at 0.94.
Scene 2 (1.9–4.3s): speech-bubble stickers (cream, black border, tilted ±5°) pop over the map's shop labels one per beat with what the AI asks: "IPHONE 17 HAI?" (1.88), "LAVENDER MEIN?" (2.35), "FINAL PRICE?" (2.82), "CARD OFFER?" (3.29) — each with tiny English under it ("In stock?", "In lavender?", "Final price?", "Any card offer?"). Earlier bubbles shrink back as new ones pop, so at most two are on screen.
Scene 3 (4.23–5.64s): bubbles clear on 4.23; the ring pulses stop; a saffron sticker "JAWAB AA GAYE" ("The answers are back") slams at 4.70 pointing at the map's status chips (which the screenshot already shows). Small label at the card's bottom edge: "Example · sample answers". Into cut.

## Frame 6 — Dukaan ka final price

- scene: The real answer card: ₹95,900, in stock, in the shop's own words — beside the online ₹99,900
- duration: 3.75s
- poster: 3.0s
- transition_in: cut
- type: benefit_highlight
- beat: proof / payoff
- status: animated
- src: compositions/frames/06-final-price.html
- asset_candidates: assets/screens/answer-card.png
- blueprint: titlecard-reveal (Adapt)
- focal: assets/screens/answer-card.png
- roles: answer-card = hero (real screenshot, untouched, inside a white card)
- music_hits_local: 0.00, 0.47, 0.94, 1.41, 1.88, 2.35 (energy holds; frame holds still from ~2.5)
- sound: the shop's line "…with ICICI card, four thousand off. So ninety-five nine hundred final." plays in the soundtrack across local ~0–2.6 s

Adapt: keep the one restrained reveal + still hold; add a two-price side-by-side above it.
Scene 1 (0.0–1.4s): marigold `yellow` ground. Right ~55%: white card holding `answer-card.png` slides up with a single slam at 0.0 (the ₹95,900 is the screenshot's own big number). Left 40%, upper: "DUKAAN KA FINAL PRICE" label-pill (black on cream) at 0.0; heading-lg "₹95,900" in black on a cream block at 0.47 with small label "With ICICI card · Sample".
Scene 2 (1.41–2.5s): below it, a smaller grey-ink line slides in at 1.41: "Online list price ₹99,900" (no strike-through, no "saved"). A hot-pink sticker "DUKAAN KE APNE SHABDON MEIN" ("in the shop's own words") pops at 1.88 pointing at the screenshot's quote line.
Scene 3 (2.5–3.75s): held still. Bottom of the left column, small: "Recreated sample call · AI voices".

## Frame 7 — Har dukaan ko call

- scene: End card on the truck-art frame: "Har dukaan ko call." Boomerang logo, site address, "Try karo"
- duration: 3.85s
- poster: 3.0s
- transition_in: wipe
- type: cta
- beat: invitation
- status: animated
- src: compositions/frames/07-har-dukaan.html
- asset_candidates: assets/gen/truck-art-frame.png, assets/brand/boomerang-logo.svg
- blueprint: kinetic-type-beats (Adapt)
- focal: assets/brand/boomerang-logo.svg
- roles: truck-art-frame = background (full-bleed) · boomerang-logo = cutout on a cream card
- music_hits_local: 0.00, 0.47, 0.94, 1.41, 1.88, 2.35 (music fades out from ~2.45 to the end)

Adapt: keep the closing line snapping beat-by-beat onto the logo + URL; end on a long still hold.
Scene 1 (0.0–1.4s): truck-art frame full-bleed. Centered in its magenta centre: "HAR DUKAAN KO CALL." heading-xl in black on a marigold block slams at 0.0; English subline "Every shop near you gets a call." on a cream strip at 0.47.
Scene 2 (1.41–2.4s): a cream card (4px border, 8px shadow) springs up beneath with the Boomerang logo (1.41), then the address "tinyurl.com/tryboomerang" in label/counter type (1.88) and a hot-pink sticker "TRY KARO" tilted at the card's corner with tiny English "Free credits to start." (2.35). Never show a dollar amount.
Scene 3 (2.4–3.85s): everything holds still to the final frame while the music fades. No exit animation.
