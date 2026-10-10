import {mutation} from './_generated/server';
import {v, ConvexError} from 'convex/values';
import {requireUser} from './access';
import {balances, callingQuote} from './credits';
import {normalizeContacts} from './contactDetails';

/** Prepare a reviewable contact list. Never dispatches calls or reserves credit. */
export const prepare = mutation({
  args: {briefId: v.id('briefs'), accessToken: v.optional(v.string())},
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.accessToken);
    const brief = await ctx.db.get(args.briefId);
    if (!brief || brief.userId !== userId) throw new ConvexError('Brief not found.');
    if (brief.expiresAt < Date.now()) throw new ConvexError('This brief has expired. Start again.');
    if (brief.status !== 'ready' || !brief.brief) throw new ConvexError('Finish the brief first.');
    if (!brief.contacts?.length) throw new ConvexError('Start a new brief with the supplied business contacts first.');
    // A repeated prepare is read-only from the customer's perspective and returns the same immutable draft.
    const saved = await ctx.db.query('drafts').withIndex('by_brief_source', q=>q.eq('briefId', brief._id).eq('source', 'supplied')).unique();
    if (saved && saved.expiresAt < Date.now()) throw new ConvexError('These business contacts have expired. Start a new brief.');
    if (saved) return {...saved, draftId:saved._id, ...callingQuote(), availableCents:(await balances(ctx,userId)).availableCents};
    const recent = await ctx.db.query('drafts').withIndex('by_user', q=>q.eq('userId', userId)).order('desc').take(20);
    if (recent.length === 20 && recent.every(d=>d._creationTime > Date.now()-3600000))
      throw new ConvexError('Too many new contact lists in the last hour. Try again later.');
    const shops = normalizeContacts(brief.contacts).map((contact,index)=>({placeId:`contact:${brief._id}:${index}`, ...contact}));
    const product = {name:brief.summary || brief.brief.task_context.summary, description:brief.request};
    const draft = {
      userId, briefId:brief._id, source:'supplied' as const, productInput:brief.request,
      product, ...(brief.pincode ? {pincode:brief.pincode} : {}), cards:[], comments:'', shops,
      expiresAt:Math.min(brief.expiresAt, Date.now()+86400000),
    };
    const draftId = await ctx.db.insert('drafts', draft);
    return {...draft, draftId, ...callingQuote(), availableCents:(await balances(ctx,userId)).availableCents};
  },
});
