import { Request, Response } from 'express';
import { sendOutlookMessage } from '../controllers/outlook.controller';
import { emailSafetyService } from '../services/emailSafety.service';
import { pool } from '../config/database';

// Mock dependencies
jest.mock('../services/emailSafety.service');
jest.mock('../config/database');

describe('Outlook Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      user: { id: 'test-user' },
      params: { accountId: '1', chatId: 'test-chat' },
      body: {
        body: 'Test message',
        subject: 'Test Subject',
        to: ['test@example.com'],
        attachments: [],
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('sendOutlookMessage', () => {
    it('should send message when safety check passes', async () => {
      // Mock safety check to pass
      (emailSafetyService.checkEmailSafety as jest.Mock).mockResolvedValue({
        allowed: true,
        limits: { recipients: 10, hourly: 50, daily: 200 },
      });

      // Mock database operations
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getOutlookCredentials
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // resolveAccountId
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // chat lookup

      // Mock Microsoft Graph API (this would need to be mocked in real implementation)
      const mockGraphClient = {
        api: jest.fn().mockReturnValue({
          post: jest.fn().mockResolvedValue({}),
        }),
      };

      // This test would need more mocking for the actual Graph API calls
      // For now, we'll test the safety check integration
      await sendOutlookMessage(mockRequest as Request, mockResponse as Response);

      expect(emailSafetyService.checkEmailSafety).toHaveBeenCalledWith({
        userId: 'test-user',
        accountId: 1,
        provider: 'outlook',
        recipients: expect.any(Array),
        subject: 'Test Subject',
        body: 'Test message',
        attachments: [],
      });
    });

    it('should reject message when safety check fails', async () => {
      // Mock safety check to fail
      (emailSafetyService.checkEmailSafety as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Rate limit exceeded',
        retryAfter: 3600,
        limits: { recipients: 10, hourly: 50, daily: 200 },
      });

      // Mock database operations
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getOutlookCredentials
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // resolveAccountId

      await sendOutlookMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email blocked by safety system',
        reason: 'Rate limit exceeded',
        retryAfter: 3600,
        limits: { recipients: 10, hourly: 50, daily: 200 },
      });
    });

    it('should handle missing user ID', async () => {
      mockRequest.user = undefined;

      await sendOutlookMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User ID not found',
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (pool.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await sendOutlookMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.any(String),
        details: expect.any(String),
      });
    });
  });
});
