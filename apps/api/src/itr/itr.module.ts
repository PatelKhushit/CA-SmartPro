import { Module } from '@nestjs/common';
import { ItrController } from './itr.controller.js';
import { ItrService } from './itr.service.js';
import { DocumentRequestsModule } from '../document-requests/document-requests.module.js';

@Module({
  imports: [DocumentRequestsModule],
  controllers: [ItrController],
  providers: [ItrService],
  exports: [ItrService],
})
export class ItrModule {}
