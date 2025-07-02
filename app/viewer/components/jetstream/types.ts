export interface JetstreamInstance {
  hostname: string;
  region: string;
  url: string;
}

export interface JetstreamEvent {
  did: string;
  time_us: number;
  kind: 'commit' | 'identity' | 'account';
  commit?: {
    rev: string;
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    record?: any;
    cid?: string;
  };
  identity?: {
    did: string;
    handle: string;
    seq: number;
    time: string;
  };
  account?: {
    active: boolean;
    did: string;
    seq: number;
    time: string;
  };
}

export interface JetstreamConfig {
  instance: JetstreamInstance;
  wantedCollections?: string[];
  wantedDids?: string[];
}

export interface JetstreamContextType {
  type: 'profile' | 'collection';
  did: string;
  collection?: string;
  handle?: string;
}

export const OFFICIAL_JETSTREAM_INSTANCES: JetstreamInstance[] = [
  {
    hostname: 'jetstream1.us-east.bsky.network',
    region: 'US-East',
    url: 'wss://jetstream1.us-east.bsky.network/subscribe'
  },
  {
    hostname: 'jetstream2.us-east.bsky.network', 
    region: 'US-East',
    url: 'wss://jetstream2.us-east.bsky.network/subscribe'
  },
  {
    hostname: 'jetstream1.us-west.bsky.network',
    region: 'US-West', 
    url: 'wss://jetstream1.us-west.bsky.network/subscribe'
  },
  {
    hostname: 'jetstream2.us-west.bsky.network',
    region: 'US-West',
    url: 'wss://jetstream2.us-west.bsky.network/subscribe'
  }
]; 