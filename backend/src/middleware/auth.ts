import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
    
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Generate a test JWT token for development
export function generateTestToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
  return jwt.sign({ userId, email }, secret, { expiresIn: '30d' });
}

