/** Only provider-approved error data is suitable for customers; transport messages can contain stack traces. */
export function customerError(error:unknown,fallback:string):string {
 if(!error||typeof error!=='object')return fallback;
 const data=(error as {data?:unknown}).data;
 const message=typeof data==='string'?data:data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?data.message:undefined;
 if(!message)return fallback;
 const clean=message.trim();
 if(!clean||clean.length>300||/[\r\n]|\[CONVEX|Request ID|Server Error|Uncaught|Called by client|https?:\/\/|(?:\/Users\/|\.tsx?:\d|\.js:\d)/i.test(clean))return fallback;
 return clean;
}
