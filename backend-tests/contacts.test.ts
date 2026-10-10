import {it, expect, vi, afterEach} from 'vitest';
import {convexTest} from 'convex-test';
import {makeFunctionReference} from 'convex/server';
import schema from '../convex/schema';
import {api, internal} from '../convex/_generated/api';
import {forceReady} from '../convex/intake';

const modules=import.meta.glob(['../convex/**/*.{ts,js}','!../convex/**/*.d.ts']);
vi.mock('../convex/workflows',()=>({workflow:{start:vi.fn(async()=> 'wf-test')}}));
const prepareContacts=makeFunctionReference<'mutation'>('contacts:prepare');
const supplied=[
  {name:'Sample Manufacturer',phone:'+91 (40) 2345 6789',source:'assistant',sourceUrl:'https://manufacturer.example/contact'},
  {name:'Sample Vendor',phone:'98765 43210',source:'customer'},
];
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
async function setup(){
  vi.stubEnv('OPENAI_API_KEY','test');vi.stubEnv('ANSWER_PRICE_CENTS','1000');
  vi.stubEnv('LIVE_CALLS_ENABLED','true');vi.stubEnv('CALL_BRIDGE_URL','https://bridge.example');vi.stubEnv('CALL_BRIDGE_SECRET','test');
  const t=convexTest(schema,modules);
  const userId=await t.run(async ctx=>{
    const id=await ctx.db.insert('users',{name:'Customer',email:'customer@example.com',eligible:true});
    await ctx.db.insert('creditAccounts',{userId:id,balanceCents:10000,reservedCents:0});return id;
  });
  const requests:any[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,options:any)=>{
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    requests.push(JSON.parse(options.body));
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(forceReady('Ask whether they manufacture 50 custom rash guards',[]))}}]}));
  }));
  const user=t.withIdentity({subject:userId});
  const intake=()=>user.action(api.briefs.prepare,{request:'Ask whether these manufacturers make 50 custom rash guards',contacts:supplied} as any);
  return {t,user,userId,requests,intake};
}

it('prepares supplied contacts with no Google fields, location requirement, hold or calls',async()=>{
  const {t,user,intake,requests,userId}=await setup();
  const brief=await intake();const draft=await user.mutation(prepareContacts,{briefId:brief.briefId});
  expect(draft.source).toBe('supplied');expect(draft.pincode).toBeUndefined();expect(draft.attribution).toBeUndefined();
  expect(draft.shops.map((s:any)=>s.phone)).toEqual(['+914023456789','+919876543210']);
  expect(draft.shops[0]).not.toHaveProperty('ratingCount');expect(draft.shops[0]).not.toHaveProperty('distanceKm');
  expect(draft.shops[0].sourceUrl).toBe(supplied[0].sourceUrl);expect(draft.answerPriceCents).toBe(1000);
  expect(requests).toHaveLength(1);expect(requests[0].messages[0].content).not.toContain('The area is always required');
  expect(requests[0].messages[0].content).toContain('delivery');
  expect(requests[0].messages[1].content).toContain('Sample Manufacturer');
  expect(await t.run(ctx=>ctx.db.query('tasks').collect())).toHaveLength(0);
  expect(await t.run(ctx=>ctx.db.query('creditReservations').collect())).toHaveLength(0);
  expect((await t.run(ctx=>ctx.db.query('creditAccounts').withIndex('by_user',q=>q.eq('userId',userId)).unique()))?.reservedCents).toBe(0);
  const reread=await user.query(api.drafts.get,{draftId:draft.draftId});
  expect(reread.source).toBe('supplied');expect(reread.attribution).toBeUndefined();
});

it('saves one task with two business jobs and uses the saved numbers and brief for dispatch',async()=>{
  const {t,user,intake}=await setup();const brief=await intake();const draft=await user.mutation(prepareContacts,{briefId:brief.briefId});
  const args={draftId:draft.draftId,selectedPlaceIds:draft.shops.map((s:any)=>s.placeId),idempotencyKey:'contacts-task-1',expectedAnswerPriceCents:1000};
  const out=await user.mutation(api.tasks.start,args);expect(await user.mutation(api.tasks.start,args)).toEqual(out);
  const task=await t.run(ctx=>ctx.db.get(out.taskId));expect(task?.source).toBe('supplied');expect(task?.pincode).toBeUndefined();
  const jobs=await t.run(ctx=>ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',out.taskId)).collect());
  expect(jobs).toHaveLength(2);
  const holds=await t.run(ctx=>ctx.db.query('creditReservations').withIndex('by_task',q=>q.eq('taskId',out.taskId)).collect());
  expect(holds).toHaveLength(2);expect(holds.reduce((n,h)=>n+h.amountCents,0)).toBe(2000);
  for(const job of jobs){const call=await t.mutation(internal.calls.prepare,{shopJobId:job._id});expect(call.to).toBe(job.shop.phone);expect(call.briefMode).toBe(true);expect(call.businessName).toBe(job.shop.name)}
  const view=await user.query(api.tasks.get,{taskId:out.taskId});expect(view.shops).toHaveLength(2);expect(view.task.source).toBe('supplied');
  await expect(user.mutation(api.tasks.start,{...args,selectedPlaceIds:[args.selectedPlaceIds[0]]})).rejects.toThrow('different shop selection');
});

it.each([
  ['missing name',[{...supplied[0],name:' '}]],
  ['missing phone',[{...supplied[0],phone:''}]],
  ['foreign number',[{...supplied[0],phone:'+12025550100'}]],
  ['short code',[{...supplied[0],phone:'112'}]],
  ['missing research source',[{...supplied[0],sourceUrl:undefined}]],
  ['unsafe URL',[{...supplied[0],sourceUrl:'javascript:alert(1)'}]],
  ['duplicate number',[supplied[0],{...supplied[0],phone:'+914023456789'}]],
  ['conflicting identity',[supplied[0],{...supplied[0],name:'Different business'}]],
  ['too many contacts',Array.from({length:21},()=>supplied[0])],
])('rejects %s before model work or any calls',async(_label,contacts)=>{
  const {t,user,requests}=await setup();
  await expect(user.action(api.briefs.prepare,{request:'Ask about manufacture',contacts} as any)).rejects.toThrow();
  expect(requests).toHaveLength(0);expect(await t.run(ctx=>ctx.db.query('tasks').collect())).toHaveLength(0);
});

it('rejects unauthenticated, foreign, expired or unfinished preparation and changing a saved brief',async()=>{
  const {t,user,intake}=await setup();const brief=await intake();
  await expect(t.mutation(prepareContacts,{briefId:brief.briefId})).rejects.toThrow();
  const otherId=await t.run(ctx=>ctx.db.insert('users',{name:'Other'}));
  await expect(t.withIdentity({subject:otherId}).mutation(prepareContacts,{briefId:brief.briefId})).rejects.toThrow('Brief not found');
  await expect(user.action(api.briefs.prepare,{briefId:brief.briefId,answer:'yes',contacts:supplied} as any)).rejects.toThrow('new brief');
  await t.run(ctx=>ctx.db.patch(brief.briefId,{status:'question'}));
  await expect(user.mutation(prepareContacts,{briefId:brief.briefId})).rejects.toThrow('Finish');
  await t.run(ctx=>ctx.db.patch(brief.briefId,{status:'ready',expiresAt:Date.now()-1}));
  await expect(user.mutation(prepareContacts,{briefId:brief.briefId})).rejects.toThrow('expired');
});

it('keeps price, credit, selected-recipient and brief ownership guards on direct tasks',async()=>{
  const {t,user,intake,userId}=await setup();const a=await intake();const draft=await user.mutation(prepareContacts,{briefId:a.briefId});const b=await intake();
  const args={draftId:draft.draftId,selectedPlaceIds:[draft.shops[0].placeId],idempotencyKey:'contacts-guards',expectedAnswerPriceCents:1000};
  await expect(user.mutation(api.tasks.start,{...args,expectedAnswerPriceCents:1})).rejects.toThrow('price changed');
  await expect(user.mutation(api.tasks.start,{...args,briefId:b.briefId})).rejects.toThrow('another search');
  await expect(user.mutation(api.tasks.start,{...args,selectedPlaceIds:['unapproved-number']})).rejects.toThrow();
  await t.run(async ctx=>{const account=await ctx.db.query('creditAccounts').withIndex('by_user',q=>q.eq('userId',userId)).unique();await ctx.db.patch(account!._id,{balanceCents:0})});
  await expect(user.mutation(api.tasks.start,args)).rejects.toThrow();
  expect(await t.run(ctx=>ctx.db.query('tasks').collect())).toHaveLength(0);
});

it('cannot attach a supplied-contact brief to a different Google search or substitute recipients',async()=>{
  const {t,user,intake,userId,requests}=await setup();const brief=await intake();
  const draftId=await t.run(ctx=>ctx.db.insert('drafts',{userId,productInput:'Rash guards',product:{name:'Rash guards'},pincode:'500037',radiusKm:10,cards:[],comments:'',shops:[{placeId:'google-other',name:'Unapproved shop',phone:'+919999999999',address:'Hyderabad',ratingCount:10,distanceKm:1,mapsUrl:'https://maps.example',fewRatings:true}],expiresAt:Date.now()+60000}));
  await expect(user.mutation(api.tasks.start,{draftId,briefId:brief.briefId,selectedPlaceIds:['google-other'],idempotencyKey:'cross-source-guard',expectedAnswerPriceCents:1000})).rejects.toThrow('specific business contacts');
  await expect(user.action(api.discovery.search,{briefId:brief.briefId,pincode:'500037'})).rejects.toThrow('prepare_contacts');
  expect(requests).toHaveLength(1);expect(await t.run(ctx=>ctx.db.query('tasks').collect())).toHaveLength(0);
});

it('runs the real public MCP intake → contacts → approved task flow without Google',async()=>{
  const {t,user}=await setup();vi.stubEnv('CONVEX_SITE_URL','https://app.convex.site');vi.stubEnv('SITE_URL','https://app.convex.site');
  const token=await user.mutation(api.users.createAccessToken,{name:'Supplied contacts integration'});
  const rpc=async(name:string,args:object)=>{
    const response=await t.fetch('/mcp',{method:'POST',headers:{Authorization:`Bearer ${token.token}`},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
    const body=await response.json();expect(body.error).toBeUndefined();expect(body.result.isError).not.toBe(true);return body.result.structuredContent;
  };
  const brief=await rpc('prepare_brief',{request:'Ask if these businesses manufacture 50 custom rash guards',contacts:supplied});
  expect(brief.status).toBe('ready');
  const draft=await rpc('prepare_contacts',{briefId:brief.briefId});
  const repeated=await rpc('prepare_contacts',{briefId:brief.briefId});expect(repeated.draftId).toBe(draft.draftId);
  const out=await rpc('start_calls',{draftId:draft.draftId,selectedPlaceIds:draft.shops.map((s:any)=>s.placeId),expectedAnswerPriceCents:draft.answerPriceCents,idempotencyKey:'mcp-contacts-integration'});
  const status=await rpc('task_status',{taskId:out.taskId});
  expect(status.task.source).toBe('supplied');expect(status.shops.map((s:any)=>s.name)).toEqual(supplied.map(s=>s.name));
  expect(status.task.maxCents).toBe(2000);expect(status.task.heldCents).toBe(2000);
});

it('reuses the exact supplied draft even after twenty later searches',async()=>{
  const {t,user,intake,userId}=await setup();const brief=await intake();
  const first=await user.mutation(prepareContacts,{briefId:brief.briefId});
  await t.run(async ctx=>{for(let i=0;i<20;i++)await ctx.db.insert('drafts',{userId,productInput:'Other search',product:{name:'Other search'},pincode:'500037',radiusKm:10,cards:[],comments:'',shops:[],expiresAt:Date.now()+60000})});
  const repeat=await user.mutation(prepareContacts,{briefId:brief.briefId});expect(repeat.draftId).toBe(first.draftId);
  expect(repeat.shops).toEqual(first.shops);
});

it('keeps retries in the same business job and settles the main task only when both businesses finish',async()=>{
  const {t,user,intake,userId}=await setup();const brief=await intake();const draft=await user.mutation(prepareContacts,{briefId:brief.briefId});
  const {taskId}=await user.mutation(api.tasks.start,{draftId:draft.draftId,selectedPlaceIds:draft.shops.map((s:any)=>s.placeId),idempotencyKey:'contacts-settlement',expectedAnswerPriceCents:1000});
  const jobs=await t.run(ctx=>ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',taskId)).collect());
  const first=await t.mutation(internal.calls.prepare,{shopJobId:jobs[0]._id});
  const completion={eventId:'business-one-complete',attemptId:first.attemptId,taskId,shopJobId:jobs[0]._id,status:'completed',answer:{stock:'unconfirmed',notes:'They manufacture custom rash guards. Minimum order is 50.',items:(first.items??[]).slice(0,1).map((i:any)=>({id:i.id,status:'answered',answer:'Minimum order is 50',quote:'Minimum order is 50.'}))}};
  expect(first.items?.length).toBeGreaterThan(0);
  await t.mutation(internal.calls.receive,completion);expect((await t.mutation(internal.calls.receive,completion)).duplicate).toBe(true);
  expect((await t.run(ctx=>ctx.db.get(taskId)))?.status).not.toBe('finished');
  const second=await t.mutation(internal.calls.prepare,{shopJobId:jobs[1]._id});
  await t.mutation(internal.calls.receive,{eventId:'business-two-unanswered',attemptId:second.attemptId,taskId,shopJobId:jobs[1]._id,status:'unanswered'});
  expect((await t.run(ctx=>ctx.db.get(jobs[1]._id)))?.state).toBe('retry_scheduled');
  expect(await t.mutation(internal.calls.prepare,{shopJobId:jobs[1]._id})).toBeNull();
  await t.run(ctx=>ctx.db.patch(jobs[1]._id,{retryAt:Date.now()-1}));
  const retry=await t.mutation(internal.calls.prepare,{shopJobId:jobs[1]._id});expect(retry.to).toBe(second.to);expect(retry.shopJobId).toBe(second.shopJobId);
  await t.mutation(internal.calls.receive,{eventId:'business-two-refused',attemptId:retry.attemptId,taskId,shopJobId:jobs[1]._id,status:'refused'});
  const {task}=await user.query(api.tasks.get,{taskId});expect(task.status).toBe('finished');expect(task.chargedCents).toBe(1000);expect(task.releasedCents).toBe(1000);
  const account=await t.run(ctx=>ctx.db.query('creditAccounts').withIndex('by_user',q=>q.eq('userId',userId)).unique());expect(account?.reservedCents).toBe(0);expect(account?.balanceCents).toBe(9000);
  expect(await t.run(ctx=>ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',taskId)).collect())).toHaveLength(2);
});
