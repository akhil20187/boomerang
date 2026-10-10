import { makeFunctionReference } from 'convex/server';
export function bearerToken(header) {
  return typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header)?.[1] ?? null : null;
}
export function createTools(client, accessToken) {
  const request = async (method, name, args, toolName) => {
    const token=typeof accessToken==='function'?accessToken(toolName):accessToken;
    if (!token) throw new Error('Link your account with permission for this action before requesting shops or calls.');
    return client[method](makeFunctionReference(name), {...args, accessToken:token});
  };
  return {
    prepare_brief: args => request('action','briefs:prepare',args,'prepare_brief'),
    prepare_contacts: args => request('mutation','contacts:prepare',args,'prepare_contacts'),
    find_shops: args => request('action','discovery:search',args,'find_shops'),
    more_shops: async args => {const draft=await request('query','drafts:get',args,'more_shops');return {...draft,draftId:draft._id??draft.draftId};},
    start_calls: args => request('mutation','tasks:start',args,'start_calls'),
    task_status: args => request('query','tasks:get',args,'task_status'),
    get_recording: args => request('mutation','recordings:playback',args,'get_recording'),
  };
}
