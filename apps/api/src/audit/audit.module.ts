import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';

// Global like PrismaModule (see common/prisma/prisma.module.ts) — audit
// logging is a cross-cutting concern needed by ~16 feature modules, and
// requiring each one to import AuditModule explicitly is exactly the
// boilerplate @Global() exists to avoid.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
