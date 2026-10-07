import {mutation,query} from './_generated/server';
import {internal} from './_generated/api';
import {ConvexError,v} from 'convex/values';
import {requireUser} from './access';

const limit=5;
function mobileNumber(value:string){
 const compact=value.replace(/[\s()-]/g,'');
 const local=/^[6-9]\d{9}$/.test(compact)?compact:/^\+?91[6-9]\d{9}$/.test(compact)?compact.replace(/^\+?91/,''):null;
 if(!local)throw new ConvexError('Enter a valid Indian mobile number, such as +91 followed by 10 digits.');
 return '+91'+local;
}
export const status=query({
 args:{},returns:v.any(),handler:async ctx=>{
  const userId=await requireUser(ctx);
  const tasks=await ctx.db.query('tasks').withIndex('by_user_self_test',q=>q.eq('userId',userId).eq('selfTest',true)).order('desc').take(limit);
  const calls=await Promise.all(tasks.map(async task=>{
   const job=await ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',task._id)).first();
   return {taskId:task._id,createdAt:task._creationTime,status:task.status,state:job?.state??'waiting',phone:job?.shop.phone??'',active:!['finished','error'].includes(task.status)};
  }));
  return {limit,used:tasks.length,remaining:Math.max(0,limit-tasks.length),calls,callingAvailable:process.env.LIVE_CALLS_ENABLED==='true'&&!!process.env.CALL_BRIDGE_URL&&!!process.env.CALL_BRIDGE_SECRET};
 }
});
export const start=mutation({
 args:{phone:v.string(),ownNumberConfirmed:v.boolean(),idempotencyKey:v.string()},returns:v.object({taskId:v.id('tasks')}),
 handler:async(ctx,args)=>{
  const userId=await requireUser(ctx);
  if(!args.ownNumberConfirmed)throw new ConvexError('Confirm that this is your own mobile number.');
  if(args.phone.length>40)throw new ConvexError('Enter a valid Indian mobile number.');
  const phone=mobileNumber(args.phone);
  if(args.idempotencyKey.length<8||args.idempotencyKey.length>150)throw new ConvexError('Refresh this page before trying again.');
  const operation='self-test:'+args.idempotencyKey;
  const previous=await ctx.db.query('tasks').withIndex('by_user_operation',q=>q.eq('userId',userId).eq('idempotencyKey',operation)).unique();
  if(previous){
   const job=await ctx.db.query('shopJobs').withIndex('by_task',q=>q.eq('taskId',previous._id)).first();
   if(!previous.selfTest||job?.shop.phone!==phone)throw new ConvexError('This request belongs to a different test call.');
   return {taskId:previous._id};
  }
  const trials=await ctx.db.query('tasks').withIndex('by_user_self_test',q=>q.eq('userId',userId).eq('selfTest',true)).take(limit);
  if(trials.length>=limit)throw new ConvexError('You have used all five free test calls. You can still call real shops using your account credit.');
  if(trials.some(t=>!['finished','error'].includes(t.status)))throw new ConvexError('A test call is already in progress. Wait for it to finish.');
  if(process.env.LIVE_CALLS_ENABLED!=='true'||!process.env.CALL_BRIDGE_URL||!process.env.CALL_BRIDGE_SECRET)throw new ConvexError('Test calls are temporarily unavailable. Your allowance has not changed.');
  const product={name:'Test call · iPhone 17',description:'iPhone 17, 256 GB, lavender colour'};
  const shop={placeId:'personal-test',name:'Boomerang test shop',address:'Your own mobile number',phone,ratingCount:0,distanceKm:0,mapsUrl:'',fewRatings:true};
  const comments='Personal rehearsal: the recipient plays the shopkeeper. Ask whether the exact phone is in stock, its final price including taxes, and card offers. Enquiry only; do not buy, book or reserve anything.';
  const draftId=await ctx.db.insert('drafts',{userId,productInput:product.description,product,pincode:'000000',cards:[],comments,radiusKm:0,shops:[shop],expiresAt:Date.now()+86400000});
  const taskId=await ctx.db.insert('tasks',{userId,draftId,title:product.name,type:'shop_calls',selfTest:true,detailsVersion:1,product,pincode:'000000',cards:[],comments,status:'running',approvedAt:Date.now(),startedAt:Date.now(),idempotencyKey:operation,answerPriceCents:0});
  const shopJobId=await ctx.db.insert('shopJobs',{taskId,shop,state:'waiting',attemptCount:0,executor:'AI',billingState:'released'});
  await ctx.db.insert('taskEvents',{taskId,shopJobId,eventId:taskId+':test-requested',type:'test_requested',text:'Personal test call requested · no credit charged',timestamp:Date.now()});
  await ctx.scheduler.runAfter(0,internal.calls.dispatch,{shopJobId});
  return {taskId};
 }
});
