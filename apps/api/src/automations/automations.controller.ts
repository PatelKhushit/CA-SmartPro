import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AutomationsService } from './automations.service.js';
import { AutomationsEngineService } from './automations-engine.service.js';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation-rule.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('automations')
export class AutomationsController {
  constructor(
    private readonly automationsService: AutomationsService,
    private readonly engine: AutomationsEngineService,
  ) {}

  @RequirePermissions('automations.view')
  @Get('executions')
  listExecutions(@CurrentUser() user: AuthenticatedUser, @Query('ruleId') ruleId?: string) {
    return this.automationsService.listExecutions(user.organizationId, ruleId);
  }

  @RequirePermissions('automations.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.automationsService.list(user.organizationId);
  }

  @RequirePermissions('automations.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.automationsService.get(user.organizationId, id);
  }

  @RequirePermissions('automations.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAutomationRuleDto) {
    return this.automationsService.create(user, dto);
  }

  @RequirePermissions('automations.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.automationsService.update(user, id, dto);
  }

  @RequirePermissions('automations.manage')
  @Post(':id/enable')
  enable(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.automationsService.setEnabled(user, id, true);
  }

  @RequirePermissions('automations.manage')
  @Post(':id/pause')
  pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.automationsService.setEnabled(user, id, false);
  }

  // Manual trigger for testing/demo — the org doesn't have to wait up to 15
  // minutes for the scheduled cron tick to see a rule fire.
  @RequirePermissions('automations.manage')
  @Post('run-now')
  async runNow(@CurrentUser() user: AuthenticatedUser) {
    const executionsCreated = await this.engine.runForOrganization(user.organizationId);
    return { executionsCreated };
  }
}
