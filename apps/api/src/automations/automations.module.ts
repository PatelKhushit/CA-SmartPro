import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller.js';
import { AutomationsService } from './automations.service.js';
import { AutomationsEngineService } from './automations-engine.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationsEngineService],
  exports: [AutomationsService, AutomationsEngineService],
})
export class AutomationsModule {}
