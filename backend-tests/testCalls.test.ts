import {it,expect,vi,afterEach} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../convex/schema';
import {api,internal} from '../convex/_generated/api';
const modules=import.meta.glob(['../convex/**/*.{ts,js}','!../convex/**/*.d.ts']);
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});
async function setup(){
 vi.stubEnv('LIVE_CALLS_ENABLED','true');vi.stubEnv('CALL_BRIDGE_URL','https://bridge.example');vi.stubEnv('CALL_BRIDGE_SECRET','secret');
 const t=convexTest(schema,modules);const id=await t.run(ctx=>ctx.db.insert('users',{email:'trial@example.com',name:'Trial User',eligible:true}));return {t,user:t.withIdentity({subject:id}),id};
}
const input={phone:'9876543210',ownNumberConfirmed:true,idempotencyKey:'trial-operation-1'};
it('requires sign-in and explicit own-number confirmation; validates India mobile numbers',async()=>{
 const {t,user}=await setup();await expect(t.mutation(api.testCalls.start,input)).rejects.toThrow('Sign in');
 await expect(user.mutation(api.testCalls.start,{...input,ownNumberConfirmed:false})).rejects.toThrow('your own');
 for(const phone of ['123','+12025550123','0801234567'])await expect(user.mutation(api.testCalls.start,{...input,phone})).rejects.toThrow('Indian mobile');
 expect((await user.query(api.testCalls.status,{})).remaining).toBe(5);
});
it('creates one private free test, normalizes phone and reuses duplicate requests',async()=>{
 const {t,user,id}=await setup();const first=await user.mutation(api.testCalls.start,input);expect(await user.mutation(api.testCalls.start,input)).toEqual(first);
 await expect(user.mutation(api.testCalls.start,{...input,phone:'9876543211'})).rejects.toThrow('different');
 const status=await user.query(api.testCalls.status,{});expect(status.remaining).toBe(4);expect(status.calls).toHaveLength(1);expect(status.calls[0].phone).toBe('+919876543210');
 const task=await t.run(ctx=>ctx.db.get(first.taskId));expect(task?.selfTest).toBe(true);
 expect(await t.run(ctx=>ctx.db.query('creditReservations').collect())).toHaveLength(0);
 const other=await t.run(ctx=>ctx.db.insert('users',{email:'other@example.com'}));expect((await t.withIdentity({subject:other}).query(api.testCalls.status,{})).calls).toHaveLength(0);
 await expect(t.withIdentity({subject:other}).query(api.tasks.get,{taskId:first.taskId})).rejects.toThrow('Task not found');
 expect(id).toBeTruthy();
});
it('allows five lifetime attempts only and phone changes do not reset them',async()=>{
 const {t,user}=await setup();for(let i=0;i<5;i++){
  const {taskId}=await user.mutation(api.testCalls.start,{...input,phone:'987654321'+i,idempotencyKey:'trial-operation-'+i});
  await t.run(ctx=>ctx.db.patch(taskId,{status:'finished'}));
 }
 expect((await user.query(api.testCalls.status,{})).remaining).toBe(0);
 await expect(user.mutation(api.testCalls.start,{...input,idempotencyKey:'sixth-request'})).rejects.toThrow('five');
});
it('blocks concurrent tests and disabled calling does not consume allowance',async()=>{
 const {user}=await setup();vi.stubEnv('LIVE_CALLS_ENABLED','false');await expect(user.mutation(api.testCalls.start,input)).rejects.toThrow('unavailable');expect((await user.query(api.testCalls.status,{})).remaining).toBe(5);
 vi.stubEnv('LIVE_CALLS_ENABLED','true');await user.mutation(api.testCalls.start,input);await expect(user.mutation(api.testCalls.start,{...input,idempotencyKey:'another-request'})).rejects.toThrow('in progress');
});
it('missed test calls end after one attempt, charge nothing and send no shop emails',async()=>{
 const {t,user}=await setup();const {taskId}=await user.mutation(api.testCalls.start,input);const job=await t.run(ctx=>ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',taskId)).first());
 const prepared=await t.mutation(internal.calls.prepare,{shopJobId:job!._id});
 await t.mutation(internal.calls.receive,{eventId:'test-completed',taskId,shopJobId:job!._id,attemptId:prepared.attemptId,status:'completed',transportStatus:'no-answer',endReason:'VOICEMAIL',transcript:[]});
 const done=await t.run(ctx=>ctx.db.get(job!._id));expect(done?.state).toBe('unreachable');expect(done?.retryAt).toBeUndefined();expect((await t.run(ctx=>ctx.db.get(taskId)))?.status).toBe('finished');
 expect(await t.mutation(internal.notifications.claim,{taskId,type:'completed'})).toBeNull();expect(await t.run(ctx=>ctx.db.query('creditEntries').collect())).toHaveLength(0);
});
it('dispatches the chosen number once and saves private answers without a charge',async()=>{
 const {t,user}=await setup();const {taskId}=await user.mutation(api.testCalls.start,input);const job=await t.run(ctx=>ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',taskId)).first());
 const send=vi.fn(async(_url,options)=>{const body=JSON.parse(options.body);expect(body.to).toBe('+919876543210');expect(body.businessName).toBe('Boomerang test shop');expect(body.productDescription).toContain('256 GB');return new Response('{}',{status:202});});vi.stubGlobal('fetch',send);
 await Promise.all([t.action(internal.calls.dispatch,{shopJobId:job!._id}),t.action(internal.calls.dispatch,{shopJobId:job!._id})]);expect(send).toHaveBeenCalledTimes(1);
 const saved=await t.run(ctx=>ctx.db.get(job!._id));await t.mutation(internal.calls.receive,{eventId:'answered-test',attemptId:saved!.latestAttemptId!,taskId,shopJobId:job!._id,status:'completed',transportStatus:'completed',transcript:[{speaker:'caller',text:'Yes, in stock'}],answer:{stock:'available',variantMatch:'confirmed',notes:'Yes, in stock'}});
 const data=await user.query(api.tasks.get,{taskId});expect(data.shops[0].attempts[0].transcript[0].text).toBe('Yes, in stock');expect(data.task.chargedCents).toBe(0);expect(data.task.selfTest).toBe(true);
 const task=await t.run(ctx=>ctx.db.get(taskId));await expect(user.mutation(api.tasks.start,{draftId:task!.draftId,selectedPlaceIds:['personal-test'],idempotencyKey:'bypass-trial',expectedAnswerPriceCents:10})).rejects.toThrow('test-call form');
});
