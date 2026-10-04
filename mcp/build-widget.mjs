import fs from 'node:fs/promises';
import path from 'node:path';
const directory=path.resolve('web/dist');
let html=await fs.readFile(path.join(directory,'index.html'),'utf8');
for(const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const filename=path.join(directory,match[1].replace(/^\//,''));
  const script=await fs.readFile(filename,'utf8');
  html=html.replace(match[0],`<script type="module">${script.replace(/<\/script/gi,'<\\/script')}</script>`);
}
for(const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css=await fs.readFile(path.join(directory,match[1].replace(/^\//,'')),'utf8');
  html=html.replace(match[0],`<style>${css}</style>`);
}
html=html.replace('<head>','<head><script>window.__HUMAN_MCP_WIDGET__=true;</script>');
await fs.writeFile(path.join(directory,'widget.html'),html);
console.log('Built self-contained MCP widget.');

// Publish the already-approved setup design without changing its layout.
const setupSource=await fs.readFile(path.resolve('design/pages/connect-human-mcp.html'),'utf8');
const styleEnd=setupSource.indexOf('</style>')+'</style>'.length;
if(styleEnd<'</style>'.length)throw new Error('Setup page style boundary is missing.');
const publicSite=process.env.MCP_PUBLIC_URL || process.env.CONVEX_SITE_URL || 'https://little-kangaroo-718.convex.site';
const setup=setupSource
 .replace('https://[YOUR-APP].convex.site/mcp',new URL('/mcp',publicSite).href)
 .replace('Sign up on our website first.','<a href="/account">Sign in on our website</a> first.')
 .replace('Leave the sign-in settings as Claude shows them, then select <strong>Add</strong>.','Keep sign-in enabled. Under <strong>OAuth client</strong>, choose <strong>Register automatically</strong>, then select <strong>Add</strong>.')
 .replace('https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp','https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp')
 .replace('A product link works too, from Amazon, Flipkart or any shop.','Paste an Amazon product link, or describe the product, model and colour. If we cannot read a link, use a description.');
const previewNotice='<p style="margin:0;padding:14px 20px;font:14px/1.5 system-ui,sans-serif;color:#1a1a19;background:#fff;text-align:center">Preview: shop search is available. Calling and chat connections are not available yet. <a href="/">Search shops</a> · <a href="/demo">Try the demo</a></p>';
const setupHtml=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1">${setup.slice(0,styleEnd)}</head><body>${previewNotice}${setup.slice(styleEnd)}</body></html>`;
await fs.writeFile(path.join(directory,'setup.html'),setupHtml);
await fs.copyFile(path.resolve('design/pages/phone-lavender.webp'),path.join(directory,'phone-lavender.webp'));
console.log('Built approved setup guide; connection availability notice retained.');
