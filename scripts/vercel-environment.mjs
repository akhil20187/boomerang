const production = 'coordinated-barracuda-687';
const development = 'unique-wombat-849';
export function vercelEnvironment(env = process.env) {
  const preview = env.VERCEL_ENV === 'preview';
  const deployment = preview ? development : production;
  if (preview && env.VERCEL_GIT_COMMIT_REF !== 'development') throw new Error('Only development previews are configured.');
  const cloud = `https://${deployment}.convex.cloud`;
  if (env.VITE_CONVEX_URL !== cloud) throw new Error(`Expected ${preview ? 'development' : 'production'} Convex URL.`);
  if (preview && !env.CONVEX_DEPLOY_KEY?.startsWith(`dev:${development}|`)) throw new Error('Preview requires the isolated development deploy key.');
  return { preview, deployment, cloud, site: `https://${deployment}.convex.site` };
}

export function vercelRoutes({ site }) {
  return [
    { src: '/', dest: '/landing.html' },
    { src: '/setup(?:\\.html)?', status: 302, headers: { Location: '/' } },
    { src: '/audio/(.*)', dest: '/sample-audio/$1' },
    { src: '/SKILL.md', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, continue: true },
    { src: '/mcp', dest: `${site}/mcp/public` },
    { src: '/\\.well-known/oauth-protected-resource(?:/mcp)?', dest: `${site}/.well-known/oauth-protected-resource/public` },
    { src: '/oauth/(request|approve)', dest: `${site}/oauth/$1` },
    { src: '/api/(.*)', dest: `${site}/api/$1` },
    { handle: 'filesystem' },
    { src: '/(app|account|tasks|credit|calls|status|connect|connect-assistant)/?', dest: '/index.html' },
    { src: '/demo(?:/[a-z-]*)?/?', dest: '/index.html' },
  ];
}
