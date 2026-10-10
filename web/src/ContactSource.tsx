import type {Shop} from './types';

export function directionsUrl(shop: Shop) {
  if (shop.mapsUrl) return shop.mapsUrl;
  const query = shop.address || (!shop.source ? shop.name : '');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : undefined;
}

export function ContactSource({shop, row = false}: {shop: Shop; row?: boolean}) {
  if (!shop.source) return null;
  const source = shop.sourceUrl || shop.website;
  let url: URL | undefined;
  try { if (source) { const candidate = new URL(source); if (['https:', 'http:'].includes(candidate.protocol)) url = candidate; } } catch {}
  return <p className={`contact-source${row ? ' contact-source-row' : ''}`}>
    {shop.source === 'customer' ? 'Provided by you' : 'Researched contact'}
    {url && <> · <a href={url.href} target="_blank" rel="noreferrer">{url.hostname.replace(/^www\./, '')}</a></>}
  </p>;
}

export function businessCopy(text: string, supplied: boolean) {
  return supplied ? text.replace(/\bshops\b/g, 'businesses').replace(/\bshop\b/g, 'business').replace(/\bShops\b/g, 'Businesses').replace(/\bShop\b/g, 'Business') : text;
}
