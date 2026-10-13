import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SIGN_IN_LINK_MINUTES,WELCOME_CREDIT_PAISE,newHereLine,welcomeLine,expiredLine,expiresLine,signInReturnUrl,signedOutUrl,isNewAccount,lastEmail,rememberEmail,welcomeSeen,markWelcomeSeen} from './signInPresentation.ts';

test('link expiry and welcome credit match the server',()=>{
 const auth=readFileSync(new URL('../../convex/auth.ts',import.meta.url),'utf8');
 const maxAge=auth.match(/maxAge:\s*(\d+)\s*\*\s*60/);
 assert.ok(maxAge,'convex/auth.ts sets maxAge in minutes');
 assert.equal(Number(maxAge![1]),SIGN_IN_LINK_MINUTES);
 assert.match(auth,new RegExp(`expires in ${SIGN_IN_LINK_MINUTES} minutes`));
 const onboarding=readFileSync(new URL('../../convex/onboarding.ts',import.meta.url),'utf8');
 assert.match(onboarding,new RegExp(`amountCents: ${WELCOME_CREDIT_PAISE}\\b`));
});
test('sign-in and welcome wording uses rupees and answer counts',()=>{
 assert.equal(newHereLine(),'New here? You start with ₹100 credit, about 10 answers. You pay ₹10 only when a shop answers what you asked.');
 assert.equal(welcomeLine(10000,1000),'You’re in. Your ₹100 welcome credit is ready, about 10 answers.');
 assert.equal(welcomeLine(10000,null),'You’re in. Your ₹100 welcome credit is ready, about 10 answers.');
 assert.equal(welcomeLine(1500,1000),'You’re in. Your ₹15 welcome credit is ready, about 1 answer.');
 assert.equal(expiresLine(),'It expires in 15 minutes.');
 assert.equal(expiredLine(),'Sign-in links work once, for 15 minutes. We can send you a fresh one.');
});
test('the email link returns to the same page without a used code or the signed-out flag',()=>{
 assert.equal(signInReturnUrl('https://x.test/calls'),'https://x.test/calls');
 assert.equal(signInReturnUrl('https://x.test/app?signed_out=1'),'https://x.test/app');
 assert.equal(signInReturnUrl('https://x.test/connect?client_id=a&code=old&state=s'),'https://x.test/connect?client_id=a&state=s');
 assert.equal(signedOutUrl(),'/app?signed_out=1');
 assert.equal(signedOutUrl(true),'/demo/signin?signed_out=1');
});
test('a new account has no chats or tasks and some credit',()=>{
 assert.equal(isNewAccount({chats:0,tasks:0,availablePaise:10000}),true);
 assert.equal(isNewAccount({chats:1,tasks:0,availablePaise:10000}),false);
 assert.equal(isNewAccount({chats:0,tasks:1,availablePaise:10000}),false);
 assert.equal(isNewAccount({chats:0,tasks:0,availablePaise:0}),false);
});
test('remembering works without browser storage',()=>{
 // Node has no localStorage here: reads come back empty and writes do nothing, without throwing.
 rememberEmail('a@b.test');markWelcomeSeen('u1');
 assert.equal(typeof lastEmail(),'string');
 assert.equal(typeof welcomeSeen('u1'),'boolean');
});
