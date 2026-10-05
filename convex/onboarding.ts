import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { addGrantToAccount } from './credits';

export async function approveWithWelcomeCredit(ctx: MutationCtx, userId: Id<'users'>, grant = true) {
  await ctx.db.patch(userId, { eligible: true });
  if (!grant) return;
  const operationId = `welcome:${userId}`;
  const previous = await ctx.db.query('creditEntries').withIndex('by_operation', q => q.eq('operationId', operationId)).unique();
  if (previous) return;
  await ctx.db.insert('creditEntries', { userId, amount: 1, amountCents: 100, currency: 'USD', type: 'grant', reason: '$1 signup test credit', operationId });
  await addGrantToAccount(ctx, userId, 100);
}
