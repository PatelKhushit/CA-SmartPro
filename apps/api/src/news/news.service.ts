import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
import type { NewsArticle, NewsCategory } from './news.types.js';

// Real, publicly available RSS feeds — no API key, no fake data. If a feed
// is down, it's simply skipped for that refresh (never backfilled with
// invented articles) and the others still serve.
const FEED_SOURCES: { url: string; sourceName: string }[] = [
  { url: 'https://taxguru.in/feed', sourceName: 'TaxGuru' },
  { url: 'https://www.taxscan.in/feed/', sourceName: 'Taxscan' },
  {
    url: 'https://news.google.com/rss/search?q=ICAI+OR+GST+OR+%22Income+Tax%22+OR+CBDT+OR+CBIC+India&hl=en-IN&gl=IN&ceid=IN:en',
    sourceName: 'Google News',
  },
];

const CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_ARTICLES = 80;
const FETCH_TIMEOUT_MS = 10_000;

function stripHtml(input: string | undefined): string {
  if (!input) return '';
  const text = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}

function classify(title: string, extra: string): NewsCategory {
  const text = `${title} ${extra}`.toLowerCase();
  if (/\bgst\b|goods and services tax/.test(text)) return 'GST';
  if (/\btds\b|\btcs\b|tax deducted at source/.test(text)) return 'TDS';
  if (/income tax|\bitr\b|\bcbdt\b|assessment year/.test(text)) return 'INCOME_TAX';
  if (/company law|\broc\b|\bmca\b|\bllp\b|companies act|registrar of companies/.test(text)) return 'COMPANY_LAW';
  if (/\baudit\b|assurance standard|\bsa \d/.test(text)) return 'AUDIT';
  if (/\bicai\b|chartered accountant/.test(text)) return 'ICAI';
  return 'OTHER';
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly parser = new Parser({ timeout: FETCH_TIMEOUT_MS });
  private cache: { articles: NewsArticle[]; fetchedAt: number; failedSources: string[] } | null = null;

  private async fetchOne(source: { url: string; sourceName: string }): Promise<NewsArticle[]> {
    const feed = await this.parser.parseURL(source.url);
    return (feed.items ?? []).map((item) => {
      const link = item.link ?? '';
      const title = (item.title ?? '').trim();
      const summary = stripHtml(item.contentSnippet || item.content || item.summary || '');
      const category = classify(title, `${summary} ${(item.categories ?? []).join(' ')}`);
      return {
        id: createHash('sha1').update(link || title).digest('hex'),
        title,
        link,
        sourceName: source.sourceName,
        publishedAt: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : null),
        summary,
        category,
      };
    });
  }

  private async refresh(): Promise<void> {
    const results = await Promise.allSettled(FEED_SOURCES.map((source) => this.fetchOne(source)));

    const articles: NewsArticle[] = [];
    const failedSources: string[] = [];
    const seenLinks = new Set<string>();

    results.forEach((result, i) => {
      const source = FEED_SOURCES[i];
      if (result.status === 'fulfilled') {
        for (const article of result.value) {
          if (!article.link || seenLinks.has(article.link)) continue;
          seenLinks.add(article.link);
          articles.push(article);
        }
      } else {
        failedSources.push(source.sourceName);
        this.logger.warn(`News feed unreachable: ${source.sourceName} (${source.url}) — ${result.reason?.message ?? result.reason}`);
      }
    });

    articles.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));

    this.cache = { articles: articles.slice(0, MAX_ARTICLES), fetchedAt: Date.now(), failedSources };
  }

  private async ensureFresh(): Promise<void> {
    if (!this.cache || Date.now() - this.cache.fetchedAt > CACHE_TTL_MS) {
      await this.refresh();
    }
  }

  async list(query: { category?: NewsCategory; search?: string }) {
    await this.ensureFresh();
    const cache = this.cache!;

    let items = cache.articles;
    if (query.category) {
      items = items.filter((a) => a.category === query.category);
    }
    if (query.search) {
      const needle = query.search.toLowerCase();
      items = items.filter((a) => a.title.toLowerCase().includes(needle) || a.summary.toLowerCase().includes(needle));
    }

    return {
      items,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      sources: FEED_SOURCES.map((s) => s.sourceName),
      failedSources: cache.failedSources,
    };
  }

  async forceRefresh() {
    await this.refresh();
    return this.list({});
  }
}
