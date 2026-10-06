import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { z } from 'zod';
import { bearerToken, createTools } from './core.mjs';
import { createOAuth } from './oauth.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiUri = 'ui://boomerang/shops-v3.html';
export function createMcpServer({client, token, widgetHtml, connectDomains=[]}) {
  const server = new McpServer({name:'boomerang',version:'1.0.0'});
  const tools = createTools(client,token);
  registerAppResource(server,'shop-card',uiUri,{},async()=>({contents:[{
    uri:uiUri,mimeType:RESOURCE_MIME_TYPE,text:widgetHtml,
    _meta:{ui:{csp:{connectDomains,resourceDomains:connectDomains}},'openai/widgetDescription':'Choose nearby shops, follow calls and see each shop’s answer.'}
  }]}));
  const definitions = [
    ['find_shops','Find nearby shops that may sell a product. A listing does not confirm stock.',z.object({productInput:z.string().min(2).max(2000),pincode:z.string().regex(/^\d{6}$/),radiusKm:z.number().optional(),cards:z.array(z.string()).optional(),comments:z.string().optional()}),true],
    ['more_shops','Read the saved shop search. Preserve the customer’s selected shops.',z.object({draftId:z.string()}),true],
    ['start_calls','Start calls only after shop selection and approval of the service price and maximum reservation. If search returns answerPriceCents null, calling is unavailable: explain that the service price has not been set. Do not ask customers for product prices or internal cents. Otherwise display the returned unit price and selected-shop maximum, obtain approval, and copy the exact returned quote.',z.object({draftId:z.string(),selectedPlaceIds:z.array(z.string()).min(1),idempotencyKey:z.string().min(1),expectedAnswerPriceCents:z.number().int().positive().optional().describe('Copy answerPriceCents from the approved shop search when configured. Never infer a price or ask the customer for this internal value. This is the service-call price, unrelated to the product price.')}),false],
    ['task_status','Read live task progress and per-shop answers. Unknown fields stay unconfirmed.',z.object({taskId:z.string()}),true],
    ['get_recording','Get a private, short-lived playback link for this account’s call recording.',z.object({attemptId:z.string()}),true],
  ];
  for(const [name,description,inputSchema,readOnly] of definitions) {
    registerAppTool(server,name,{description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:false,openWorldHint:!readOnly},_meta:{ui:{resourceUri:uiUri}}},async args=>{
      try {
        const result=await tools[name](args);
        return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};
      } catch(error) {
        const data=error instanceof ConvexError?error.data:undefined;
        if(data && typeof data==='object' && data.code==='service_unavailable' && data.reason==='pricing_not_configured') {
          const message='Shop calling is unavailable because the service price has not been set. No calls started and no credit was charged.';
          return {isError:true,content:[{type:'text',text:message}],structuredContent:{code:'service_unavailable',reason:'pricing_not_configured',callingAvailable:false,message}};
        }
        return {isError:true,content:[{type:'text',text:error.message}],...(!token?{_meta:{'mcp/www_authenticate':['Bearer error="invalid_token"']}}:{})};
      }
    });
  }
  return server;
}

export function createHttpServer({convexUrl,widgetHtml,publicUrl='http://127.0.0.1:3212',websiteUrl='http://127.0.0.1:5173',oauthStorePath,allowedRedirectUris=['https://chatgpt.com/connector_platform_oauth_redirect','https://claude.ai/api/mcp/auth_callback'],clientFactory=url=>new ConvexHttpClient(url)}) {
  const oauth=createOAuth({issuer:publicUrl,connectUrl:new URL('/connect',websiteUrl).href,allowedRedirectUris,storePath:oauthStorePath,mintAccessToken:async(jwt,name)=>{
    const client=clientFactory(convexUrl);client.setAuth(jwt);
    return client.mutation(makeFunctionReference('users:createAccessToken'),{name});
  }});
  return http.createServer(async(req,res)=>{
    if(await oauth.handle(req,res))return;
    const url=new URL(req.url,publicUrl);
    if(url.pathname==='/health') {res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ready:true,service:'boomerang',authentication:'account bearer token'}));}
    if(url.pathname!=='/mcp') {res.writeHead(404);return res.end('Not found');}
    if(req.method!=='POST') {res.writeHead(405,{Allow:'POST'});return res.end();}
    const presented=bearerToken(req.headers.authorization);
    const token=presented?.startsWith('hmcp_')?presented:oauth.resolveToken(presented);
    if(!token){res.writeHead(401,{'WWW-Authenticate':`Bearer resource_metadata="${publicUrl}/.well-known/oauth-protected-resource", error="invalid_token"`,'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Link your account and provide its access token.'}));}
    try {
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>256000){res.writeHead(413);return res.end();}}
      const body=JSON.parse(raw);
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
      const authorizedToken=presented.startsWith('hmcp_')?token:name=>oauth.resolveToken(presented,{requiredScope:name==='start_calls'?'calls:write':'shops:read'});
      const server=createMcpServer({client:clientFactory(convexUrl),token:authorizedToken,widgetHtml,connectDomains:[new URL(convexUrl).origin,new URL(websiteUrl).origin,publicUrl]});
      res.on('close',()=>{transport.close();server.close();});
      await server.connect(transport);
      await transport.handleRequest(req,res,body);
    } catch(error) {if(!res.headersSent)res.writeHead(400,{'Content-Type':'application/json'});if(!res.writableEnded)res.end(JSON.stringify({error:'Unable to process the MCP request.'}));}
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const convexUrl=process.env.CONVEX_URL;
  if(!convexUrl)throw new Error('CONVEX_URL must point to the deployed backend.');
  const widgetHtml=await fs.readFile(path.join(root,'web/dist/widget.html'),'utf8');
  const port=Number(process.env.MCP_PORT || 3212);
  createHttpServer({convexUrl,widgetHtml,publicUrl:process.env.MCP_PUBLIC_URL || `http://127.0.0.1:${port}`,websiteUrl:process.env.SITE_URL || 'http://127.0.0.1:5173',allowedRedirectUris:process.env.MCP_OAUTH_REDIRECT_URIS?.split(',').map(x=>x.trim()).filter(Boolean)}).listen(port,process.env.MCP_BIND_HOST || '127.0.0.1',()=>console.log(`Boomerang ready on port ${port}`));
}
