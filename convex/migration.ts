import { ConvexError } from 'convex/values';

// Convex registered functions expose this handler at runtime. The auth library's
// public return types hide it; keep the compatibility adapter in one place.
export function invokeHandler(registered: unknown, ctx: any, args: any) {
  return (registered as {_handler:(ctx:any,args:any)=>any})._handler(ctx,args);
}

export function assertWritable() {
  if (process.env.MIGRATION_READ_ONLY === 'true')
    throw new ConvexError('Boomerang has moved to production. Reload the website or reconnect your assistant.');
}

export async function forwardRequest(request: Request): Promise<Response | null> {
  const target = process.env.MIGRATION_FORWARD_URL;
  if (target) {
    const current = new URL(request.url);
    const destination = new URL(target);
    destination.pathname = current.pathname;
    destination.search = current.search;
    destination.hash = '';
    if (destination.protocol !== 'https:' || destination.origin === current.origin)
      return new Response('Invalid migration target', {status:503});
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');
    return fetch(destination.href, {
      method:request.method, headers, redirect:'manual',
      ...(request.method !== 'GET' && request.method !== 'HEAD' ? {body:await request.text()} : {}),
      signal:AbortSignal.timeout(30000),
    });
  }
  if (process.env.MIGRATION_READ_ONLY === 'true' && !['GET','HEAD','OPTIONS'].includes(request.method))
    return new Response('Production migration in progress. Please retry shortly.',
      {status:503,headers:{'Retry-After':'30','Cache-Control':'no-store'}});
  return null;
}
