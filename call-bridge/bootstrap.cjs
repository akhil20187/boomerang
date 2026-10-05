const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {validateRuntimeEnv}=require('./bridge.cjs');

// Only these fixed files are repaired. Never recursively change a mounted volume.
function prepareVolume({env=process.env,fsImpl=fs,processImpl=process,directory='/var/lib/human-mcp',uid=1000,gid=1000}={}){
 const journal=path.join(directory,'attempts.json');
 if(env.CALL_BRIDGE_JOURNAL&&env.CALL_BRIDGE_JOURNAL!==journal)throw Error('Journal must use the fixed volume path');
 let dir;try{dir=fsImpl.lstatSync(directory);}catch(error){if(error.code!=='ENOENT')throw error;fsImpl.mkdirSync(directory,{recursive:true,mode:0o700});dir=fsImpl.lstatSync(directory);}
 if(!dir.isDirectory()||dir.isSymbolicLink())throw Error('Volume must be a real directory');
 const files=[];
 for(const file of [journal,`${journal}.tmp`]){let stat;try{stat=fsImpl.lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error('Journal must be a regular file with one link');files.push(file);}
 const root=processImpl.getuid()===0;
 if(!root&&(processImpl.getuid()!==uid||processImpl.getgid()!==gid))throw Error('Bridge must run as its dedicated user');
 for(const file of [directory,...files]){if(root)fsImpl.chownSync(file,uid,gid);fsImpl.chmodSync(file,file===directory?0o700:0o600);}
 if(root){processImpl.setgroups([]);processImpl.setgid(gid);processImpl.setuid(uid);}
 if(processImpl.getuid()!==uid||processImpl.getgid()!==gid)throw Error('Bridge privilege drop failed');
 fsImpl.accessSync(directory,fs.constants.W_OK);
 return journal;
}
function startBridge(env){
 const child=spawn(process.execPath,[path.join(__dirname,'bridge.cjs')],{env,stdio:'inherit'});
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
 child.on('error',()=>process.exit(1));
 child.on('exit',(code,signal)=>process.exit(code??(signal?1:0)));
 return child;
}
function bootstrap({env=process.env,start=startBridge,...options}={}){
 validateRuntimeEnv(env);
 const journal=prepareVolume({env,...options});
 return start({...env,CALL_BRIDGE_JOURNAL:journal});
}
if(require.main===module){try{bootstrap();}catch(error){console.error(`Bridge startup rejected: ${error.message}`);process.exitCode=1;}}
module.exports={prepareVolume,bootstrap};
