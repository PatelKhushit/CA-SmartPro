import { Module } from '@nestjs/common';
import { LocalDiskStorageProvider } from './local-disk-storage.provider.js';
import { STORAGE_PROVIDER } from './storage-provider.interface.js';

@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: LocalDiskStorageProvider }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
