import { Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NewsService } from './news.service.js';
import { ListNewsDto } from './dto/list-news.dto.js';

// No @RequirePermissions here — news is informational and read-only, so any
// authenticated user (the global JwtAuthGuard still applies) can view it,
// same as e.g. notification listing.
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  list(@Query() query: ListNewsDto) {
    return this.newsService.list({ category: query.category, search: query.search });
  }

  // Manual refresh, same "run now" pattern as Automations — bypasses the
  // cache TTL without needing to wait, for demo/testing.
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  @Post('refresh')
  refresh() {
    return this.newsService.forceRefresh();
  }
}
