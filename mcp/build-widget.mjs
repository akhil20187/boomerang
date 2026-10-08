import fs from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve('web/dist');
let html=await fs.readFile(path.join(directory,'index.html'),'utf8');
for(const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const filename=path.join(directory,match[1].replace(/^\//,''));
  const script=await fs.readFile(filename,'utf8');
  // A callback inserts literal code. Replacement strings interpret $&, $` and $'.
  html=html.replace(match[0],()=>`<script type="module">${script.replace(/<\/script/gi,'<\\/script')}</script>`);
}
for(const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css=await fs.readFile(path.join(directory,match[1].replace(/^\//,'')),'utf8');
  html=html.replace(match[0],()=>`<style>${css}</style>`);
}
html=html.replace('<head>','<head><script>window.__BOOMERANG_WIDGET__=true;</script>');
await fs.writeFile(path.join(directory,'widget.html'),html);
console.log('Built self-contained MCP widget.');

// Publish the already-approved setup design without changing its layout.
const setupSource=await fs.readFile(path.resolve('design/pages/connect-boomerang.html'),'utf8');
const styleEnd=setupSource.indexOf('</style>')+'</style>'.length;
if(styleEnd<'</style>'.length)throw new Error('Setup page style boundary is missing.');
const publicSite=process.env.VITE_MCP_PUBLIC_URL || process.env.MCP_PUBLIC_URL || process.env.CONVEX_SITE_URL || 'https://askboomerang.vercel.app';
const website=process.env.VITE_APP_PUBLIC_URL || publicSite;
const setup=setupSource
 .replace('https://[YOUR-APP].convex.site/mcp',new URL('/mcp',publicSite).href)
 .replace('Sign up on our website first.','<a href="/account">Sign in on our website</a> first.')
 .replace('Not live yet. This address works once the app launches.','The connection server is live for testing. Shop calling remains disabled; ChatGPT and Claude card rendering still needs a final check.')
 .replace("Until launch, the address isn't live, so this is expected.",'The connection server is live for testing. If it fails, sign in on our website and check the address again.')
 .replace('Leave the sign-in settings as Claude shows them, then select <strong>Add</strong>.','Keep sign-in enabled. Under <strong>OAuth client</strong>, choose <strong>Register automatically</strong>, then select <strong>Add</strong>.')
 .replace('https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp','https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp')
 .replace('A product link works too, from Amazon, Flipkart or any shop.','Paste an Amazon product link, or describe the product, model and colour. If we cannot read a link, use a description.');
const previewNotice='<p style="margin:0;padding:14px 20px;font:14px/1.5 system-ui,sans-serif;color:#1a1a19;background:#fff;text-align:center">Preview: shop search and the connection server are available for testing. Shop calling remains disabled. <a href="/app">Search shops</a> · <a href="/demo">Try the demo</a></p>';
// Keep the logo above the preview notice so the notice never covers it.
const brandFirst=(body,notice)=>{const start=body.indexOf('<a class="site-brand"');if(start<0)return notice+body;const end=body.indexOf('</a>',start)+4;return body.slice(0,end)+notice+body.slice(end)};
const setupHtml=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">${setup.slice(0,styleEnd)}</head><body>${brandFirst(setup.slice(styleEnd),previewNotice)}</body></html>`;
await fs.writeFile(path.join(directory,'setup.html'),setupHtml);
await fs.copyFile(path.resolve('design/pages/phone-lavender.webp'),path.join(directory,'phone-lavender.webp'));
console.log('Built approved setup guide; connection availability notice retained.');

// Publish the approved landing story as the home page (served at "/" by convex/http.ts).
const landingSource=await fs.readFile(path.resolve('design/pages/landing-story.html'),'utf8');
const landingStyleEnd=landingSource.indexOf('</style>')+'</style>'.length;
if(landingStyleEnd<'</style>'.length)throw new Error('Landing page style boundary is missing.');
const landing=landingSource
 .replace('<title>Boomerang Landing Story</title>','<title>Boomerang · We call shops for you</title>')
 .replaceAll('https://little-kangaroo-718.convex.site/account','/account')
 .replaceAll('https://little-kangaroo-718.convex.site/mcp',new URL('/mcp',publicSite).href)
 .replaceAll('https://little-kangaroo-718.convex.site/SKILL.md',new URL('/SKILL.md',website).href)
 .replaceAll('https://<wbr>little-kangaroo-718.convex.site<wbr>/SKILL.md',new URL('/SKILL.md',website).href);
const skill=await fs.readFile(path.resolve('web/public/SKILL.md'),'utf8');
const publishedSkill=skill.replace(/https:\/\/(?:little-kangaroo-718\.convex\.site|askboomerang\.vercel\.app)(\/[^\s"`]*)?/g,(_match,route='')=>new URL(route||'/',route==='/mcp'?publicSite:website).href);
await fs.writeFile(path.join(directory,'SKILL.md'),publishedSkill);
await fs.copyFile(path.join(directory,'SKILL.md'),path.join(directory,'boomerang-skill.md'));
const icons='<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">';
// A complete page (doctype + head) is published as-is with the icons added; a fragment is wrapped.
if(/^\s*<!doctype html>/i.test(landing))await fs.writeFile(path.join(directory,'landing.html'),landing.replace('</head>',icons+'</head>'));
else await fs.writeFile(path.join(directory,'landing.html'),`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">${landing.slice(0,landingStyleEnd)}</head><body>${landing.slice(landingStyleEnd)}</body></html>`);
// The landing page's recreated sample calls (AI voices). Stored under /sample-audio/;
// convex/http.ts serves them at /audio/ as audio/mpeg with byte ranges (needed by Safari).
await fs.rm(path.join(directory,'audio'),{recursive:true,force:true});
await fs.mkdir(path.join(directory,'sample-audio'),{recursive:true});
for(const file of await fs.readdir(path.resolve('design/pages/variants/audio')))
  if(/\.mp3$/.test(file))await fs.copyFile(path.resolve('design/pages/variants/audio',file),path.join(directory,'sample-audio',file));
console.log('Built landing page.');
