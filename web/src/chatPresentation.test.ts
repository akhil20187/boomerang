import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composerHint,one,count,pickerFoot,pickerPlace,pickerKind,pickerTitle,type ChatItem} from './chatPresentation.ts';
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
test('picker foot: Show 5 more, end-of-list line, and Search up to 20 km when few',()=>{
 assert.deepEqual(pickerFoot(12,5,10,'institutes'),{more:'Show 5 more institutes',end:undefined,widen:false});
 assert.deepEqual(pickerFoot(12,10,10,'institutes'),{more:'Show 2 more institutes',end:undefined,widen:false});
 assert.equal(pickerFoot(6,5,10,'plumbers').more,'Show 1 more plumber');
 const end=pickerFoot(5,5,10,'institutes');
 assert.equal(end.more,undefined);assert.equal(end.end,'No more institutes within 10 km. Institutes with fewer than 50 Google ratings are hidden.');assert.equal(end.widen,true);
 assert.equal(pickerFoot(5,5,20,'institutes').widen,false);
 assert.equal(pickerFoot(12,12,10,'shops').widen,false);
 assert.deepEqual(pickerFoot(0,5,10,'clinics'),{more:undefined,end:'No clinics came up within 10 km.',widen:true});
});
test('picker headline names what the customer gave',()=>{
 assert.equal(pickerPlace({area:'Ameerpet',pincode:undefined}),'Ameerpet');
 assert.equal(pickerPlace({pincode:'500016'}),'500016');
 assert.equal(one('institutes'),'institute');
});
test('one and count say 1 office, 1 business, 1 branch',()=>{
 assert.equal(count(1,'offices'),'1 office');assert.equal(count(1,'institutes'),'1 institute');assert.equal(count(1,'businesses'),'1 business');
 assert.equal(one('branches'),'branch');assert.equal(one('agencies'),'agency');assert.equal(count(2,'offices'),'2 offices');
});
test('picker title by kind: nearby, named matches, numbers sent, web results',()=>{
 assert.equal(pickerKind({shops:[]}),'nearby');assert.equal(pickerKind({shops:[]},'X'),'named');
 assert.equal(pickerKind({source:'supplied',shops:[{source:'customer'}]}),'sent');assert.equal(pickerKind({source:'supplied',shops:[{source:'assistant'}]},'X'),'web');
 assert.equal(pickerTitle('nearby',1,'offices','Miyapur'),'1 office near Miyapur');
 assert.equal(pickerTitle('named',2,'offices','Miyapur','Ainapur Consultants and Engineers'),'Matches for “Ainapur Consultants and Engineers” near Miyapur');
 assert.equal(pickerTitle('sent',1,'businesses','x'),'1 business you sent');
 assert.equal(pickerTitle('web',1,'offices','x','Ainapur'),'Web results for “Ainapur”');
});
