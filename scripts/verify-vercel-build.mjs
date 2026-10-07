import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root = '.vercel/output';
const metadata = JSON.parse(await fs.readFile(`${root}/builds.json`, 'utf8'));
assert.equal(metadata.target, 'production');
assert.ok(metadata.builds.some(build => build.use === '@vercel/static-build'), 'Static build metadata must provision analytics routes');
assert.ok(metadata.features.webAnalyticsVersion);
for (const name of ['index.html', 'landing.html']) {
  const html = await fs.readFile(`${root}/static/${name}`, 'utf8');
  assert.equal((html.match(/src="\/analytics.js"/g) || []).length, 1);
}
assert.ok(!(await fs.readFile(`${root}/static/widget.html`, 'utf8')).includes('src="/analytics.js"'));
const scripts = [];
const window = {};
const document = {
  head: { querySelector: () => null, appendChild: script => scripts.push(script) },
  createElement: () => ({ dataset: {} }),
};
vm.runInNewContext(await fs.readFile(`${root}/static/analytics.js`, 'utf8'), { window, document, URL, console });
assert.equal(scripts.length, 1);
const scrub = window.vaq.find(([type]) => type === 'beforeSend')[1];
assert.equal(scrub({ type: 'pageview', url: 'https://askboomerang.vercel.app/status?task=private&code=secret#token' }).url,
  'https://askboomerang.vercel.app/status');
console.log('Verified analytics packaging, deployment metadata, widget exclusion and private URL stripping.');
