declare module '@prisma/client' {
  // Minimal shim for type-check when Prisma client has not been generated in CI
  export const Prisma: any;
  export namespace Prisma {
    export type TransactionClient = any;
    export type JsonObject = any;
    export type InputJsonValue = any;
  }

  export class PrismaClient {
    constructor(...args: any[]);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    [k: string]: any;
  }

  export enum InventoryType {
    RAW = 'RAW',
    FINISHED = 'FINISHED',
  }

  export type Json = any;

  // Generic placeholders used in codebase
  export type Prisma = any;
  export type User = any;
  export type Sku = any;
  export type Location = any;
  export type PurchaseOrder = any;
}
