// Both first-party frontends remain valid during the Vercel migration.
export function websiteOrigins() {
  return new Set([
    process.env.SITE_URL ?? 'http://localhost:5173',
    process.env.CONVEX_SITE_URL,
  ].filter((value): value is string => !!value).map(value => new URL(value).origin));
}

export function websiteRedirect(redirectTo?: string) {
  const base = process.env.SITE_URL ?? 'http://localhost:5173';
  const url = new URL(redirectTo || base, base);
  if (!websiteOrigins().has(url.origin) || url.username || url.password)
    throw new Error('Sign-in redirect is not allowed.');
  return url.toString();
}
