import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { GstModule } from '../gst/gst.module.js';
import { TdsModule } from '../tds/tds.module.js';
import { ItrModule } from '../itr/itr.module.js';
import { RocModule } from '../roc/roc.module.js';
import { UdinModule } from '../udin/udin.module.js';
import { NoticesModule } from '../notices/notices.module.js';
import { BillingModule } from '../billing/billing.module.js';

@Module({
  imports: [GstModule, TdsModule, ItrModule, RocModule, UdinModule, NoticesModule, BillingModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
