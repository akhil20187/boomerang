// Saves sharp 2x screenshots of real Boomerang page parts for the launch video.
// Usage (from repo root): node design/videos/launch-01/shoot-screens.cjs
const { chromium } = require('playwright');
const path = require('path');
const out = path.join(__dirname, 'assets/screens');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto('https://little-kangaroo-718.convex.site/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(9000); // let the hero call map finish its iPhone run
  const shots = [
    ['.map', 'call-map.png'],
    ['.map-head', 'call-map-head.png'],
    ['#chat-demo .chat-window', 'chat-window.png'],
    ['.answer', 'answer-card.png'],
  ];
  for (const [sel, file] of shots) {
    const el = page.locator(sel).first();
    if (!(await el.count())) { console.log('missing', sel); continue; }
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
    await el.screenshot({ path: path.join(out, file) });
    const b = await el.boundingBox(); console.log(file, Math.round(b.width) + 'x' + Math.round(b.height), '@2x');
  }
  // The answer section with its transcript, if it sits in a wider wrapper.
  const wrap = page.locator('.answer').first().locator('xpath=..');
  await wrap.screenshot({ path: path.join(out, 'answer-with-call.png') });
  console.log('answer-with-call.png', JSON.stringify(await wrap.boundingBox()));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
