import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PutObjectParams, PutObjectResult, StorageProvider } from './storage-provider.interface.js';

/**
 * Real (not mocked) private-disk storage: files are written outside any web
 * root, under a per-organization subdirectory, using a server-generated
 * random filename — never the client-supplied one. Implements the same
 * StorageProvider contract a future S3/MinIO/GCS adapter would use, so
 * swapping providers in production is a config change plus one new class,
 * not a rewrite of the documents module. See docs/STATUS.md.
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(private readonly config: ConfigService) {
    this.baseDir = resolve(process.cwd(), this.config.get<string>('storage.localDir') ?? './storage');
  }

  /** Resolves a storage key to an absolute path and rejects anything that would escape baseDir. */
  private resolveKeyPath(storageKey: string): string {
    const full = resolve(this.baseDir, storageKey);
    if (full !== this.baseDir && !full.startsWith(this.baseDir + sep)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async putObject({ organizationId, buffer, originalFilename }: PutObjectParams): Promise<PutObjectResult> {
    const ext = extname(originalFilename).toLowerCase();
    const storageKey = normalize(join(organizationId, `${randomUUID()}${ext}`));
    const fullPath = this.resolveKeyPath(storageKey);
    await mkdir(join(this.baseDir, organizationId), { recursive: true });
    await writeFile(fullPath, buffer, { mode: 0o600 });
    return { storageKey };
  }

  async getObjectStream(storageKey: string): Promise<Readable> {
    return createReadStream(this.resolveKeyPath(storageKey));
  }

  async getObjectSize(storageKey: string): Promise<number> {
    const s = await stat(this.resolveKeyPath(storageKey));
    return s.size;
  }

  async deleteObject(storageKey: string): Promise<void> {
    const fullPath = this.resolveKeyPath(storageKey);
    if (existsSync(fullPath)) await unlink(fullPath);
  }
}
