import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { emailSafetyService } from '../services/emailSafety.service';
import { pool } from '../config/database';

/**
 * Get user usage statistics
 */
export const getUserUsage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID not found' });
  }

  try {
    // Get current usage from Redis
    const currentUsage = await emailSafetyService.getUserUsage(userId);

    // Get user entitlements
    const entitlementsResult = await pool.query(
      `SELECT * FROM channels_entitlement WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    const entitlements = entitlementsResult.rows[0] || {
      max_recipients_per_message: 10,
      max_emails_per_hour: 50,
      max_emails_per_day: 200,
      max_attachment_size_mb: 10,
      plan_type: 'free'
    };

    // Get monthly usage from database
    const monthlyResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN usage_type = 'email' THEN count ELSE 0 END) as emails_sent,
         SUM(CASE WHEN usage_type = 'message' THEN count ELSE 0 END) as messages_sent,
         SUM(CASE WHEN usage_type = 'recipient' THEN count ELSE 0 END) as recipients_contacted
       FROM channels_usage 
       WHERE user_id = $1 
       AND period_start >= $2`,
      [userId, new Date(new Date().getFullYear(), new Date().getMonth(), 1)]
    );

    const monthlyUsage = monthlyResult.rows[0] || {
      emails_sent: 0,
      messages_sent: 0,
      recipients_contacted: 0
    };

    res.json({
      current: {
        hourly: currentUsage.hourly,
        daily: currentUsage.daily,
        monthly: currentUsage.monthly
      },
      limits: {
        recipients_per_message: entitlements.max_recipients_per_message,
        emails_per_hour: entitlements.max_emails_per_hour,
        emails_per_day: entitlements.max_emails_per_day,
        attachment_size_mb: entitlements.max_attachment_size_mb
      },
      monthly: {
        emails_sent: parseInt(monthlyUsage.emails_sent || '0'),
        messages_sent: parseInt(monthlyUsage.messages_sent || '0'),
        recipients_contacted: parseInt(monthlyUsage.recipients_contacted || '0')
      },
      plan: {
        type: entitlements.plan_type,
        billing_cycle: entitlements.billing_cycle,
        expires_at: entitlements.expires_at
      }
    });
  } catch (error) {
    console.error('❌ Get user usage error:', error);
    res.status(500).json({ error: 'Failed to get usage information' });
  }
};

/**
 * Get user entitlements
 */
export const getUserEntitlements = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID not found' });
  }

  try {
    const result = await pool.query(
      `SELECT 
         plan_type,
         max_accounts,
         max_messages_per_month,
         max_recipients_per_message,
         max_emails_per_hour,
         max_emails_per_day,
         max_attachment_size_mb,
         features,
         billing_cycle,
         trial_ends_at,
         expires_at,
         is_active
       FROM channels_entitlement 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
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
        is_active: true
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Get user entitlements error:', error);
    res.status(500).json({ error: 'Failed to get entitlements' });
  }
};
