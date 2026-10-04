import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerError} from './errors.ts';
test('shows account eligibility guidance from structured Convex error data',()=>{
 assert.equal(customerError({data:'Your account needs approval before calls can start.',message:'[CONVEX M(tasks:start)] [Request ID: secret] Server Error'},'Try again.'),'Your account needs approval before calls can start.');
});
test('keeps server paths, transport traces and unknown errors out of customer copy',()=>{
 for(const error of [new Error('[CONVEX M(tasks:start)] Server Error at /Users/person/private.ts:99'),{data:'Uncaught Error\n at private.ts:1'},{data:{message:'Server Error: Called by client'}},null])assert.equal(customerError(error,'Calls couldn’t start. Try again.'),'Calls couldn’t start. Try again.');
});
