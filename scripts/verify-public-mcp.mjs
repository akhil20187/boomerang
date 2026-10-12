import assert from 'node:assert/strict';
import vm from 'node:vm';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {discoverOAuthServerInfo,selectResourceURL} from '@modelcontextprotocol/sdk/client/auth.js';

// Controlled verification only. This script never invokes start_calls or shop search.
const origin=process.env.MCP_PUBLIC_URL ?? 'https://www.askboomerang.online';
const endpoint=new URL('/mcp',origin);
const resourceResponse=await fetch(new URL('/.well-known/oauth-protected-resource/mcp',origin));
assert.equal(resourceResponse.status,200);
const resource=await resourceResponse.json();
assert.equal(resource.resource,endpoint.href);
assert.ok(resource.authorization_servers.length);
const issuer=resource.authorization_servers[0];
const metadata=await fetch(new URL('/.well-known/oauth-authorization-server',issuer));
assert.equal(metadata.status,200);
const oauth=await metadata.json();
assert.equal(oauth.issuer,issuer);
assert.ok(oauth.code_challenge_methods_supported.includes('S256'));
assert.ok(oauth.grant_types_supported.includes('refresh_token'));
const unauth=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
assert.equal(unauth.status,401);
assert.ok(unauth.headers.get('www-authenticate')?.includes(`${origin}/.well-known/oauth-protected-resource/mcp`));
const discovered=await discoverOAuthServerInfo(endpoint);
assert.equal(discovered.authorizationServerUrl,issuer);
assert.equal(discovered.resourceMetadata.resource,endpoint.href);
assert.equal((await selectResourceURL(endpoint,{},discovered.resourceMetadata)).href,endpoint.href);
console.log('Public OAuth discovery and authentication gate verified.');
if(!process.env.MCP_TEST_TOKEN){console.log('Authenticated protocol verification requires MCP_TEST_TOKEN. No shop calls made.');process.exit(0);}
const client=new Client({name:'Boomerang controlled verification',version:'1.0.0'});
try{
 await client.connect(new StreamableHTTPClientTransport(endpoint,{requestInit:{headers:{Authorization:`Bearer ${process.env.MCP_TEST_TOKEN}`}}}));
 const {tools}=await client.listTools();
 assert.deepEqual(tools.map(t=>t.name).sort(),['account_status','find_shops','get_recording','more_shops','prepare_brief','prepare_contacts','start_calls','task_status']);
 const {resources}=await client.listResources();
 assert.equal(resources.length,1);
 const widget=await client.readResource({uri:resources[0].uri});
 assert.ok(widget.contents[0].text.includes('__BOOMERANG_WIDGET__'));
 assert.ok(widget.contents[0].text.length>10000);
 const html=widget.contents[0].text;
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,2,'published widget must contain marker and one application script');
 assert.ok(!/<script\b[^>]*\bsrc=/.test(html),'published widget must be self-contained');
 for(const [, ,source] of scripts)new vm.Script(source);
 console.log('Public MCP tool discovery and self-contained widget verified.');
 if(process.env.MCP_TEST_TASK){
  const result=await client.callTool({name:'task_status',arguments:{taskId:process.env.MCP_TEST_TASK}});
  assert.ok(!result.isError);
  assert.ok(result.structuredContent?.task || result.content.some(c=>c.type==='text'&&c.text.includes(process.env.MCP_TEST_TASK)));
  console.log('Controlled saved task returned through public MCP.');
 }
}finally{await client.close();}
