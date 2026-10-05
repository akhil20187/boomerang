import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerError} from './errors.ts';
test('shows account eligibility guidance from structured Convex error data',()=>{
 assert.equal(customerError({data:'Your account needs approval before calls can start.',message:'[CONVEX M(tasks:start)] [Request ID: secret] Server Error'},'Try again.'),'Your account needs approval before calls can start.');
});
test('shows safe service-unavailable message with explicit pricing reason',()=>{
 assert.equal(customerError({data:{code:'service_unavailable',reason:'pricing_not_configured',callingAvailable:false,message:'Calling price is not configured yet. Your account has not been charged.'}},'Try again.'),'Calling price is not configured yet. Your account has not been charged.');
});
test('keeps server paths, transport traces and unknown errors out of customer copy',()=>{
 for(const error of [new Error('[CONVEX M(tasks:start)] Server Error at /Users/person/private.ts:99'),{data:'Uncaught Error\n at private.ts:1'},{data:{message:'Server Error: Called by client'}},null])assert.equal(customerError(error,'Calls couldn’t start. Try again.'),'Calls couldn’t start. Try again.');
});
