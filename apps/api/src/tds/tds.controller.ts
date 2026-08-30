import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TdsService } from './tds.service.js';
import { CreateTdsProfileDto, UpdateTdsProfileDto } from './dto/tds-profile.dto.js';
import {
  CreateReturnReminderDto,
  CreateReturnTaskDto,
  CreateTdsReturnDto,
  ListTdsReturnsDto,
  UpdateTdsReturnDto,
} from './dto/tds-return.dto.js';
import { CreateCertificateDto, CreateChallanDto, UpdateCertificateDto, UpdateChallanDto } from './dto/challan-certificate.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('tds')
export class TdsController {
  constructor(private readonly tdsService: TdsService) {}

  @RequirePermissions('tds.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.tdsService.summary(user.organizationId);
  }

  @RequirePermissions('tds.view')
  @Get('profiles')
  listProfiles(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    return this.tdsService.listProfiles(user.organizationId, clientId);
  }

  @RequirePermissions('tds.manage')
  @Post('profiles')
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTdsProfileDto) {
    return this.tdsService.createProfile(user, dto);
  }

  @RequirePermissions('tds.manage')
  @Patch('profiles/:id')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTdsProfileDto) {
    return this.tdsService.updateProfile(user, id, dto);
  }

  @RequirePermissions('tds.view')
  @Get('returns')
  listReturns(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTdsReturnsDto) {
    return this.tdsService.listReturns(user.organizationId, query);
  }

  @RequirePermissions('tds.view')
  @Get('returns/:id')
  getReturn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tdsService.getReturn(user.organizationId, id);
  }

  @RequirePermissions('tds.manage')
  @Post('returns')
  createReturn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTdsReturnDto) {
    return this.tdsService.createReturn(user, dto);
  }

  @RequirePermissions('tds.manage')
  @Patch('returns/:id')
  updateReturn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTdsReturnDto) {
    return this.tdsService.updateReturn(user, id, dto);
  }

  @RequirePermissions('tds.manage')
  @Post('returns/:id/task')
  createTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateReturnTaskDto) {
    return this.tdsService.createTaskForReturn(user, id, dto);
  }

  @RequirePermissions('tds.manage')
  @Post('returns/:id/reminder')
  createReminder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateReturnReminderDto) {
    return this.tdsService.createReminderForReturn(user, id, dto);
  }

  @RequirePermissions('tds.view')
  @Get('challans')
  listChallans(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    return this.tdsService.listChallans(user.organizationId, clientId);
  }

  @RequirePermissions('tds.manage')
  @Post('challans')
  createChallan(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChallanDto) {
    return this.tdsService.createChallan(user, dto);
  }

  @RequirePermissions('tds.manage')
  @Patch('challans/:id')
  updateChallan(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateChallanDto) {
    return this.tdsService.updateChallan(user, id, dto);
  }

  @RequirePermissions('tds.view')
  @Get('certificates')
  listCertificates(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    return this.tdsService.listCertificates(user.organizationId, clientId);
  }

  @RequirePermissions('tds.manage')
  @Post('certificates')
  createCertificate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCertificateDto) {
    return this.tdsService.createCertificate(user, dto);
  }

  @RequirePermissions('tds.manage')
  @Patch('certificates/:id')
  updateCertificate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCertificateDto) {
    return this.tdsService.updateCertificate(user, id, dto);
  }
}
