# One Boomerang teaser: researched Codex prompt

Research date: 7 October 2026. Prompt drafted; no video rendered or watched.

## Recommendation

Use Codex with the existing Hyperframes skill for the first video. Hyperframes turns HTML and animation code into video. This is a fit for Boomerang's existing HTML landing demo and brand assets. This recommendation is an inference from the documented workflow and our project, not a measured comparison of video quality.

There is no established universal “best prompt”. The strongest fit found is a source-grounded brief with a specific story, timed scenes, real product assets, output requirements and visual verification.

## Sources and useful findings

- [Hyperframes official Prompt Guide](https://hyperframes.app/docs/3-guides/2-prompting): explicitly covers Codex. Recommends invoking the skill, supplying duration, shape, style and assets; describes using existing URLs/documents as context. Documents preview, targeted revisions, validation and MP4 rendering. Closest direct match to this request.
- [Remotion: Product Demo for Presscut](https://www.remotion.dev/prompts/product-demo-for-presscut): published creator prompt asks for faithful app UI, marketing-page guidance and plain language. Listed as Claude Code/Opus 4.5, so it is an example of a coding-agent brief, not evidence of a Codex-tested prompt. Borrow UI fidelity and buyer-facing language.
- [Remotion: Launch Video on X](https://www.remotion.dev/prompts/launch-video-on-x): published creator prompt specifies dimensions, frame rate, scene durations, screen content, motion, palette and ending. Listed as Claude Code/Opus 4.6. Borrow precise scene structure; its terminal/provider tour does not fit Boomerang's buyer problem.
- [Official OpenAI prompting guidance](https://learn.chatgpt.com/docs/prompting): state goal, context, output and material boundaries; request verification. Applied below as a concrete deliverable with source paths and acceptance checks.

The source pages and prompts were read. Embedded example videos were not visually watched. No platform performance claims or ranking by engagement are made.

## Copy-paste prompt for Codex

```text
Use the hyperframes and hyperframes-cli skills to create ONE 28-second
Boomerang problem-first product teaser for Twitter/X and LinkedIn.
Hyperframes is already available in this workspace. Read its instructions.

Goal
Make a buyer recognise this problem: we compare prices online, but a nearby
shop might have a better offer. Calling every relevant shop ourselves is
too much effort. Now we can ask Boomerang to make those calls.
The emotional turn is “Now you can. With Boomerang.”
Keep setup instructions, coding tools and feature catalogues out of this story.

Ground the video in these project sources
- memory.md: active product decisions, especially the teaser direction.
- DESIGN.md: approved typography, colours and product behaviour.
- design/pages/landing-story.html: existing product demo and shop answers.
- design/brand/final/: approved returning-b logo and wordmark.
- design/pages/assets/phone-lavender.webp: existing product image.
Reuse the approved assets and UI. Do not redesign the app.
Use the existing simulated demo; do not place real calls or spend credit.

Proposed production format
One 1080×1080 square video, 30fps, H.264 MP4.
Square is a first-draft creative choice, not a claim about platform rankings.
White background, near-black type, system font, green only as approved.
Large mobile-readable text. Crisp flat cards. Smooth purposeful motion.
No stock footage, talking avatar, fake 3D phone, confetti or neon effects.
The entire story must work with sound off. First draft has no voiceover
or background music; use motion and readable text to carry the story.

Storyboard: exact narrative beats, refine visual pacing within each beat
0–4s: “You compare prices online.” Show two simple product-price cards
labelled Amazon and Flipkart. Use no unverified real prices.
4–8s: “But what about the shops nearby?” The product stays visible as
nearby shop rows appear. Their prices are unknown, shown as question marks.
8–12s: “One might have a better offer.” Then “Who has time to call them all?”
Show the effort through several pending call rows, without implying stock.
12–15s: “Now you can.” Reveal the approved Boomerang logo and name.
Give this turn room to land.
15–23s: Show a shortened version of the existing product flow:
request an iPhone 17 in lavender near 500037 → select three shops →
click “Call 3 shops” → calling states → shop-by-shop answers.
Use the actual sample answers from the existing demo, not invented bargains.
Show distinct outcomes, including an unavailable or unanswered shop if
present in the source. Mark this sequence “Sample demo · time compressed”.
If a price appears, keep “Sample prices” legible beside the results.
23–28s: “Boomerang makes the calls. You choose where to buy.”
Finish on the logo and a readable “Try Boomerang” plus the current project
site address, verified from project sources. Hold the final card at least 3s.

Truth rules
A nearby shop MIGHT offer a better price; never promise a cheaper result.
Only selected shops get called. Do not imply every shop in a city is called.
Listings do not confirm stock. Preserve unknown and unanswered outcomes.
Do not present the simulated UI as a real customer session.
No human handoff, guaranteed timing, testimonials or unsupported features.

Workflow and delivery
First show a concise storyboard/contact sheet using the actual assets for
review; identify any design choice that conflicts with DESIGN.md.
After that visual direction is approved, build in design/videos/teaser-01/.
Keep application source and the deployed website unchanged.
Preview the timeline; inspect every scene and transition at full resolution
and scaled to phone width. Fix clipping, unreadable labels and overlaps.
Run Hyperframes lint and validation; address errors and contrast warnings.
Render the MP4 and inspect frames from the rendered file, including the
opening, product answers and final card. Watch playback when possible.
Deliver the editable composition, final MP4 and a poster image.
Report what was actually checked and any playback checks not performed.
```

## Next step

Use this prompt to prepare one visual storyboard. Duration, square format and silent treatment are proposals, not recorded product decisions.
