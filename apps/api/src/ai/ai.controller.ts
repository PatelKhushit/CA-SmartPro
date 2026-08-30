import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @RequirePermissions('ai.use')
  @Get('status')
  status() {
    return { configured: this.aiService.isConfigured() };
  }

  @RequirePermissions('ai.use')
  @Get('conversations')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.listConversations(user);
  }

  @RequirePermissions('ai.use')
  @Get('conversations/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.aiService.getConversation(user, id);
  }

  @RequirePermissions('ai.use')
  @Post('conversations')
  create(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.createConversation(user);
  }

  @RequirePermissions('ai.use')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  @Post('conversations/:id/messages')
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.aiService.sendMessage(user, id, dto.text, dto.source);
  }
}
