import {test} from 'node:test';
import assert from 'node:assert/strict';
import {realRows,rowBusiness,rowResult,rowCharge,chargedPaise,needsYou,filterRows,lengthText,groupByDay,totals,csvCell,callLogCsv,whenText,type LogRow} from './callLogPresentation.ts';
import {connectAddresses,connectionLines,answersLine,CONNECT_STEPS} from './accountPresentation.ts';

const now=Date.now();const day=86400000;
const base:LogRow={attemptId:'a1',taskId:'t1',businessName:'Sri Sai Plumbing',taskLabel:'Plumber near 500032',phone:'+91 00000 00001',attemptNumber:1,isLatestAttempt:true,state:'answered',startedAt:now,durationSeconds:102,answer:{stock:'available',finalPrice:500},chargeNote:{kind:'charged',amountCents:1000}};
const row=(extra:Partial<LogRow>):LogRow=>({...base,...extra});
const rows=[
 row({attemptId:'charged'}),
 row({attemptId:'retried',isLatestAttempt:false,state:'retry_scheduled',attemptStatus:'unanswered',answer:null,chargeNote:{kind:'not_charged',amountCents:1000,reason:'shop didn’t answer'}}),
 row({attemptId:'personal',state:'personal_call_needed',answer:null,chargeNote:{kind:'not_charged',amountCents:1000,reason:'shop prefers a personal call'}}),
 row({attemptId:'unreachable',state:'unreachable',answer:null,attemptNumber:2,chargeNote:{kind:'not_charged',amountCents:1000,reason:'shop didn’t answer'}}),
 row({attemptId:'partial',state:'answered',answer:{stock:'unconfirmed',items:[{id:'q1',text:'Today?',kind:'must_confirm',status:'answered',answer:'Yes'},{id:'q2',text:'Price?',kind:'deciding',status:'not_answered'}]}}),
 row({attemptId:'held',state:'calling',answer:null,chargeNote:{kind:'held',amountCents:1000}}),
 row({attemptId:'refunded',chargeNote:{kind:'refunded',amountCents:1000}}),
 row({attemptId:'test',selfTest:true,businessName:'+91 98765 43210',chargeNote:{kind:'free',amountCents:0}}),
];
const ids=(list:LogRow[])=>list.map(r=>r.attemptId);

test('simulated verification calls never appear in the call log',()=>{
 assert.deepEqual(ids(realRows([row({attemptId:'v',verification:true}),row({attemptId:'real'})])),['real']);
});
test('earlier unanswered try reads "No answer · tried again"; latest try uses the shop status line',()=>{
 assert.deepEqual(rowResult(rows[1]),['No answer · tried again','amber']);
 assert.deepEqual(rowResult(rows[0]),['In stock · ₹500','green']);
 assert.deepEqual(rowResult(rows[2]),['Prefers a personal call','amber']);
 assert.deepEqual(rowResult(rows[4]),['Answered 1 of 2 questions · rest open','amber']);
});
test('test calls to yourself read "Test call to you" and are free; charge lines never say green words',()=>{
 assert.equal(rowBusiness(rows[7]),'Test call to you');assert.equal(rowCharge(rows[7]),'Free');assert.equal(chargedPaise(rows[7]),0);
 assert.equal(rowCharge(rows[0]),'Charged ₹10');assert.equal(rowCharge(rows[1]),'Not charged · shop didn’t answer');assert.equal(rowCharge(rows[6]),'Refunded ₹10');assert.equal(rowCharge(rows[5]),'₹10 on hold');
 assert.equal(rowCharge(row({chargeNote:null})),'Not charged');
});
test('filters: charged, not charged (excludes held), needs you (personal call, couldn’t reach, partial)',()=>{
 assert.deepEqual(ids(filterRows(rows,'all')),ids(rows));
 assert.deepEqual(ids(filterRows(rows,'charged')),['charged','partial']);
 assert.deepEqual(ids(filterRows(rows,'not_charged')),['retried','personal','unreachable','refunded','test']);
 assert.deepEqual(ids(filterRows(rows,'needs_you')),['personal','unreachable','partial']);
 assert.equal(needsYou(row({selfTest:true,state:'unreachable'})),false);
});
test('length reads m:ss and unknown is a dash',()=>{
 assert.equal(lengthText(102),'1:42');assert.equal(lengthText(5),'0:05');assert.equal(lengthText(undefined),'—');
});
test('phone view groups rows by day in order',()=>{
 const groups=groupByDay([row({attemptId:'x',startedAt:now}),row({attemptId:'y',startedAt:now-1000}),row({attemptId:'z',startedAt:now-3*day})]);
 assert.deepEqual(groups.map(g=>[g.day,ids(g.rows)]).slice(0,1),[['Today',['x','y']]]);
 assert.equal(groups.length,2);assert.deepEqual(ids(groups[1].rows),['z']);
 assert.match(whenText(now),/^Today /);assert.equal(whenText(undefined),'—');
});
test('totals strip uses rupees and the month summary',()=>{
 const t=totals({calls:14,tries:18,answered:8,chargedPaise:8000,refundedPaise:0,notChargedCount:6,availablePaise:8000});
 assert.deepEqual(t.map(x=>[x.label,x.value,x.note]),[['Calls this month','14','18 tries'],['Answered','8','of 14 calls'],['Charged','₹80','6 not charged'],['Credit left','₹80','']]);
});
test('CSV: header, rupee amounts, quotes escaped, formulas neutralised, no recording links',()=>{
 assert.equal(csvCell('a "b"'),'"a ""b"""');assert.equal(csvCell('Sri Sai, Plumbing\nWorks'),'"Sri Sai, Plumbing\nWorks"');
 for(const [input,out] of [['=HYPERLINK("x")','"\'=HYPERLINK(""x"")"'],['+SUM(A1)','"\'+SUM(A1)"'],['-2+3','"\'-2+3"'],['@cmd','"\'@cmd"'],['\tTab','"\'\tTab"'],['\rCR','"\'\rCR"'],['+91 00000 00001','"\'+91 00000 00001"']])assert.equal(csvCell(input),out,input);
 assert.equal(csvCell('Sri Sai Plumbing'),'"Sri Sai Plumbing"');assert.equal(csvCell(10),'"10"');assert.equal(csvCell(-5),'"-5"');
 const csv=callLogCsv([rows[0],rows[7]]);const lines=csv.trim().split('\r\n');
 assert.equal(lines[0],'"When","Business","Task","Phone","Try","Caller","Result","Length","Charge","Charged (₹)"');
 assert.match(lines[1],/"Sri Sai Plumbing","Plumber near 500032","'\+91 00000 00001","Try 1","AI agent","In stock · ₹500","1:42","Charged ₹10","10"$/);
 assert.match(lines[2],/"Test call to you".*"Free","0"$/);
 assert.doesNotMatch(csv,/recording|https?:/i);
});
test('connect addresses come from the configured public URLs, falling back to this site',()=>{
 assert.deepEqual(connectAddresses({mcpUrl:'https://www.askboomerang.online/',appUrl:'https://app.example.convex.site',origin:'http://127.0.0.1:5173'}),{mcp:'https://www.askboomerang.online/mcp',skill:'https://app.example.convex.site/SKILL.md'});
 assert.deepEqual(connectAddresses({origin:'http://127.0.0.1:5173'}),{mcp:'http://127.0.0.1:5173/mcp',skill:'http://127.0.0.1:5173/SKILL.md'});
 assert.deepEqual(connectAddresses({mcpUrl:'not a url',origin:'https://x.test'}).mcp,'https://x.test/mcp');
});
test('connection lines and answers line',()=>{
 assert.deepEqual(connectionLines(undefined),['Checking…']);
 assert.deepEqual(connectionLines({connected:false,clients:[]}),['Not connected yet']);
 const [line]=connectionLines({connected:true,clients:[{name:'ChatGPT',lastUsedAt:now}]});assert.match(line,/^Connected · ChatGPT · last refreshed today /);
 assert.equal(connectionLines({connected:true,clients:[{}]})[0],'Connected · AI assistant');
 assert.equal(answersLine(8000,1000),'About 8 answers · ₹10 per shop that answers');assert.equal(answersLine(1500,1000),'About 1 answer · ₹10 per shop that answers');assert.equal(answersLine(8000,null),'');
 assert.equal(CONNECT_STEPS.chatgpt.length,3);assert.equal(CONNECT_STEPS.claude.length,3);
});
