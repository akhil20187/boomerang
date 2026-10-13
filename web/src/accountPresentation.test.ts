import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileInitial,callerFirstName,firstNameNote,memberSinceMonth,memberSinceDate,historyRow,historyWhen,totalsBoxes,HISTORY_FILTERS} from './accountPresentation.ts';

test('profile initial comes from the name, else the email', () => {
 assert.equal(profileInitial('akhil gupta','a@x.co'),'A');
 assert.equal(profileInitial('  ','zoe@example.com'),'Z');
 assert.equal(profileInitial(undefined,undefined),'?');
});

test('first-name note matches what calls say (first word, else "our customer")', () => {
 assert.equal(callerFirstName('Akhil Gupta'),'Akhil');
 assert.equal(callerFirstName(''),'our customer');
 assert.equal(callerFirstName(undefined),'our customer');
 assert.equal(firstNameNote('Akhil Gupta'),'Shops hear only your first name: “calling for Akhil”.');
 assert.equal(firstNameNote(undefined),'Until you add one, shops hear “calling for our customer”.');
});

test('member since is shown in India time', () => {
 const lateUtc=Date.parse('2026-09-30T20:00:00Z'); // 1 Oct 2026, 1:30 am IST
 assert.equal(memberSinceMonth(lateUtc),'Oct 2026');
 assert.equal(memberSinceDate(lateUtc),'1 Oct 2026');
});

test('history rows: title, kind · task · when, amount never coloured', () => {
 const now=Date.now();const when=historyWhen(now);
 assert.match(when,/^today \d/);
 assert.deepEqual(historyRow({type:'charge',amountCents:-1000,_creationTime:now,shopName:'Sri Sai Plumbing Works',productName:'Plumber in Gachibowli'}),{title:'Sri Sai Plumbing Works',sub:`Charge · Plumber in Gachibowli · ${when}`,amount:'−₹10'});
 assert.deepEqual(historyRow({type:'refund',amountCents:1000,_creationTime:now,shopName:'AquaCare',productName:'Plumber in Gachibowli'}),{title:'AquaCare',sub:`Refund · Plumber in Gachibowli · ${when}`,amount:'+₹10'});
 assert.deepEqual(historyRow({type:'release',amountCents:1000,_creationTime:now,shopName:'AquaCare',note:'shop prefers a personal call'}),{title:'AquaCare',sub:`Not charged · shop prefers a personal call · ${when}`,amount:'₹0'});
 assert.deepEqual(historyRow({type:'grant',amountCents:10000,_creationTime:now,welcome:true}),{title:'Welcome credit',sub:`Credit · ${when}`,amount:'+₹100'});
 assert.equal(historyRow({type:'grant',amountCents:5000,_creationTime:now}).title,'Credit added');
 assert.match(historyWhen(now-86400000*1.2).split(' ')[0],/^(yesterday|\d+)$/);
});

test('totals boxes and filter empty states', () => {
 assert.deepEqual(totalsBoxes({creditsCents:10000,chargesCents:3000,refundsCents:1000}).map(b=>`${b.label} ${b.value}`),['Credits ₹100','Charges ₹30','Refunds ₹10']);
 assert.deepEqual(totalsBoxes(undefined).map(b=>b.value),['…','…','…']);
 assert.deepEqual(HISTORY_FILTERS.map(f=>f.label),['All','Charges','Refunds','Credits']);
 assert.equal(HISTORY_FILTERS.find(f=>f.id==='refund')!.empty,'No refunds yet.');
});
