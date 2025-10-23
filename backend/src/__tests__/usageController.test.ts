import { Request, Response } from 'express';
import { getUserUsage, getUserEntitlements } from '../controllers/usage.controller';
import { emailSafetyService } from '../services/emailSafety.service';
import { pool } from '../config/database';

// Mock dependencies
jest.mock('../services/emailSafety.service');
jest.mock('../config/database');

describe('Usage Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      user: { id: 'test-user' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getUserUsage', () => {
    it('should return usage statistics for valid user', async () => {
      const mockUsage = {
        hourly: 5,
        daily: 25,
        monthly: 150,
      };

      const mockEntitlements = {
        max_recipients_per_message: 10,
        max_emails_per_hour: 50,
        max_emails_per_day: 200,
        max_attachment_size_mb: 10,
        plan_type: 'pro',
      };

      const mockMonthlyUsage = {
        emails_sent: 150,
        messages_sent: 300,
        recipients_contacted: 450,
      };

      (emailSafetyService.getUserUsage as jest.Mock).mockResolvedValue(mockUsage);
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockEntitlements] })
        .mockResolvedValueOnce({ rows: [mockMonthlyUsage] });

      await getUserUsage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        current: mockUsage,
        limits: {
          recipients_per_message: 10,
          emails_per_hour: 50,
          emails_per_day: 200,
          attachment_size_mb: 10,
        },
        monthly: {
          emails_sent: 150,
          messages_sent: 300,
          recipients_contacted: 450,
        },
        plan: {
          type: 'pro',
          billing_cycle: undefined,
          expires_at: undefined,
        },
      });
    });

    it('should handle missing user ID', async () => {
      mockRequest.user = undefined;

      await getUserUsage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User ID not found',
      });
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getUserUsage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get usage information',
      });
    });
  });

  describe('getUserEntitlements', () => {
    it('should return user entitlements', async () => {
      const mockEntitlements = {
        plan_type: 'pro',
        max_accounts: 5,
        max_messages_per_month: 1000,
        max_recipients_per_message: 10,
        max_emails_per_hour: 50,
        max_emails_per_day: 200,
        max_attachment_size_mb: 10,
        features: { webhooks: true, analytics: true },
        billing_cycle: 'monthly',
        trial_ends_at: null,
        expires_at: null,
        is_active: true,
      };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockEntitlements] });

      await getUserEntitlements(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockEntitlements);
    });

    it('should return default entitlements for new user', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getUserEntitlements(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        plan_type: 'free',
        max_accounts: 1,
        max_messages_per_month: 100,
        max_recipients_per_message: 10,
        max_emails_per_hour: 50,
        max_emails_per_day: 20,
        max_attachment_size_mb: 10,
        features: {},
        billing_cycle: 'monthly',
        trial_ends_at: null,
        expires_at: null,
        is_active: true,
      });
    });

    it('should handle missing user ID', async () => {
      mockRequest.user = undefined;

      await getUserEntitlements(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User ID not found',
      });
    });

    it('should handle database errors', async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getUserEntitlements(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get entitlements',
      });
    });
  });
});
