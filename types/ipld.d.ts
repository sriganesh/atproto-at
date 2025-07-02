/**
 * Type declarations for IPLD packages
 * These provide basic TypeScript support for CAR and CBOR functionality
 */

declare module '@ipld/car' {
  export interface CarReader {
    blocks(): AsyncIterable<{ cid: any; bytes: Uint8Array }>;
  }
  
  export class CarReader {
    static fromBytes(bytes: Uint8Array): Promise<CarReader>;
  }
}

declare module '@ipld/dag-cbor' {
  export function decode(bytes: Uint8Array): any;
  export function encode(obj: any): Uint8Array;
} 