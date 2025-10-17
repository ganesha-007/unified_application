import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getEntitlements } from '../config/pricing';
import { pool } from '../config/database';

/**
 * Middleware to check if user has access to a specific provider
 */
export function requireEntitlement(provider: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const entitlements = await getEntitlements(req.user.id, pool);
      
      if (!entitlements[provider]) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `You don't have access to ${provider}. Please upgrade your plan.`,
          requiredPlan: 'scale',
          currentPlan: 'growth' // TODO: Get actual plan from database
        });
      }

      next();
    } catch (error) {
      console.error('Entitlement check error:', error);
      return res.status(500).json({ error: 'Failed to check entitlements' });
    }
  };
}

