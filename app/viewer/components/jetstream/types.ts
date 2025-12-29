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
  // Firehose.stream instances
  {
    hostname: 'nyc.firehose.stream',
    region: 'NYC',
    url: 'wss://nyc.firehose.stream/tap'
  },
  {
    hostname: 'sfo.firehose.stream',
    region: 'SFO',
    url: 'wss://sfo.firehose.stream/tap'
  },
  {
    hostname: 'london.firehose.stream',
    region: 'London',
    url: 'wss://london.firehose.stream/tap'
  },
  {
    hostname: 'frankfurt.firehose.stream',
    region: 'Frankfurt',
    url: 'wss://frankfurt.firehose.stream/tap'
  },
  {
    hostname: 'jet.firehose.stream',
    region: 'Global',
    url: 'wss://jet.firehose.stream/tap'
  },
  {
    hostname: 'chennai.firehose.stream',
    region: 'Chennai',
    url: 'wss://chennai.firehose.stream/tap'
  },
  {
    hostname: 'sydney.firehose.stream',
    region: 'Sydney',
    url: 'wss://sydney.firehose.stream/tap'
  },
  // Bluesky instances
  {
    hostname: 'jetstream1.us-east.bsky.network',
    region: 'US-East (Bluesky)',
    url: 'wss://jetstream1.us-east.bsky.network/subscribe'
  },
  {
    hostname: 'jetstream2.us-east.bsky.network',
    region: 'US-East (Bluesky)',
    url: 'wss://jetstream2.us-east.bsky.network/subscribe'
  },
  {
    hostname: 'jetstream1.us-west.bsky.network',
    region: 'US-West (Bluesky)',
    url: 'wss://jetstream1.us-west.bsky.network/subscribe'
  },
  {
    hostname: 'jetstream2.us-west.bsky.network',
    region: 'US-West (Bluesky)',
    url: 'wss://jetstream2.us-west.bsky.network/subscribe'
  }
]; 