# Prompt: Boomerang setup page

Written 5 October 2026. It adapts two sources to our product:
- the prompt formula and review loop from [Muzli: Opus 5.5 builds Muzli Picks-level websites](https://muz.li/blog/claude-opus-5-5-for-designers/)
- [Anthropic's frontend-design guidance](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design)

The content and rules come from [DESIGN.md](../../DESIGN.md) and the agreed decisions (D81, D82).

## 1. Build prompt

```
Build the setup page for Boomerang, a service where your AI
(ChatGPT or Claude) gets an AI agent to phone the shops near
you and come back with who has the product, the final price
after offers, and the call recording.

Visitors are urgent buyers in India who'd rather not call shops.
They hate talking to strangers and being put on hold, they lose
an evening dialling shop after shop, and they're never sure they
got the best deal. They want to connect Boomerang to ChatGPT or
Claude in 3 minutes and trust it will work.

Mood: calm, exact, quietly confident. Like a good receipt:
every number earned. Not a flashy AI startup.
Type: the system font (SF Pro on Apple devices) for everything.
Bold, tight display weights for headings, regular text weight for
body. One family, two clearly different weights.
Colour: white background, near-black text. Exactly one contrast
colour, green #0F6B3E, meaning "the shop has it". Status colours
follow DESIGN.md (blue calling, amber needs attention, grey no
luck). The main button is near-black.
Surfaces: Apple-style frosted glass ONLY where something sits on
top of the scene: the two price tags and the copy-address panel.
Use translucent white, backdrop blur and saturate, a hairline
light border and one soft shadow. Put soft lavender and green
blurred colour fields behind the hero so the glass has something
to blur. Everything else stays flat white.

The one memorable thing: a scroll-driven hero. A real lavender
phone (design/pages/assets/phone-lavender.webp) carries a glass
price tag, "₹79,900 · on Amazon". As you scroll, a black line
cuts the price. Then a green tag swings in: "₹75,900 · at a shop
4 km away · in stock today · with your ICICI card". Captions
narrate: the online price, then "our AI called the shops near
you", then "one 4 km away has it". Then the button appears.
Everything else on the page stays quiet.

Sections, in order (all wording already approved, keep it exact):
1. Hero scroll scene, then the "Add to ChatGPT or Claude" button.
2. Why: "Calling shops is painful. So we skip it, and miss the
   best deal." Then "Now you can call them all, without picking
   up the phone." (exact words in D83). No human-handoff claim.
3. How we found it: the call's words, a live waveform, and our
   own shop rows filling in for 3 shops with 3 outcomes (in
   stock, prefers a personal call, no stock).
4. The calls you hate, gone: each pain struck through, our
   answer in bold under it.
5. Copy one address (glass panel), then ChatGPT/Claude steps
   in tabs.
6. Ask, the way you'd ask a friend: the sample request.
7. If something's off, then the footer with sources.

Motion: one orchestrated moment, the hero scroll scene (scroll-
linked, sticky). The call demo plays on its own. No fade-up on
every section, and no hover effects on every card. Respect
prefers-reduced-motion by showing the finished hero. It must
work on a phone at 390px with a 16px gutter and no sideways
scroll.

Do not use: cream backgrounds, italic accent words, 01/02/03
section labels, pill-shaped buttons, purple-to-blue gradients,
emoji, cards with a coloured left border, Inter or Space
Grotesk, the Apple logo or Apple's own photos, glass on every
block, or any wording other than ours. Never say "stores";
say "shops".

Single HTML file; the only image is the phone. Every colour is
a token, with a dark mode. Touch targets of at least 44px, and
a visible focus state.
```

## 2. Review prompt (run after every build or change)

```
Take screenshots at 1440 and 390 pixels wide, in light and dark
mode, at three scroll depths through the hero (start, cut,
green tag) and of each section below it. List the three weakest
things you see, as an art director would, then fix them. Before
calling it done, remove one accessory. Do not touch anything I
have not mentioned, and do not change any wording.
```

## Why these choices fit Boomerang

- **The one memorable thing is the price cut,** because it's the outcome the buyer wants: what they'd really pay. A generic "AI magic" visual wouldn't say that.
- **Glass only where it means something:** the tags sit on top of the scene like real price stickers. Glass everywhere would turn the page into decoration.
- **The system font fits** because the product lives inside ChatGPT and Claude, which use the device's own font (DESIGN.md section 3).
- **The review loop catches problems early,** like the price tags overlapping on phones in round 1.
