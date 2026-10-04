import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerToken, createTools } from './core.mjs';

test('missing bearer token never reaches the backend', async () => {
  let requests = 0;
  const tools = createTools({ action: async () => { requests++; } }, null);
  await assert.rejects(() => tools.find_shops({productInput:'printer',pincode:'500037'}), /link your account/i);
  assert.equal(requests, 0);
});
test('task creation forwards selection and retry key with authenticated account token', async () => {
  let request;
  const tools = createTools({mutation:async (fn,args) => {request=args;return {taskId:'task1'};}},'secret-account-token');
  assert.deepEqual(await tools.start_calls({draftId:'draft1',selectedPlaceIds:['shop1'],idempotencyKey:'same-click',expectedAnswerPriceCents:125}), {taskId:'task1'});
  assert.equal(request.accessToken,'secret-account-token');
  assert.deepEqual(request.selectedPlaceIds,['shop1']);
  assert.equal(request.idempotencyKey,'same-click');
  assert.equal(request.expectedAnswerPriceCents,125);
});
test('only Bearer authorization is accepted', () => {
  assert.equal(bearerToken('Basic password'),null);
  assert.equal(bearerToken('Bearer abc'),'abc');
  assert.equal(bearerToken('Bearer '),null);
});
test('a read-only OAuth connection cannot dispatch calls',async()=>{
  let calls=0;
  const tools=createTools({mutation:async()=>{calls++;}},name=>name==='start_calls'?null:'read-token');
  await assert.rejects(()=>tools.start_calls({draftId:'draft1',selectedPlaceIds:['shop1'],idempotencyKey:'same-click'}),/link your account/i);
  assert.equal(calls,0);
});
test('saved search is normalized into the same card result shape',async()=>{
  const tools=createTools({query:async()=>({_id:'draft1',product:{name:'Printer'},shops:[],pincode:'500037'})},'token');
  const result=await tools.more_shops({draftId:'draft1'});
  assert.equal(result.draftId,'draft1');
  assert.equal(result.product.name,'Printer');
});
