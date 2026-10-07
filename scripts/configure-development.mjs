import { execFileSync } from 'node:child_process';
import { generateKeyPair,exportPKCS8,exportJWK } from 'jose';
import fs from 'node:fs';
for(const file of ['.env','.env.local','.env.resend'])if(fs.existsSync(file))process.loadEnvFile(file);
const run=args=>execFileSync('npx',['convex',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,DO_NOT_TRACK:'1'}});
const existing=run(['env','list']);
const has=name=>existing.split('\n').some(line=>line.startsWith(name+'='));
const set=(name,value)=>{run(['env','set',`${name}=${value}`]);console.log(`Configured ${name}`);};
if(process.argv.includes('--providers'))for(const name of ['GOOGLEPLACES_API_KEY','MONID_API_KEY','OPENAI_API_KEY'])if(process.env[name])set(name,process.env[name]);
if(process.argv.includes('--resend'))for(const name of ['RESEND_API_KEY','RESEND_FROM_EMAIL'])if(process.env[name])set(name,process.env[name]);
if(!has('JWT_PRIVATE_KEY')||!has('JWKS')){
  const keys=await generateKeyPair('RS256',{extractable:true});
  const privateKey=(await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g,' ');
  const publicKey=await exportJWK(keys.publicKey);
  set('JWT_PRIVATE_KEY',privateKey);set('JWKS',JSON.stringify({keys:[{use:'sig',...publicKey}]}));
}
if(!has('SITE_URL'))set('SITE_URL',process.env.VITE_APP_PUBLIC_URL || process.env.SITE_URL || process.env.CONVEX_SITE_URL || 'http://127.0.0.1:5173');
if(!has('LIVE_CALLS_ENABLED'))set('LIVE_CALLS_ENABLED','false');
console.log('Configuration complete. Existing website and calling settings preserved; new deployments default to calls disabled. No emails or calls were sent.');
