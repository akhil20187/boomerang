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
