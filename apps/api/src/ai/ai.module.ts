import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiToolsService } from './ai-tools.service.js';
import { GstModule } from '../gst/gst.module.js';
import { TdsModule } from '../tds/tds.module.js';
import { ItrModule } from '../itr/itr.module.js';
import { RocModule } from '../roc/roc.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { LeaveModule } from '../leave/leave.module.js';
import { UdinModule } from '../udin/udin.module.js';
import { NoticesModule } from '../notices/notices.module.js';
import { DocumentRequestsModule } from '../document-requests/document-requests.module.js';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';

@Module({
  imports: [
    GstModule,
    TdsModule,
    ItrModule,
    RocModule,
    BillingModule,
    AttendanceModule,
    LeaveModule,
    UdinModule,
    NoticesModule,
    DocumentRequestsModule,
    KnowledgeModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiToolsService],
})
export class AiModule {}
