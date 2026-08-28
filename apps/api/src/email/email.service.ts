import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Real interface, stub transport. No transactional email provider is wired
 * yet (Phase 2 — see docs/STATUS.md and section 23 of the product spec).
 * Until EMAIL_PROVIDER/EMAIL_API_KEY are configured, messages are logged
 * server-side instead of sent, and callers get an explicit "not configured"
 * outcome rather than a fake "sent" result.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('EMAIL_PROVIDER') && this.config.get<string>('EMAIL_API_KEY'));
  }

  async send(message: EmailMessage): Promise<{ delivered: boolean; reason?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `[email-not-configured] Would send to ${message.to}: "${message.subject}" — set EMAIL_PROVIDER/EMAIL_API_KEY to enable real delivery.`,
      );
      return { delivered: false, reason: 'EMAIL_PROVIDER_NOT_CONFIGURED' };
    }

    // TODO(phase-2): integrate a transactional email provider (e.g. SES/Postmark/Resend)
    // behind this same interface. Never log full message bodies containing client
    // financial/tax data in production once real sending is wired.
    this.logger.log(`Email dispatch not yet implemented for configured provider.`);
    return { delivered: false, reason: 'EMAIL_PROVIDER_NOT_IMPLEMENTED' };
  }
}
