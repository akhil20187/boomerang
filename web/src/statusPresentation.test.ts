import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shopStatus,taskPageStatus,stepKind,stepMark,summaryTags,displayShop,callLogDetail,sidebarGroups,sidebarTask} from './statusPresentation.ts';
const shop={placeId:'p',name:'Croma'};
test('call card status line follows the shop state, one colour per meaning',()=>{
 assert.deepEqual(shopStatus({...shop,state:'calling'}),['AI agent calling','blue']);
 assert.deepEqual(shopStatus({...shop,state:'retry_scheduled'}),['No answer · retry scheduled','amber']);
 assert.deepEqual(shopStatus({...shop,state:'personal_call_needed'}),['Prefers a personal call','amber']);
 assert.deepEqual(shopStatus({...shop,state:'unreachable'}),['Couldn’t reach · 2 attempts','amber']);
 assert.deepEqual(shopStatus({...shop,state:'technical_error'}),['Call interrupted · try again','error']);
 assert.deepEqual(shopStatus({...shop,state:'reconciling'}),['Call status unconfirmed · checking provider','amber']);
 assert.deepEqual(shopStatus({...shop,state:'answered',answer:{stock:'available',finalPrice:77900}}),['In stock · ₹77,900','green']);
 assert.deepEqual(shopStatus({...shop,state:'answered',answer:{stock:'unavailable'}}),['No stock','grey']);
 assert.deepEqual(shopStatus({...shop,state:'answered',answer:{stock:'unconfirmed'}}),['Answered · stock unconfirmed','grey']);
 assert.deepEqual(shopStatus({...shop}),['Waiting to call','grey']);
});
test('brief answers decide the status line for answered shops',()=>{
 const items=[{id:'a',text:'Visit today?',kind:'must_confirm' as const,status:'answered' as const},{id:'b',text:'Cost?',kind:'deciding' as const,status:'not_answered' as const}];
 assert.deepEqual(shopStatus({...shop,state:'answered',answer:{stock:'unconfirmed',items}}),['Answered 1 of 2 questions · rest open','amber']);
 assert.deepEqual(taskPageStatus({...shop,state:'answered',answer:{stock:'unconfirmed',items}}),['Answered 1 of 2 questions · rest open','amber']);
});
test('task page keeps its own wording',()=>{
 assert.deepEqual(taskPageStatus({...shop,state:'unreachable'}),['Couldn’t reach the shop','amber']);
 assert.deepEqual(taskPageStatus({...shop,state:'technical_error'}),['Call interrupted','error']);
 assert.deepEqual(taskPageStatus({...shop,state:'answered'}),['Some details unconfirmed','amber']);
});
test('timeline marks: live, fail, warn, wait, ok',()=>{
 assert.equal(stepKind('AI called on your behalf',true),'live');
 assert.equal(stepKind('No answer · retry scheduled',false),'fail');
 assert.equal(stepKind('Shop asked to speak to a person',false),'warn');
 assert.equal(stepKind('Call requested',false),'wait');
 assert.equal(stepKind('Shop answered · notes saved',false),'ok');
 assert.deepEqual(Object.values(stepMark),['✓','•','!','…','×']);
});
test('summary tags count each state once',()=>{
 assert.deepEqual(summaryTags([{...shop,state:'calling'},{...shop,state:'calling'},{...shop,state:'answered',answer:{stock:'available'}},{...shop}]),[['1 in stock','green'],['2 calling','blue'],['1 waiting','grey']]);
});
test('opened-call shop formats times and variant words, and is safe to apply twice',()=>{
 const once=displayShop({...shop,timeline:[{text:'Call requested',time:'4:05 pm'}],answer:{stock:'available',variantMatch:'no'}});
 assert.equal(once.answer?.variantMatch,'Different variant');
 assert.deepEqual(displayShop(once),once);
 assert.equal(typeof displayShop({...shop,timeline:[{text:'x',time:Date.UTC(2026,9,12,10,30)}]}).timeline?.[0].time,'string');
});
test('call-log row maps to the opened-call view, including an earlier retried try',()=>{
 const row={attemptId:'att1',taskId:'task1',businessName:'Sri Sai Plumbing',area:'Gachibowli',phone:'+91 90000 00000',address:'Plot 12',source:'supplied' as const,contactSource:'assistant' as const,state:'retry_scheduled',startedAt:1000,durationSeconds:0,recordingAvailable:false,answer:null,timeline:[{text:'No answer · retry scheduled',time:1000}],chargeNote:{kind:'not_charged' as const,amountCents:1000,reason:'shop didn’t answer'}};
 const detail=callLogDetail(row);
 assert.equal(detail.taskId,'task1');assert.equal(detail.supplied,true);
 assert.equal(detail.shop.name,'Sri Sai Plumbing');assert.equal(detail.shop.source,'assistant');
 assert.equal(detail.shop.latestAttemptId,'att1');assert.equal(detail.shop.calledAt,1000);
 assert.equal(detail.shop.answer,undefined);assert.equal(detail.shop.recordingAvailable,false);
 assert.deepEqual(shopStatus(detail.shop),['No answer · retry scheduled','amber']);
 assert.deepEqual(callLogDetail({...row,source:'google'}).supplied,false);
});
const day=Date.now();const old=Date.UTC(2025,0,5);
const summary={shopCount:3,resolvedCount:3,availableCount:0,unreachableCount:0,chargedCents:0,active:false};
const t=(id:string,extra:object)=>({_id:id,title:id,_creationTime:day,status:'finished',summary,...extra});
test('sidebar groups tasks into Live now, Today, Needs you and Earlier',()=>{
 const groups=sidebarGroups([t('live',{status:'running',summary:{...summary,active:true,resolvedCount:1}}),t('today',{summary:{...summary,availableCount:1}}),t('needs',{summary:{...summary,unreachableCount:3}}),t('old',{_creationTime:old,approvedAt:old})]);
 assert.deepEqual(groups.map(g=>[g.heading,g.tasks.map(x=>x.id)]),[['Live now',['live']],['Today',['today']],['Needs you',['needs']],['Earlier',['old']]]);
 assert.equal(groups[0].tasks[0].live,true);assert.deepEqual(groups[0].tasks[0].status,['1 of 3 shops checked','blue']);
 assert.deepEqual(groups[1].tasks[0].status,['1 shop has it','green']);
 assert.equal(groups[1].tasks[0].href,'/status?task=today');
 assert.deepEqual(sidebarGroups([]),[]);
});
test('sidebar rows: product label first, test calls link to the test page',()=>{
 const row=sidebarTask(t('x',{product:{name:'Samsung M47 | Big battery'},selfTest:true}));
 assert.equal(row.label,'Samsung M47');assert.equal(row.href,'/app?test=x');assert.deepEqual(row.status,['Test call finished','grey']);
 assert.equal(sidebarGroups([t('err',{status:'error',summary:{...summary,availableCount:1}})])[0].heading,'Needs you');
});
