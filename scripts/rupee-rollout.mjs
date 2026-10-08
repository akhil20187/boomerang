// One-off D135 rollout: explicit apply, bounded queries, no customer data output.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const deployment = 'little-kangaroo-718';
const tables = ['creditEntries','creditAccounts','creditReservations','tasks'];
async function convex(args) {
  const {stdout} = await exec('npx',['convex',...args,'--deployment',deployment],{maxBuffer:8*1024*1024,timeout:90000});
  return stdout.trim();
}
async function readMoney() {
  const source = `const out={};for(const table of ${JSON.stringify(tables)}){const rows=await ctx.db.query(table).take(1001);if(rows.length===1001)throw Error("Rollout audit requires pagination beyond 1000 rows");out[table]=rows.map(r=>Object.fromEntries(["_id","userId","taskId","shopJobId","amount","amountCents","currency","type","state","balanceCents","reservedCents","answerPriceCents","selfTest","verification"].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])));}return out;`;
  return JSON.parse(await convex(['run','--inline-query',source]));
}
function reconcile(rows) {
  const users = new Set([...rows.creditEntries,...rows.creditAccounts].map(r=>r.userId));
  for (const userId of users) {
    const entries=rows.creditEntries.filter(e=>e.userId===userId);
    assert.ok(entries.every(e=>e.currency==='INR'),'Unconverted or mixed currency account');
    const balance=entries.filter(e=>!['reservation','release'].includes(e.type)).reduce((n,e)=>n+(e.amountCents??Math.round(e.amount*100)),0);
    const held=rows.creditReservations.filter(r=>r.userId===userId&&r.state==='reserved').reduce((n,r)=>n+r.amountCents,0);
    const account=rows.creditAccounts.find(a=>a.userId===userId);
    if(account){assert.equal(account.balanceCents,balance,'Account/history balance mismatch');assert.equal(account.reservedCents,held,'Account/reservations hold mismatch');}
  }
  assert.ok(rows.tasks.every(t=>t.answerPriceCents===undefined||t.currency==='INR'),'Unconverted priced task');
  return {users:users.size,entries:rows.creditEntries.length,accounts:rows.creditAccounts.length,reservations:rows.creditReservations.length,pricedTasks:rows.tasks.filter(t=>t.answerPriceCents!==undefined).length,usdEntries:0,mismatches:0};
}
const mode=process.argv[2];
if(mode==='apply'){
  assert.equal(await convex(['env','get','LIVE_CALLS_ENABLED']),'false','Pause calls before converting');
  const health=await fetch('https://voice-bridge-development.up.railway.app/health',{signal:AbortSignal.timeout(15000)});
  assert.equal(health.status,200);const state=await health.json();
  assert.equal(state.active,0,'Wait for active calls');assert.equal(state.reconciliationRequired,0,'Resolve uncertain calls first');
  const before=await readMoney();
  for(const row of before.creditAccounts){const history=before.creditEntries.filter(e=>e.userId===row.userId);const balance=history.filter(e=>!['reservation','release'].includes(e.type)).reduce((n,e)=>n+(e.amountCents??Math.round(e.amount*100)),0);assert.equal(row.balanceCents,balance,'Resolve mismatched accounts before converting');assert.equal(new Set(history.map(e=>e.currency)).size,1,'Resolve mixed currencies before converting');}
  for(const name of ['convertCreditsToRupees','convertTaskPricesToRupees']){
    let cursor=null,converted=0,done=false;
    for(let batch=0;batch<200;batch++){
      const result=JSON.parse(await convex(['run',`maintenance:${name}`,JSON.stringify({cursor})]));
      assert.equal(result.mismatched?.length??0,0,'Conversion reported mismatches: keep calls paused');
      converted+=result.converted;
      if(result.isDone){done=true;break;}
      assert.ok(result.continueCursor&&result.continueCursor!==cursor,'Conversion cursor did not advance');cursor=result.continueCursor;
    }
    assert.ok(done,'Conversion exceeded bounded batch limit');console.log(JSON.stringify({conversion:name,converted,isDone:true,mismatches:0}));
  }
  console.log(JSON.stringify({verified:reconcile(await readMoney())}));
}else if(mode==='verify'){
  const backup=process.argv[3];assert.ok(backup,'Supply the pre-conversion snapshot path');
  const python='import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nprint(json.dumps({t:[json.loads(l) for l in z.read(t+"/documents.jsonl").decode().splitlines() if l] for t in ["creditEntries","creditAccounts","creditReservations","tasks"]}))';
  const {stdout}=await exec('python3',['-c',python,backup],{maxBuffer:8*1024*1024});
  const before=JSON.parse(stdout),after=await readMoney();
  for(const table of tables){
    for(const old of before[table]){
      const current=after[table].find(r=>r._id===old._id);assert.ok(current,`Missing original ${table} row`);
      const factor=table==='creditEntries'?(old.currency==='USD'?100:1):table==='tasks'?(old.currency?1:100):before.creditEntries.some(e=>e.userId===old.userId&&e.currency==='USD')?100:1;
      const fields=table==='creditEntries'?['amount','amountCents']:table==='creditAccounts'?['balanceCents']:table==='creditReservations'?['amountCents']:['answerPriceCents'];
      for(const field of fields)if(old[field]!==undefined)assert.equal(current[field],old[field]*factor,`${table}.${field} must preserve the original value at the approved rate`);
    }
  }
  console.log(JSON.stringify({snapshotPreservation:'verified',...reconcile(after),callsPlacedByScript:0}));
}else throw new Error('Choose apply or verify <private snapshot path>');
