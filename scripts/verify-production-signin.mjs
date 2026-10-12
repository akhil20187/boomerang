import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Resend simulator only: never calls a shop or sends mail to a real person.
const origin='https://coordinated-barracuda-687.convex.site';
const endpoint=process.env.PRODUCTION_MCP_ENDPOINT || origin+'/mcp';
const client=new ConvexHttpClient('https://coordinated-barracuda-687.convex.cloud');
const email=process.env.BOOMERANG_SIMULATOR_EMAIL || 'delivered@resend.dev';
assert.match(email,/^delivered(?:\+[a-zA-Z0-9-]+)?@resend\.dev$/,'Only the delivery simulator is allowed');
const code=process.env.BOOMERANG_TEST_CODE;
assert.ok(code || process.env.BOOMERANG_TEST_JWT,'A simulator code or isolated-browser token is required');
const result=process.env.BOOMERANG_TEST_JWT ? {tokens:{token:process.env.BOOMERANG_TEST_JWT}} :
 await client.action(anyApi.auth.signIn,{provider:'resend',params:{email,code}});
assert.ok(result.tokens?.token,'Simulator link must create a session');
client.setAuth(result.tokens.token);
const account=await client.query(anyApi.users.me,{});
assert.equal(account.email,email);
assert.equal(account.eligible,true);
assert.equal(account.currency,'INR');
assert.ok(account.balanceCents>=10000,'Verified signup must retain welcome credit');
await client.query(anyApi.tasks.history,{paginationOpts:{cursor:null,numItems:10}});
// Exercise an actual dynamic-registration + PKCE approval and token exchange.
const redirectUri='http://127.0.0.1:18765/callback';
const registration=await fetch(origin+'/oauth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'Production migration verification',redirect_uris:[redirectUri]})});
assert.equal(registration.status,201);
const registered=await registration.json();
const verifier=randomBytes(40).toString('base64url');
const challenge=createHash('sha256').update(verifier).digest('base64url');
const authorization=new URL('/oauth/authorize',origin);
authorization.search=new URLSearchParams({client_id:registered.client_id,redirect_uri:redirectUri,response_type:'code',resource:endpoint,code_challenge:challenge,code_challenge_method:'S256',state:'controlled-production-test'}).toString();
const authorize=await fetch(authorization,{redirect:'manual'});
assert.equal(authorize.status,302);
const connect=new URL(authorize.headers.get('location'));
assert.equal(connect.origin,'https://www.askboomerang.online');
const approval=await fetch(origin+'/oauth/approve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${result.tokens.token}`},body:JSON.stringify({requestId:connect.searchParams.get('oauth_request'),approved:true})});
assert.equal(approval.status,200);
const approved=await approval.json();
const callback=new URL(approved.redirectUrl);
assert.equal(callback.searchParams.get('iss'),origin);
const exchange=await fetch(origin+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:callback.searchParams.get('code'),client_id:registered.client_id,redirect_uri:redirectUri,code_verifier:verifier,resource:endpoint})});
assert.equal(exchange.status,200);
const token=await exchange.json();
const mcp=new Client({name:'Production migration verification',version:'1.0.0'});
try{
 await mcp.connect(new StreamableHTTPClientTransport(new URL(endpoint),{requestInit:{headers:{Authorization:`Bearer ${token.access_token}`}}}));
 const {tools}=await mcp.listTools();
 assert.ok(tools.some(t=>t.name==='prepare_brief'));
 const status=await mcp.callTool({name:'account_status',arguments:{}});
 assert.ok(!status.isError);
 const resources=await mcp.listResources();
 assert.equal(resources.resources.length,1);
 const widget=await mcp.readResource({uri:resources.resources[0].uri});
 assert.ok(widget.contents[0].text.includes('__BOOMERANG_WIDGET__'));
 const refresh=await fetch(origin+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:token.refresh_token,client_id:registered.client_id,resource:endpoint})});
 assert.equal(refresh.status,200);
 const rotated=await refresh.json();
 assert.notEqual(rotated.refresh_token,token.refresh_token);
 await fetch(origin+'/oauth/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:rotated.refresh_token,client_id:registered.client_id})});
 console.log(JSON.stringify({signInRedeemed:true,accountApproved:true,welcomeCreditVerified:true,taskHistoryReadable:true,oauthRegistration:true,pkceExchange:true,mcpTools:tools.length,widgetReadable:true,refreshRotation:true,noPhoneCalls:true}));
}finally{await mcp.close();await client.action(anyApi.auth.signOut,{});}
