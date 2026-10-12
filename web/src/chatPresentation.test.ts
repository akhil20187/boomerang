import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composerHint,one,count,type ChatItem} from './chatPresentation.ts';
const m=(kind:ChatItem['kind'],role:ChatItem['role']='assistant',payload?:ChatItem['payload']):ChatItem=>({_id:Math.random().toString(),role,kind,text:'x',payload});
test('composer hint follows the conversation',()=>{
 assert.equal(composerHint([]),'Ask us to call about anything nearby…');
 assert.equal(composerHint([m('text','user'),m('question')]),'Type your own answer…');
 assert.equal(composerHint([m('text','user'),m('brief'),m('picker','assistant',{noun:'plumbers'})]),'Ask about these plumbers…');
 assert.equal(composerHint([m('picker','assistant',{noun:'plumbers',taskId:'t'}),m('calls','assistant',{taskId:'t'})]),'Ask a follow-up…');
 assert.equal(composerHint([m('text','user'),m('text')]),'Type your answer…');
});
test('nouns read naturally',()=>{
 assert.equal(one('businesses'),'business');assert.equal(one('plumbers'),'plumber');
 assert.equal(count(1,'shops'),'1 shop');assert.equal(count(3,'plumbers'),'3 plumbers');
});
