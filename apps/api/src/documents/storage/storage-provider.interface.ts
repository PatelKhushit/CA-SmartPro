import type { Readable } from 'node:stream';

export interface PutObjectParams {
  organizationId: string;
  buffer: Buffer;
  originalFilename: string;
}

export interface PutObjectResult {
  storageKey: string;
}

/**
 * Adapter boundary for private document storage (section 60 of the product
 * spec: provider can change without rewriting the application). This
 * environment binds it to LocalDiskStorageProvider; production should bind
 * the same interface to an S3/MinIO/GCS-backed implementation instead.
 */
export interface StorageProvider {
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  getObjectStream(storageKey: string): Promise<Readable>;
  getObjectSize(storageKey: string): Promise<number>;
  deleteObject(storageKey: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
