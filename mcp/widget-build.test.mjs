import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

test('published widget contains exactly the marker and one valid self-contained application script',async()=>{
  execFileSync('npm',['run','build']);
  const html=await fs.readFile('web/dist/widget.html','utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,2,'bundle replacement must not expand dollar patterns into HTML');
  assert.ok(!/<script\b[^>]*\bsrc=/.test(html),'widget must not depend on relative external scripts');
  for(const [, ,source] of scripts)assert.doesNotThrow(()=>new vm.Script(source),'the inline application must parse');
});
