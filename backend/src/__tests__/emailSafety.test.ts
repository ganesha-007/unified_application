import { emailSafetyService, EmailRequest } from '../services/emailSafety.service';
import { pool } from '../config/database';

// Mock the database
jest.mock('../config/database');

describe('Email Safety Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkEmailSafety', () => {
    it('should allow valid email requests within limits', async () => {
      const mockEntitlements = {
        max_recipients_per_message: 10,
        max_emails_per_hour: 50,
        max_emails_per_day: 200,
        max_attachment_size_mb: 10,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockEntitlements],
      });

      const request: EmailRequest = {
        userId: 'test-user',
        accountId: 1,
        provider: 'outlook',
        recipients: ['test@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
        attachments: [],
      };

      const result = await emailSafetyService.checkEmailSafety(request);

      expect(result.allowed).toBe(true);
      expect(result.limits).toEqual({
        recipients: 10,
        hourly: 50,
        daily: 200,
      });
    });

    it('should reject requests with too many recipients', async () => {
      const mockEntitlements = {
        max_recipients_per_message: 5,
        max_emails_per_hour: 50,
        max_emails_per_day: 200,
        max_attachment_size_mb: 10,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockEntitlements],
      });

      const request: EmailRequest = {
        userId: 'test-user',
        accountId: 1,
        provider: 'outlook',
        recipients: ['test1@example.com', 'test2@example.com', 'test3@example.com', 'test4@example.com', 'test5@example.com', 'test6@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
        attachments: [],
      };

      const result = await emailSafetyService.checkEmailSafety(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Too many recipients');
    });

    it('should reject requests with blocked attachment types', async () => {
      const mockEntitlements = {
        max_recipients_per_message: 10,
        max_emails_per_hour: 50,
        max_emails_per_day: 200,
        max_attachment_size_mb: 10,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockEntitlements],
      });

      const request: EmailRequest = {
        userId: 'test-user',
        accountId: 1,
        provider: 'outlook',
        recipients: ['test@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
        attachments: [
          {
            name: 'malware.exe',
            type: 'application/x-executable',
            size: 1024,
          },
        ],
      };

      const result = await emailSafetyService.checkEmailSafety(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('should reject requests with oversized attachments', async () => {
      const mockEntitlements = {
        max_recipients_per_message: 10,
        max_emails_per_hour: 50,
        max_emails_per_day: 200,
        max_attachment_size_mb: 5,
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockEntitlements],
      });

      const request: EmailRequest = {
        userId: 'test-user',
        accountId: 1,
        provider: 'outlook',
        recipients: ['test@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
        attachments: [
          {
            name: 'large-file.pdf',
            type: 'application/pdf',
            size: 10 * 1024 * 1024, // 10MB
          },
        ],
      };

      const result = await emailSafetyService.checkEmailSafety(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('too large');
    });

    it('should handle database errors gracefully', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request: EmailRequest = {
        userId: 'test-user',
        accountId: 1,
        provider: 'outlook',
        recipients: ['test@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
        attachments: [],
      };

      const result = await emailSafetyService.checkEmailSafety(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Safety check failed');
    });
  });

  describe('getUserUsage', () => {
    it('should return current usage statistics', async () => {
      const result = await emailSafetyService.getUserUsage('test-user');

      expect(result).toHaveProperty('hourly');
      expect(result).toHaveProperty('daily');
      expect(result).toHaveProperty('monthly');
      expect(typeof result.hourly).toBe('number');
      expect(typeof result.daily).toBe('number');
      expect(typeof result.monthly).toBe('number');
    });
  });
});
