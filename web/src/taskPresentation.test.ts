import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskOutcome,taskLabel,formatPaise,priceSummary,notChargedReason,chargeText,taskChargeText,creditRowText} from './taskPresentation.ts';
const summary={shopCount:3,resolvedCount:3,availableCount:0,unreachableCount:0,chargedCents:0,active:false};
test('history distinguishes no answer from confirmed stock and keeps progress independent',()=>{
 assert.deepEqual(taskOutcome({...summary,unreachableCount:3}),['Couldn’t reach the shops','amber']);
 assert.deepEqual(taskOutcome({...summary,unconfirmedCount:1}),['Some details unconfirmed','amber']);
 assert.deepEqual(taskOutcome({...summary,active:true,resolvedCount:1,availableCount:1}),['1 of 3 shops checked','blue']);
 assert.deepEqual(taskOutcome({...summary,availableCount:1}),['1 shop has it','green']);
});
test('history shortens marketing titles while retaining the exact named variant',()=>{
 assert.equal(taskLabel('Samsung M47 (Blaze Blue, 6GB, 128GB) | Large battery | Camera'),'Samsung M47 (Blaze Blue, 6GB, 128GB)');
 assert.equal(taskLabel('HP black cartridge 805'),'HP black cartridge 805');
});
test('formats paise as rupees with Indian grouping',()=>{
 assert.equal(formatPaise(1000),'₹10');assert.equal(formatPaise(1050),'₹10.50');
 assert.equal(formatPaise(1000000),'₹10,000');assert.equal(formatPaise(0),'₹0');
});
test('price summary caps by available credit and hides an unknown balance',()=>{
 assert.deepEqual(priceSummary({priceCents:1000,selected:3,availableCents:2000}),{maxText:'Up to ₹30',perText:'₹10 per shop that answers',balanceText:'You have ₹20',affordable:2,short:true});
 assert.equal(priceSummary({priceCents:1000,selected:3}).balanceText,undefined);
 assert.equal(priceSummary({priceCents:1000,selected:3}).short,false);
 assert.equal(priceSummary({priceCents:1000,selected:2,availableCents:2000}).short,false);
});
test('not-charged reasons follow the final shop state',()=>{
 assert.equal(notChargedReason('unreachable'),'shop didn’t answer');
 assert.equal(notChargedReason('personal_call_needed'),'shop prefers a personal call');
 assert.equal(notChargedReason('technical_error'),'call didn’t finish');
 assert.equal(notChargedReason('answered'),'no useful answer');
});
test('one charge line per shop',()=>{
 assert.equal(chargeText({kind:'held',amountCents:1000}),'₹10 on hold');
 assert.equal(chargeText({kind:'charged',amountCents:1000}),'Charged ₹10');
 assert.equal(chargeText({kind:'not_charged',amountCents:1000,reason:'shop didn’t answer'}),'Not charged · shop didn’t answer');
 assert.equal(chargeText({kind:'refunded',amountCents:1000}),'Refunded ₹10');
 assert.equal(chargeText({kind:'free',amountCents:0}),'Free test · no charge');
 assert.equal(chargeText(null),'');
});
test('task charge summary for history rows',()=>{
 const base={shopCount:3,resolvedCount:3,availableCount:0,unreachableCount:0,active:false};
 assert.equal(taskChargeText({...base,chargedCents:2000,notChargedCount:1,maxCents:3000}),'Charged ₹20 · 1 shop not charged');
 assert.equal(taskChargeText({...base,chargedCents:0,notChargedCount:3,maxCents:3000}),'No charge · 3 shops not charged');
 assert.equal(taskChargeText({...base,chargedCents:3000,notChargedCount:0,maxCents:3000}),'Charged ₹30');
 assert.equal(taskChargeText({...base,active:true,chargedCents:0,maxCents:3000}),'Up to ₹30 · final charge when calls finish');
 assert.equal(taskChargeText({...base,chargedCents:0,refundedCents:1000,notChargedCount:2,maxCents:3000}),'No charge · ₹10 refunded · 2 shops not charged');
});
test('credit history rows say what happened in plain words',()=>{
 assert.deepEqual(creditRowText({type:'grant',amountCents:10000}),{title:'Credit added',detail:'',amount:'+₹100'});
 assert.deepEqual(creditRowText({type:'charge',amountCents:-1000,shopName:'Croma',productName:'iPhone 17'}),{title:'Croma',detail:'iPhone 17',amount:'−₹10'});
 assert.deepEqual(creditRowText({type:'release',amountCents:1000,shopName:'Croma',productName:'iPhone 17',note:'shop didn’t answer'}),{title:'Not charged · Croma',detail:'shop didn’t answer · iPhone 17',amount:'₹0'});
 assert.deepEqual(creditRowText({type:'refund',amountCents:1000,shopName:'Croma',productName:'iPhone 17'}),{title:'Refund · Croma',detail:'iPhone 17',amount:'+₹10'});
});
