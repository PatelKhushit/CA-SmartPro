import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ComplianceRulesService } from './compliance-rules.service.js';
import { ComplianceEventsService } from './compliance-events.service.js';
import { ComplianceEngineService } from './compliance-engine.service.js';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto.js';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('compliance-rules')
export class ComplianceRulesController {
  constructor(private readonly rulesService: ComplianceRulesService) {}

  @RequirePermissions('compliance.manage')
  @Get()
  list(@Query('status') status?: string) {
    return this.rulesService.list(status);
  }

  @RequirePermissions('compliance.manage')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.rulesService.get(id);
  }

  @RequirePermissions('compliance.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateComplianceRuleDto) {
    return this.rulesService.create(user, dto);
  }

  @RequirePermissions('compliance.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateComplianceRuleDto) {
    return this.rulesService.update(user, id, dto);
  }

  @RequirePermissions('compliance.manage')
  @Post(':id/verify')
  verify(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rulesService.verify(user, id);
  }

  @RequirePermissions('compliance.manage')
  @Post(':id/retire')
  retire(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rulesService.retire(user, id);
  }
}

@Controller('compliance-events')
export class ComplianceEventsController {
  constructor(
    private readonly eventsService: ComplianceEventsService,
    private readonly engine: ComplianceEngineService,
  ) {}

  @RequirePermissions('compliance.manage')
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('dueBefore') dueBefore?: string,
    @Query('dueAfter') dueAfter?: string,
  ) {
    return this.eventsService.list(user.organizationId, { clientId, status, dueBefore, dueAfter });
  }

  @RequirePermissions('compliance.manage')
  @Post(':id/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.complete(user, id);
  }

  @RequirePermissions('compliance.manage')
  @Post(':id/waive')
  waive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.waive(user, id);
  }

  @RequirePermissions('compliance.manage')
  @Post('generate-now')
  async generateNow(@CurrentUser() user: AuthenticatedUser) {
    const summary = await this.engine.generateForOrganization(user.organizationId);
    await this.engine.refreshStatuses();
    return summary;
  }
}
