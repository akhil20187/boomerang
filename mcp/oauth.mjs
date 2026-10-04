import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const random=()=>crypto.randomBytes(32).toString('base64url');
class OAuthError extends Error{constructor(error,status=400){super(error);this.status=status;}}

/** A small OAuth authorization-code adapter. Customer identity remains verified by Convex. */
export function createOAuth({issuer,resource,connectUrl,allowedRedirectUris=[],storePath=path.resolve('mcp/.state/oauth.json'),mintAccessToken,tokenLifetimeSeconds=3600,now=Date.now}={}){
 issuer=new URL(issuer).origin;resource=resource||issuer+'/mcp';
 const websiteOrigin=new URL(connectUrl).origin;
 if(new URL(issuer).protocol!=='https:'&&!['localhost','127.0.0.1'].includes(new URL(issuer).hostname))throw Error('OAuth issuer requires HTTPS');
 if(typeof mintAccessToken!=='function')throw Error('Customer token minting must be configured');
 if(!Number.isInteger(tokenLifetimeSeconds)||tokenLifetimeSeconds<60||tokenLifetimeSeconds>86400)throw Error('OAuth token lifetime must be 60–86400 seconds');
 const allowed=new Set(allowedRedirectUris);
 const state=storePath&&fs.existsSync(storePath)?JSON.parse(fs.readFileSync(storePath,'utf8')):{clients:{},requests:{},codes:{},tokens:{}};
 state.refreshTokens??={};
 function save(){if(!storePath)return;fs.mkdirSync(path.dirname(storePath),{recursive:true,mode:0o700});fs.writeFileSync(storePath+'.tmp',JSON.stringify(state),{mode:0o600});fs.renameSync(storePath+'.tmp',storePath);}
 const metadata={issuer,authorization_endpoint:issuer+'/oauth/authorize',token_endpoint:issuer+'/oauth/token',registration_endpoint:issuer+'/oauth/register',revocation_endpoint:issuer+'/oauth/revoke',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:['shops:read','calls:write'],authorization_response_iss_parameter_supported:true};
 function reply(res,status,data){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','pragma':'no-cache'});res.end(JSON.stringify(data));}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>16000)throw new OAuthError('invalid_request',413);}try{return req.headers['content-type']?.includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));}catch{throw new OAuthError('invalid_request');}}
 const isResource=value=>value===resource;
 function clientFor(id){const client=Object.hasOwn(state.clients,id)?state.clients[id]:null;if(!client)throw new OAuthError('invalid_client');return client;}
 function validScopes(value='shops:read calls:write'){if(typeof value!=='string')throw new OAuthError('invalid_scope');const scopes=[...new Set(value.split(' ').filter(Boolean))];if(!scopes.length||scopes.some(s=>!metadata.scopes_supported.includes(s)))throw new OAuthError('invalid_scope');return scopes.join(' ');}
 function redirect(request,params){const url=new URL(request.redirectUri);for(const [k,v]of Object.entries({...params,state:request.state,iss:issuer}))if(v!==undefined)url.searchParams.set(k,v);return url.href;}
 function resolveToken(token,options={}){const requiredScope=typeof options==='string'?options:options.requiredScope;if(typeof token!=='string')return null;const record=state.tokens[hash(token)];if(!record||record.expiresAt<=now()||record.resource!==resource||!record.scope||requiredScope&&!record.scope.split(' ').includes(requiredScope))return null;return record.accountToken;}
 function revokeFamily(familyId){for(const [key,token]of Object.entries(state.tokens))if(token.familyId===familyId)delete state.tokens[key];for(const token of Object.values(state.refreshTokens))if(token.familyId===familyId)token.revokedAt=now();}
 function issueToken(record){
  for(const [key,t]of Object.entries(state.tokens))if(t.expiresAt<=now())delete state.tokens[key];
  for(const [key,t]of Object.entries(state.refreshTokens))if(t.expiresAt<=now())delete state.refreshTokens[key];
  if(Object.keys(state.tokens).length>=10000||Object.keys(state.refreshTokens).length>=50000)throw new OAuthError('token_limit',429);
  if(record.accountExpiresAt<=now())throw new OAuthError('invalid_grant');
  const token=random(),refresh=random(),familyId=record.familyId||random();const expiresAt=Math.min(now()+tokenLifetimeSeconds*1000,record.accountExpiresAt);
  const identity={clientId:record.clientId,accountToken:record.accountToken,accountExpiresAt:record.accountExpiresAt,resource:record.resource,scope:record.scope,familyId};
  state.tokens[hash(token)]={...identity,expiresAt};state.refreshTokens[hash(refresh)]={...identity,expiresAt:record.accountExpiresAt};
  return {access_token:token,refresh_token:refresh,token_type:'Bearer',expires_in:Math.max(0,Math.floor((expiresAt-now())/1000)),scope:record.scope};
 }
 async function handle(req,res){
  const url=new URL(req.url,issuer),route=url.pathname;
  if(!['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-authorization-server','/oauth/register','/oauth/authorize','/oauth/request','/oauth/approve','/oauth/token','/oauth/revoke'].includes(route))return false;
  const origin=req.headers.origin;
  if(origin===websiteOrigin){res.setHeader('access-control-allow-origin',websiteOrigin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-methods','GET, POST, OPTIONS');res.setHeader('access-control-allow-headers','Authorization, Content-Type');}
  if(req.method==='OPTIONS'){res.writeHead(origin===websiteOrigin?204:403);res.end();return true;}
  if(origin&&origin!==websiteOrigin&&['/oauth/approve','/oauth/request'].includes(route)){reply(res,403,{error:'invalid_origin'});return true;}
  try{
   if(route.startsWith('/.well-known/')){if(req.method!=='GET')throw new OAuthError('invalid_request',405);reply(res,200,route.endsWith('oauth-authorization-server')?metadata:{resource,authorization_servers:[issuer],scopes_supported:metadata.scopes_supported,bearer_methods_supported:['header']});return true;}
   if(route==='/oauth/register'){
    if(req.method!=='POST')throw new OAuthError('invalid_request',405);const data=await body(req);
    if(!Array.isArray(data.redirect_uris)||data.redirect_uris.length<1||data.redirect_uris.length>5||data.redirect_uris.some(uri=>typeof uri!=='string'||!allowed.has(uri)))throw new OAuthError('invalid_redirect_uri');
    if(data.token_endpoint_auth_method&&data.token_endpoint_auth_method!=='none'||data.grant_types&&(!Array.isArray(data.grant_types)||data.grant_types.some(g=>!['authorization_code','refresh_token'].includes(g))))throw new OAuthError('invalid_client_metadata');
    if(Object.keys(state.clients).length>=5000)throw new OAuthError('registration_limit',429);
    const id=random(),client={client_id:id,client_name:typeof data.client_name==='string'?data.client_name.slice(0,80):'Your AI assistant',redirect_uris:data.redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],client_id_issued_at:Math.floor(now()/1000)};state.clients[id]=client;save();reply(res,201,client);return true;
   }
   if(route==='/oauth/authorize'){
    if(req.method!=='GET')throw new OAuthError('invalid_request',405);const q=Object.fromEntries(url.searchParams),client=clientFor(q.client_id);
    if(q.response_type!=='code'||!client.redirect_uris.includes(q.redirect_uri)||!allowed.has(q.redirect_uri)||q.code_challenge_method!=='S256'||!/^[-_a-zA-Z0-9]{43}$/.test(q.code_challenge||'')||!isResource(q.resource))throw new OAuthError('invalid_request');
    if(q.state&&q.state.length>2000)throw new OAuthError('invalid_request');
    for(const [id,r]of Object.entries(state.requests))if(r.expiresAt<=now())delete state.requests[id];
    if(Object.keys(state.requests).length>=5000)throw new OAuthError('request_limit',429);
    const id=random();state.requests[id]={clientId:q.client_id,clientName:client.client_name,redirectUri:q.redirect_uri,state:q.state,challenge:q.code_challenge,resource:q.resource,scope:validScopes(q.scope),expiresAt:now()+600000,status:'pending'};save();const next=new URL(connectUrl);next.searchParams.set('oauth_request',id);res.writeHead(302,{location:next.href,'cache-control':'no-store'});res.end();return true;
   }
   if(route==='/oauth/request'){
    if(req.method!=='GET')throw new OAuthError('invalid_request',405);const request=state.requests[url.searchParams.get('id')];if(!request||request.expiresAt<=now()||request.status!=='pending')throw new OAuthError('invalid_request',404);reply(res,200,{clientName:request.clientName,scope:request.scope,resource:request.resource});return true;
   }
   if(route==='/oauth/approve'){
    if(req.method!=='POST')throw new OAuthError('invalid_request',405);const jwt=/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1];if(!jwt)throw new OAuthError('unauthorized',401);const data=await body(req),request=state.requests[data.requestId];if(!request||request.expiresAt<=now()||request.status!=='pending')throw new OAuthError('invalid_request');
    if(data.approved!==true){request.status='denied';save();reply(res,200,{redirectUrl:redirect(request,{error:'access_denied'})});return true;}
    request.status='approving';save();let account;
    try{account=await mintAccessToken(jwt,request.clientName);if(!account?.token||!Number.isFinite(account.expiresAt)||account.expiresAt<=now())throw Error();}catch{request.status='pending';save();throw new OAuthError('unauthorized',401);}
    for(const [key,c]of Object.entries(state.codes))if(c.expiresAt<=now())delete state.codes[key];
    if(Object.keys(state.codes).length>=5000){request.status='pending';save();throw new OAuthError('request_limit',429);}
    const code=random();state.codes[hash(code)]={...request,accountToken:account.token,accountExpiresAt:account.expiresAt,expiresAt:now()+120000};request.status='approved';save();reply(res,200,{redirectUrl:redirect(request,{code})});return true;
   }
   if(route==='/oauth/token'){
    if(req.method!=='POST')throw new OAuthError('invalid_request',405);const data=await body(req);clientFor(data.client_id);
    if(data.grant_type==='refresh_token'){
     const record=state.refreshTokens[hash(String(data.refresh_token||''))];
     if(!record||record.clientId!==data.client_id||!isResource(data.resource)||record.resource!==data.resource||record.expiresAt<=now()||record.revokedAt!==undefined)throw new OAuthError('invalid_grant');
     if(record.usedAt!==undefined){revokeFamily(record.familyId);save();throw new OAuthError('invalid_grant');}
     const scope=data.scope===undefined?record.scope:validScopes(data.scope);if(scope.split(' ').some(s=>!record.scope.split(' ').includes(s)))throw new OAuthError('invalid_scope');
     const tokens=issueToken({...record,scope});record.usedAt=now();save();reply(res,200,tokens);return true;
    }
    if(data.grant_type!=='authorization_code')throw new OAuthError('unsupported_grant_type');const key=hash(String(data.code||'')),code=state.codes[key];
    if(!code||code.expiresAt<=now()||code.clientId!==data.client_id||code.redirectUri!==data.redirect_uri||!isResource(data.resource)||typeof data.code_verifier!=='string'||!/^[-._~a-zA-Z0-9]{43,128}$/.test(data.code_verifier)||crypto.createHash('sha256').update(data.code_verifier).digest('base64url')!==code.challenge)throw new OAuthError('invalid_grant');
    const tokens=issueToken(code);delete state.codes[key];save();reply(res,200,tokens);return true;
   }
   if(route==='/oauth/revoke'){
    if(req.method!=='POST')throw new OAuthError('invalid_request',405);const data=await body(req);clientFor(data.client_id);const key=hash(String(data.token||'')),token=state.tokens[key]||state.refreshTokens[key];if(token?.clientId===data.client_id){if(token.familyId)revokeFamily(token.familyId);else delete state.tokens[key];save();}reply(res,200,{});return true;
   }
  }catch(error){if(!res.writableEnded)reply(res,error instanceof OAuthError?error.status:500,{error:error instanceof OAuthError?error.message:'server_error'});}
  return true;
 }
 return {handle,resolveToken,metadata,resource};
}
