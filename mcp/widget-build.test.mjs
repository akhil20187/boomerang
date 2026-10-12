import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

test('published widget contains exactly the marker and one valid self-contained application script',async()=>{
  execFileSync('npm',['run','build'],{env:{...process.env,VITE_APP_PUBLIC_URL:'https://www.askboomerang.online',VITE_MCP_PUBLIC_URL:'https://www.askboomerang.online',MCP_PUBLIC_URL:'https://old-mcp.example'}});
  const html=await fs.readFile('web/dist/widget.html','utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,2,'bundle replacement must not expand dollar patterns into HTML');
  assert.ok(!/<script\b[^>]*\bsrc=/.test(html),'widget must not depend on relative external scripts');
  for(const [, ,source] of scripts)assert.doesNotThrow(()=>new vm.Script(source),'the inline application must parse');
  const skill=await fs.readFile('web/dist/SKILL.md','utf8');
  assert.ok(skill.includes('- Remote MCP connection (HTTP): https://www.askboomerang.online/mcp'));
  assert.ok(!skill.includes('https://little-kangaroo-718.convex.site'));
  assert.ok(!skill.includes('https://old-mcp.example'));
});
