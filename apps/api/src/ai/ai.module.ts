import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiToolsService } from './ai-tools.service.js';

@Module({
  controllers: [AiController],
  providers: [AiService, AiToolsService],
})
export class AiModule {}
