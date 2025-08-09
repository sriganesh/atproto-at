// Helper functions to determine record types
export const recordTypeHelpers = {
  hasBskyPost: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.feed.post' || 
     (data.uri?.includes('app.bsky.feed.post') && !data.uri?.includes('app.bsky.feed.postgate'))),

  hasBskyProfile: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.actor.profile' || 
     data.uri?.includes('app.bsky.actor.profile')),

  hasBskyRepost: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.feed.repost' || 
     data.uri?.includes('app.bsky.feed.repost')),

  hasBskyLike: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.feed.like' || 
     data.uri?.includes('app.bsky.feed.like')),

  hasBskyBlock: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.graph.block' || 
     data.uri?.includes('app.bsky.graph.block')),

  hasBskyFollow: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.graph.follow' || 
     data.uri?.includes('app.bsky.graph.follow')),

  hasBskyList: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.graph.list' || 
     (data.uri?.includes('app.bsky.graph.list') && !data.uri?.includes('app.bsky.graph.listitem') && !data.uri?.includes('app.bsky.graph.listblock'))),

  hasBskyListItem: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.graph.listitem' || 
     data.uri?.includes('app.bsky.graph.listitem')),

  hasBskyThreadgate: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.feed.threadgate' || 
     data.uri?.includes('app.bsky.feed.threadgate')),

  hasBskyPostgate: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.feed.postgate' || 
     data.uri?.includes('app.bsky.feed.postgate')),

  hasBskyListblock: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.graph.listblock' || 
     data.uri?.includes('app.bsky.graph.listblock')),

  hasBskyLabeler: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'app.bsky.labeler.service' || 
     data.uri?.includes('app.bsky.labeler.service')),

  hasStatusSphere: (data: any) => 
    data?.type === 'record' && 
    data?.data?.value && 
    (data.data.value.$type === 'xyz.statusphere.status' || 
     data.uri?.includes('xyz.statusphere.status')),
};

// Extract DID for document link
export const getDid = (data: any): string => {
  if (!data || !data.uri) return '';
  
  // If it's a profile, just get the DID
  if (data.type === 'profile') {
    return data.uri.replace('at://', '');
  }
  
  // If it's a collection or record, extract the DID part
  const uriString = data.uri.replace('at://', '');
  const parts = uriString.split('/');
  return parts[0];
}; 