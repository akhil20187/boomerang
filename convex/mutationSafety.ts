import { mutation as registerMutation, internalMutation as registerInternalMutation } from './_generated/server';
import { assertWritable } from './migration';

// Gate every application mutation, including background work, during final sync.
// Preserve each function's own argument/return validators and inferred types.
function guarded(register: any, definition: any) {
  return register({...definition, handler:(ctx: any, args: any) => {
    assertWritable();
    return definition.handler(ctx,args);
  }});
}
export const mutation: typeof registerMutation = (definition: any) => guarded(registerMutation,definition);
export const internalMutation: typeof registerInternalMutation = (definition: any) => guarded(registerInternalMutation,definition);
