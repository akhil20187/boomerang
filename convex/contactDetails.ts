import {ConvexError, type Infer} from 'convex/values';
import {contactV} from './validators';

export type Contact = Infer<typeof contactV>;
function text(value: string | undefined, label: string, max: number, required = false) {
  const clean = value?.trim();
  if ((!clean && required) || (clean && (clean.length > max || /[\u0000-\u001f]/.test(clean))))
    throw new ConvexError(`Enter a valid ${label}.`);
  return clean || undefined;
}
function webUrl(value: string | undefined, label: string) {
  const clean = text(value, label, 2000);
  if (!clean) return undefined;
  try {
    const url = new URL(clean);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error();
    return url.href;
  } catch { throw new ConvexError(`Enter a valid http or https ${label}.`); }
}
export function normalizeBusinessPhone(value: string) {
  if (value.length > 40 || !/^[+\d\s().-]+$/.test(value)) throw new ConvexError('Enter a valid Indian business phone number.');
  let phone = value.replace(/[\s().-]/g, '');
  if (/^0[2-9]\d{9}$/.test(phone)) phone = phone.slice(1);
  if (/^[2-9]\d{9}$/.test(phone)) phone = '+91' + phone;
  if (!/^\+91[2-9]\d{9}$/.test(phone)) throw new ConvexError('Use a full Indian business phone number with its area code; international numbers and short codes are not supported.');
  return phone;
}
export function normalizeContacts(contacts: Contact[]): Contact[] {
  if (!contacts.length || contacts.length > 20) throw new ConvexError('Provide between 1 and 20 business contacts.');
  const phones = new Set<string>();
  return contacts.map(contact => {
    const name = text(contact.name, 'business name', 160, true)!;
    const phone = normalizeBusinessPhone(contact.phone);
    if (phones.has(phone)) throw new ConvexError('The same phone number appears more than once. Confirm the business and provide that number once.');
    phones.add(phone);
    const sourceUrl = webUrl(contact.sourceUrl, 'source URL');
    if (contact.source === 'assistant' && !sourceUrl) throw new ConvexError('Include the source page URL for each researched business phone number.');
    const optional = {
      sourceUrl, website: webUrl(contact.website, 'website URL'),
      address: text(contact.address, 'business address', 500),
      area: text(contact.area, 'business area', 160),
      context: text(contact.context, 'business context', 300),
    };
    return {name, phone, source: contact.source, ...Object.fromEntries(Object.entries(optional).filter(([,value])=>value !== undefined))};
  });
}
