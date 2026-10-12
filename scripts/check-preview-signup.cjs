// Isolated browser and delivery simulator; never dials a phone number.
const { chromium, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const readline = require('node:readline');
const { ConvexHttpClient } = require('convex/browser');
const { anyApi } = require('convex/server');
const website = 'https://boomerang-git-development-akhil20187s-projects.vercel.app';
const email = 'delivered+preview-20261012@resend.dev';
(async () => {
  const project = JSON.parse(fs.readFileSync('.vercel/project.json'));
  const config = JSON.parse(execFileSync('vercel', ['api', '/v9/projects/' + project.projectId, '--scope', 'akhil20187s-projects'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const bypass = Object.keys(config.protectionBypass || {})[0];
  if (!bypass) throw Error('No automation access configured.');
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage();
  // Add the Vercel header only to the preview host, never to Convex or providers.
  await page.route(website + '/**', route => route.continue({ headers: { ...route.request().headers(), 'x-vercel-protection-bypass': bypass } }));
  const client = new ConvexHttpClient('https://unique-wombat-849.convex.cloud');
  try {
    await page.goto(website + '/account');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await expect(page.getByText('Check your email', { exact: true })).toBeVisible();
    console.log('Preview simulator signup accepted; awaiting its sign-in link on stdin.');
    const input = readline.createInterface({ input: process.stdin });
    const link = await new Promise(resolve => input.once('line', resolve)); input.close();
    const url = new URL(link);
    if (url.origin !== website || !['/account', '/tasks'].includes(url.pathname)) throw Error('Wrong preview link origin.');
    await page.goto(url.href);
    await expect(page.getByText('₹100', { exact: false }).first()).toBeVisible();
    await page.goto(website + '/app');
    await expect(page.getByRole('heading', { name: 'Find it nearby. Let us make the calls.' })).toBeVisible();
    await page.screenshot({ path: '/private/tmp/boomerang-preview-signup.png', fullPage: true });
    const jwt = await page.evaluate(() => Object.entries(localStorage).find(([key]) => key.startsWith('__convexAuthJWT'))?.[1]);
    if (!jwt) throw Error('Browser session missing.');
    client.setAuth(jwt);
    const account = await client.query(anyApi.users.me, {});
    if (account.email !== email || !account.eligible || account.balanceCents < 10000 || account.currency !== 'INR') throw Error('Development account or credit check failed.');
    await client.query(anyApi.tasks.history, { paginationOpts: { cursor: null, numItems: 10 } });
    const response = await page.request.get(website + '/.well-known/oauth-protected-resource/mcp', { headers: { 'x-vercel-protection-bypass': bypass } });
    const discovery = await response.json();
    if (discovery.authorization_servers?.[0] !== 'https://unique-wombat-849.convex.site') throw Error('Wrong preview MCP issuer.');
    const skill = await page.request.get(website + '/SKILL.md', { headers: { 'x-vercel-protection-bypass': bypass } });
    if ((await skill.text()).includes('https://www.askboomerang.online')) throw Error('Preview setup still links to production.');
    console.log('Verified preview browser signup, email redemption, welcome credit, approved development account, task history, development MCP discovery and preview setup links. No phone call placed.');
  } finally {
    try { await client.action(anyApi.auth.signOut, {}); } catch {}
    await browser.close();
  }
})().catch(() => { console.error('Preview browser verification failed; sensitive browser details suppressed.'); process.exitCode = 1; });
