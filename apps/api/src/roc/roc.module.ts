import { Module } from '@nestjs/common';
import { RocController } from './roc.controller.js';
import { RocService } from './roc.service.js';
import { DocumentRequestsModule } from '../document-requests/document-requests.module.js';

@Module({
  imports: [DocumentRequestsModule],
  controllers: [RocController],
  providers: [RocService],
  exports: [RocService],
})
export class RocModule {}
