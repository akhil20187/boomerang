import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from './server.mjs';

test('assistant discovers tools, renders resource and reads saved task through MCP transport',async()=>{
  let received;
  const server=createMcpServer({token:'account-token',widgetHtml:'<html><body>Shops</body></html>',client:{query:async(_fn,args)=>{received=args;return {task:{status:'finished'},product:{name:'Printer'},shops:[]};}}});
  const client=new Client({name:'verification',version:'1.0.0'});
  const [a,b]=InMemoryTransport.createLinkedPair();
  await server.connect(a);await client.connect(b);
  try {
    const list=await client.listTools();assert.equal(list.tools.length,5);
    assert.equal(list.tools.find(t=>t.name==='start_calls').annotations.readOnlyHint,false);
    const resource=await client.readResource({uri:'ui://human-mcp/shops-v1.html'});
    assert.match(resource.contents[0].text,/Shops/);
    const result=await client.callTool({name:'task_status',arguments:{taskId:'task1'}});
    assert.equal(result.structuredContent.task.status,'finished');
    assert.equal(received.accessToken,'account-token');
  }finally{await client.close();await server.close();}
});
