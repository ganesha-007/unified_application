import Redis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';
import { pool } from '../config/database';
import crypto from 'crypto';

export interface EmailSafetyConfig {
  maxRecipientsPerMessage: number;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
  cooldownPerRecipient: number; // seconds
  cooldownPerDomain: number; // seconds
  maxAttachmentSize: number; // MB
  allowedAttachmentTypes: string[];
  blockedAttachmentTypes: string[];
}

export interface EmailRequest {
  userId: string;
  accountId: number;
  provider: string;
  recipients: string[];
  subject: string;
  body: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
  }>;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  limits: {
    recipients: number;
    hourly: number;
    daily: number;
  };
}

class EmailSafetyService {
  private redis: Redis;
  private emailQueue: Queue;
  private worker: Worker;
  private defaultConfig: EmailSafetyConfig;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
    });

    this.emailQueue = new Queue('email-safety', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.worker = new Worker('email-safety', this.processEmailJob.bind(this), {
      connection: this.redis,
      concurrency: 5,
    });

    this.defaultConfig = {
      maxRecipientsPerMessage: 10,
      maxEmailsPerHour: 50,
      maxEmailsPerDay: 200,
      cooldownPerRecipient: 120, // 2 minutes
      cooldownPerDomain: 60, // 1 minute
      maxAttachmentSize: 10, // MB
      allowedAttachmentTypes: [
        'image/*',
        'application/pdf',
        'text/*',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      blockedAttachmentTypes: [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program',
        'application/x-msi',
        'application/x-ms-shortcut',
        'application/x-ms-shortcut',
        'application/x-ms-wim',
        'application/x-ms-wim',
        'application/x-ms-wim',
        'application/x-ms-wim',
      ],
    };
  }

  /**
   * Check if an email request is allowed based on rate limits and safety rules
   */
  async checkEmailSafety(request: EmailRequest): Promise<RateLimitResult> {
    try {
      // Get user entitlements
      const entitlements = await this.getUserEntitlements(request.userId);
      
      // Check recipient count
      if (request.recipients.length > entitlements.max_recipients_per_message) {
        return {
          allowed: false,
          reason: `Too many recipients. Maximum allowed: ${entitlements.max_recipients_per_message}`,
          limits: {
            recipients: entitlements.max_recipients_per_message,
            hourly: entitlements.max_emails_per_hour,
            daily: entitlements.max_emails_per_day,
          },
        };
      }

      // Check attachment safety
      const attachmentCheck = await this.checkAttachmentSafety(request.attachments || [], entitlements);
      if (!attachmentCheck.allowed) {
        return {
          allowed: false,
          reason: attachmentCheck.reason,
          limits: {
            recipients: entitlements.max_recipients_per_message,
            hourly: entitlements.max_emails_per_hour,
            daily: entitlements.max_emails_per_day,
          },
        };
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimits(request, entitlements);
      if (!rateLimitCheck.allowed) {
        return {
          allowed: false,
          reason: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter,
          limits: {
            recipients: entitlements.max_recipients_per_message,
            hourly: entitlements.max_emails_per_hour,
            daily: entitlements.max_emails_per_day,
          },
        };
      }

      return {
        allowed: true,
        limits: {
          recipients: entitlements.max_recipients_per_message,
          hourly: entitlements.max_emails_per_hour,
          daily: entitlements.max_emails_per_day,
        },
      };
    } catch (error) {
      console.error('❌ Email safety check failed:', error);
      return {
        allowed: false,
        reason: 'Safety check failed. Please try again later.',
        limits: {
          recipients: this.defaultConfig.maxRecipientsPerMessage,
          hourly: this.defaultConfig.maxEmailsPerHour,
          daily: this.defaultConfig.maxEmailsPerDay,
        },
      };
    }
  }

  /**
   * Queue an email for processing with safety checks
   */
  async queueEmail(request: EmailRequest): Promise<string> {
    const job = await this.emailQueue.add('send-email', request, {
      priority: this.getEmailPriority(request),
      delay: this.calculateDelay(request),
    });

    return job.id!;
  }

  /**
   * Get user entitlements from database
   */
  private async getUserEntitlements(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM channels_entitlement WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default free plan
      return {
        max_recipients_per_message: this.defaultConfig.maxRecipientsPerMessage,
        max_emails_per_hour: this.defaultConfig.maxEmailsPerHour,
        max_emails_per_day: this.defaultConfig.maxEmailsPerDay,
        max_attachment_size_mb: this.defaultConfig.maxAttachmentSize,
      };
    }

    return result.rows[0];
  }

  /**
   * Check attachment safety
   */
  private async checkAttachmentSafety(
    attachments: Array<{ name: string; type: string; size: number }>,
    entitlements: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!attachments || attachments.length === 0) {
      return { allowed: true };
    }

    // Check attachment count
    if (attachments.length > 5) {
      return { allowed: false, reason: 'Too many attachments. Maximum allowed: 5' };
    }

    // Check each attachment
    for (const attachment of attachments) {
      // Check file size
      const sizeMB = attachment.size / (1024 * 1024);
      if (sizeMB > entitlements.max_attachment_size_mb) {
        return {
          allowed: false,
          reason: `Attachment "${attachment.name}" is too large. Maximum size: ${entitlements.max_attachment_size_mb}MB`,
        };
      }

      // Check file type
      const isBlocked = this.defaultConfig.blockedAttachmentTypes.some(blockedType => {
        if (blockedType.endsWith('/*')) {
          return attachment.type.startsWith(blockedType.slice(0, -1));
        }
        return attachment.type === blockedType;
      });

      if (isBlocked) {
        return {
          allowed: false,
          reason: `Attachment type "${attachment.type}" is not allowed`,
        };
      }

      // Check if type is allowed
      const isAllowed = this.defaultConfig.allowedAttachmentTypes.some(allowedType => {
        if (allowedType.endsWith('/*')) {
          return attachment.type.startsWith(allowedType.slice(0, -1));
        }
        return attachment.type === allowedType;
      });

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Attachment type "${attachment.type}" is not allowed`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check rate limits using Redis
   */
  private async checkRateLimits(request: EmailRequest, entitlements: any): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const hourKey = `email:hourly:${request.userId}:${Math.floor(now / (1000 * 60 * 60))}`;
    const dayKey = `email:daily:${request.userId}:${Math.floor(now / (1000 * 60 * 60 * 24))}`;

    // Check hourly limit
    const hourlyCount = await this.redis.get(hourKey);
    if (hourlyCount && parseInt(hourlyCount) >= entitlements.max_emails_per_hour) {
      return {
        allowed: false,
        reason: `Hourly email limit exceeded. Limit: ${entitlements.max_emails_per_hour}`,
        retryAfter: 3600, // 1 hour
      };
    }

    // Check daily limit
    const dailyCount = await this.redis.get(dayKey);
    if (dailyCount && parseInt(dailyCount) >= entitlements.max_emails_per_day) {
      return {
        allowed: false,
        reason: `Daily email limit exceeded. Limit: ${entitlements.max_emails_per_day}`,
        retryAfter: 86400, // 24 hours
      };
    }

    // Check recipient cooldowns
    for (const recipient of request.recipients) {
      const recipientKey = `email:cooldown:recipient:${request.userId}:${recipient}`;
      const cooldownEnd = await this.redis.get(recipientKey);
      
      if (cooldownEnd && parseInt(cooldownEnd) > now) {
        const retryAfter = Math.ceil((parseInt(cooldownEnd) - now) / 1000);
        return {
          allowed: false,
          reason: `Recipient "${recipient}" is in cooldown period`,
          retryAfter,
        };
      }
    }

    // Check domain cooldowns
    const domains = new Set(request.recipients.map(r => r.split('@')[1]));
    for (const domain of domains) {
      const domainKey = `email:cooldown:domain:${request.userId}:${domain}`;
      const cooldownEnd = await this.redis.get(domainKey);
      
      if (cooldownEnd && parseInt(cooldownEnd) > now) {
        const retryAfter = Math.ceil((parseInt(cooldownEnd) - now) / 1000);
        return {
          allowed: false,
          reason: `Domain "${domain}" is in cooldown period`,
          retryAfter,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Process email job
   */
  private async processEmailJob(job: Job<EmailRequest>) {
    const { userId, accountId, provider, recipients, subject, body, attachments } = job.data;

    try {
      console.log(`📧 Processing email job for user ${userId}`);

      // Update usage counters
      await this.updateUsageCounters(userId, accountId, provider, recipients);

      // Set cooldowns
      await this.setCooldowns(userId, recipients);

      // Here you would call the actual email sending service
      // This is just a placeholder - the actual implementation would depend on the provider
      console.log(`✅ Email queued successfully for ${recipients.length} recipients`);

      return { success: true, recipients: recipients.length };
    } catch (error) {
      console.error('❌ Email job failed:', error);
      throw error;
    }
  }

  /**
   * Update usage counters in Redis and database
   */
  private async updateUsageCounters(
    userId: string,
    accountId: number,
    provider: string,
    recipients: string[]
  ) {
    const now = Date.now();
    const hourKey = `email:hourly:${userId}:${Math.floor(now / (1000 * 60 * 60))}`;
    const dayKey = `email:daily:${userId}:${Math.floor(now / (1000 * 60 * 60 * 24))}`;

    // Update Redis counters
    await this.redis.incr(hourKey);
    await this.redis.expire(hourKey, 3600); // 1 hour

    await this.redis.incr(dayKey);
    await this.redis.expire(dayKey, 86400); // 24 hours

    // Update database usage
    const periodStart = new Date(Math.floor(now / (1000 * 60 * 60)) * 1000 * 60 * 60);
    const periodEnd = new Date(periodStart.getTime() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO channels_usage (user_id, account_id, provider, usage_type, count, period_start, period_end, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, account_id, provider, usage_type, period_start)
       DO UPDATE SET count = channels_usage.count + 1, updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        accountId,
        provider,
        'email',
        1,
        periodStart,
        periodEnd,
        JSON.stringify({ recipients: recipients.length }),
      ]
    );
  }

  /**
   * Set cooldowns for recipients and domains
   */
  private async setCooldowns(userId: string, recipients: string[]) {
    const now = Date.now();
    const cooldownRecipient = this.defaultConfig.cooldownPerRecipient * 1000;
    const cooldownDomain = this.defaultConfig.cooldownPerDomain * 1000;

    for (const recipient of recipients) {
      const recipientKey = `email:cooldown:recipient:${userId}:${recipient}`;
      await this.redis.setex(recipientKey, this.defaultConfig.cooldownPerRecipient, now + cooldownRecipient);

      const domain = recipient.split('@')[1];
      const domainKey = `email:cooldown:domain:${userId}:${domain}`;
      await this.redis.setex(domainKey, this.defaultConfig.cooldownPerDomain, now + cooldownDomain);
    }
  }

  /**
   * Get email priority based on user plan
   */
  private getEmailPriority(request: EmailRequest): number {
    // Higher number = higher priority
    // Free: 1, Basic: 2, Pro: 3, Enterprise: 4
    return 1; // Default priority
  }

  /**
   * Calculate delay based on rate limits
   */
  private calculateDelay(request: EmailRequest): number {
    // No delay by default, but could implement smart queuing
    return 0;
  }

  /**
   * Get current usage for a user
   */
  async getUserUsage(userId: string): Promise<{
    hourly: number;
    daily: number;
    monthly: number;
  }> {
    const now = Date.now();
    const hourKey = `email:hourly:${userId}:${Math.floor(now / (1000 * 60 * 60))}`;
    const dayKey = `email:daily:${userId}:${Math.floor(now / (1000 * 60 * 60 * 24))}`;

    const [hourly, daily] = await Promise.all([
      this.redis.get(hourKey) || '0',
      this.redis.get(dayKey) || '0',
    ]);

    // Get monthly usage from database
    const monthlyResult = await pool.query(
      `SELECT SUM(count) as total FROM channels_usage 
       WHERE user_id = $1 AND usage_type = 'email' 
       AND period_start >= $2`,
      [userId, new Date(new Date().getFullYear(), new Date().getMonth(), 1)]
    );

    return {
      hourly: parseInt(hourly || '0'),
      daily: parseInt(daily || '0'),
      monthly: parseInt(monthlyResult.rows[0]?.total || '0'),
    };
  }

  /**
   * Cleanup method
   */
  async close() {
    await this.worker.close();
    await this.emailQueue.close();
    await this.redis.quit();
  }
}

export const emailSafetyService = new EmailSafetyService();
