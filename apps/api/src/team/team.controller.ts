import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TeamService } from './team.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @RequirePermissions('team.manage')
  @Get('roles')
  listRoles() {
    return this.teamService.listRoles();
  }

  @RequirePermissions('team.manage')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.teamService.summary(user.organizationId);
  }

  @RequirePermissions('team.manage')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.teamService.list(user.organizationId);
  }

  @RequirePermissions('team.manage')
  @Post('invite')
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteMemberDto) {
    return this.teamService.invite(user, dto);
  }

  @RequirePermissions('team.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.teamService.updateMember(user, id, dto);
  }
}
