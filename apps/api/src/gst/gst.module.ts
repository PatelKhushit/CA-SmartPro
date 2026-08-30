import { Module } from '@nestjs/common';
import { GstController } from './gst.controller.js';
import { GstService } from './gst.service.js';
import { DocumentRequestsModule } from '../document-requests/document-requests.module.js';

@Module({
  imports: [DocumentRequestsModule],
  controllers: [GstController],
  providers: [GstService],
  exports: [GstService],
})
export class GstModule {}
