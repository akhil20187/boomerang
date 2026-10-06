# Design reference

Visual references for the Boomerang website: screenshots, links and notes.

Drop screenshots and images straight into this folder.

## Links

<!-- One per line: link — what you like about it -->

### Shapeshift
- Live: https://shapeshiftui.vercel.app/
- Code: https://github.com/anishfn/shapeshift
- What I like: the UI builds itself from what you type. One text box, and the card underneath changes shape to match (type "focus 25 min" and you get a timer card).
- Details noticed: a single narrow column (560px wide), one large rounded input (22px text), "Did you mean" chips under the input, saved cards in a list below, and soft animations when cards appear.
- Why it fits us: a pasted Amazon link could turn into a product card, and a pincode into a store list, all from one input.

## Reference set for DESIGN.md (agreed 5 Oct 2026, D74)

| Component | Reference | Take |
|---|---|---|
| The card | OpenAI apps-sdk-ui — https://openai.github.io/apps-sdk-ui/ | Spacing, borders, list inside a chat card |
| Card that changes | Shapeshift (above) | One card changes shape instead of new screens |
| Live status | Swiggy / Zomato order tracking | One calm status line that moves forward on its own |
| Rating with count | Google Maps shop listing | "★ 4.6 (1,240)" format |
| Recording player | WhatsApp voice note | Play button, waveform bars, length |
| Proof and timeline | Courier tracking (e.g. Delhivery) | Time-stamped steps, newest last |

### Voice note player (WhatsApp)
- Screenshot: `voice-note-player-whatsapp.png` (shared 5 Oct 2026).
- Take: speed pill (1x/1.5x/2x), play/pause, waveform with played bars bright and the rest faded, a dot at the play position, tap the waveform to jump, elapsed time under the left, call time under the right.
- Ignore: WhatsApp's green bubble colours, read ticks, the video player around it.

## Landing / setup page references (5 Oct 2026)

### Wispr Flow hero — `wisprflow-hero-centered-contrast-fonts.png`
- Take: the core value proposition centred; contrasting type in the headline (upright serif line, then an italic serif line: "Don't type, / just speak."); a small uppercase eyebrow above; plain sans sentence under it; one button; small availability line.
- Ignore: their cream background, lavender button, top banner and nav.

### Wispr Flow wave → text — `wisprflow-wave-to-text.png`
- Take: messy spoken words flow in along a curve, pass through a waveform pill in the centre, and come out the other side as clean text on a dark ribbon. For us: a shop call's words flow in, pass through the call waveform, and come out as data (shop · in stock · ₹ price · offer).
- Ignore: the "Removed Umm" chip styling and their colours.

### Monid "Give this to your agent" — `monid-give-this-to-your-agent.png`
- Take: one line the user pastes into their AI agent ("set up https://…/SKILL.md"), in a dark code block with a copy button, then "and let it take it from there." We need our own SKILL.md for this.
- Ignore: the agent logo row and binary-digit background.
