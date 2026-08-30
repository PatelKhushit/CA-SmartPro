import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UdinService } from './udin.service.js';
import { CreateUdinDto } from './dto/create-udin.dto.js';
import { UpdateUdinDto } from './dto/update-udin.dto.js';
import { ListUdinDto } from './dto/list-udin.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('udin')
export class UdinController {
  constructor(private readonly udinService: UdinService) {}

  @RequirePermissions('udin.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.udinService.summary(user.organizationId);
  }

  @RequirePermissions('udin.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListUdinDto) {
    return this.udinService.list(user.organizationId, query);
  }

  @RequirePermissions('udin.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.udinService.get(user.organizationId, id);
  }

  @RequirePermissions('udin.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUdinDto) {
    return this.udinService.create(user, dto);
  }

  @RequirePermissions('udin.manage')
  @Post(':id/copy')
  copy(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.udinService.copy(user, id);
  }

  @RequirePermissions('udin.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUdinDto) {
    return this.udinService.update(user, id, dto);
  }
}
