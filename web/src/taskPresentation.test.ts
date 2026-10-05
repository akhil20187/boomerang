import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskOutcome,taskLabel} from './taskPresentation.ts';
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
