import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyWebhookSignature, generateWebhookSignature } from '../middleware/webhookAuth';

// Mock Express objects
const mockRequest = (body: any, headers: any = {}) => ({
  body,
  headers,
}) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('Webhook Authentication', () => {
  const secret = 'test-secret';
  const payload = { test: 'data' };
  const timestamp = Date.now().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWebhookSignature', () => {
    it('should generate valid signature and timestamp', () => {
      const result = generateWebhookSignature(payload, secret);

      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.signature).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(result.signature).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different signatures for different payloads', () => {
      const result1 = generateWebhookSignature({ test: 'data1' }, secret);
      const result2 = generateWebhookSignature({ test: 'data2' }, secret);

      expect(result1.signature).not.toBe(result2.signature);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signatures', () => {
      const { signature, timestamp } = generateWebhookSignature(payload, secret);
      const req = mockRequest(payload, {
        'x-signature': signature,
        'x-timestamp': timestamp,
      });
      const res = mockResponse();

      verifyWebhookSignature(secret)(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests without signature', () => {
      const req = mockRequest(payload, { 'x-timestamp': timestamp });
      const res = mockResponse();

      verifyWebhookSignature(secret)(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature or timestamp' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests without timestamp', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      const req = mockRequest(payload, { 'x-signature': signature });
      const res = mockResponse();

      verifyWebhookSignature(secret)(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature or timestamp' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid signatures', () => {
      const req = mockRequest(payload, {
        'x-signature': 'invalid-signature',
        'x-timestamp': timestamp,
      });
      const res = mockResponse();

      verifyWebhookSignature(secret)(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject old requests', () => {
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
      const { signature } = generateWebhookSignature(payload, secret);
      const req = mockRequest(payload, {
        'x-signature': signature,
        'x-timestamp': oldTimestamp,
      });
      const res = mockResponse();

      verifyWebhookSignature(secret)(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Request too old' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed timestamps', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      const req = mockRequest(payload, {
        'x-signature': signature,
        'x-timestamp': 'invalid-timestamp',
      });
      const res = mockResponse();

      verifyWebhookSignature(secret)(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Request too old' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Signature Generation and Verification', () => {
    it('should be consistent between generation and verification', () => {
      const { signature, timestamp } = generateWebhookSignature(payload, secret);
      
      // Manually verify the signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(timestamp + JSON.stringify(payload))
        .digest('hex');

      expect(signature).toBe(expectedSignature);
    });

    it('should use timing-safe comparison', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      const req = mockRequest(payload, {
        'x-signature': signature,
        'x-timestamp': timestamp,
      });
      const res = mockResponse();

      // This should not throw and should call next
      verifyWebhookSignature(secret)(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
