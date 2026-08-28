import { Module } from '@nestjs/common';
import { ComplianceRulesController, ComplianceEventsController } from './compliance.controller.js';
import { ComplianceRulesService } from './compliance-rules.service.js';
import { ComplianceEventsService } from './compliance-events.service.js';
import { ComplianceEngineService } from './compliance-engine.service.js';

@Module({
  controllers: [ComplianceRulesController, ComplianceEventsController],
  providers: [ComplianceRulesService, ComplianceEventsService, ComplianceEngineService],
  exports: [ComplianceEngineService],
})
export class ComplianceModule {}
