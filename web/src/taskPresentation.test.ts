import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskOutcome,taskLabel,formatPaise,priceSummary,notChargedReason} from './taskPresentation.ts';
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
