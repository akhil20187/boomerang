import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from './server.mjs';
import { ConvexError } from 'convex/values';

test('missing service quote reports unavailable calling without asking customers for internal cents',async()=>{
  let received;
  const message='Shop calling is unavailable because the service price has not been set. No calls started and no credit was charged.';
  const server=createMcpServer({token:'account-token',widgetHtml:'<html></html>',client:{mutation:async(_fn,args)=>{received=args;throw new ConvexError({code:'service_unavailable',reason:'pricing_not_configured',callingAvailable:false,message});}}});
  const client=new Client({name:'verification',version:'1.0.0'});
  const [a,b]=InMemoryTransport.createLinkedPair();
  await server.connect(a);await client.connect(b);
  try {
    const list=await client.listTools();
    assert.equal(list.tools.find(t=>t.name==='start_calls').inputSchema.required.includes('expectedAnswerPriceCents'),false);
    const result=await client.callTool({name:'start_calls',arguments:{draftId:'draft1',selectedPlaceIds:['shop1'],idempotencyKey:'approval1'}});
    assert.equal(result.isError,true);
    assert.equal(result.structuredContent.reason,'pricing_not_configured');
    assert.equal(result.content[0].text,message);
    assert.equal(Object.hasOwn(received,'expectedAnswerPriceCents'),false);
  }finally{await client.close();await server.close();}
});

test('assistant discovers tools, renders resource and reads saved task through MCP transport',async()=>{
  let received;
  const server=createMcpServer({token:'account-token',widgetHtml:'<html><body>Shops</body></html>',client:{query:async(_fn,args)=>{received=args;return {task:{status:'finished'},product:{name:'Printer'},shops:[]};}}});
  const client=new Client({name:'verification',version:'1.0.0'});
  const [a,b]=InMemoryTransport.createLinkedPair();
  await server.connect(a);await client.connect(b);
  try {
    const list=await client.listTools();assert.equal(list.tools.length,5);
    assert.equal(list.tools.find(t=>t.name==='start_calls').annotations.readOnlyHint,false);
    const resource=await client.readResource({uri:'ui://boomerang/shops-v3.html'});
    assert.match(resource.contents[0].text,/Shops/);
    const result=await client.callTool({name:'task_status',arguments:{taskId:'task1'}});
    assert.equal(result.structuredContent.task.status,'finished');
    assert.equal(received.accessToken,'account-token');
  }finally{await client.close();await server.close();}
});
