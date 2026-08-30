import { Module } from '@nestjs/common';
import { UdinController } from './udin.controller.js';
import { UdinService } from './udin.service.js';

@Module({
  controllers: [UdinController],
  providers: [UdinService],
  exports: [UdinService],
})
export class UdinModule {}
