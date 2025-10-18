import { Router, Response } from 'express';
import { generateTestToken } from '../middleware/auth';

const router = Router();

/**
 * Login endpoint - generates JWT token
 */
router.post('/login', (req, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    // Generate JWT token
    const token = generateTestToken(userId, email);

    res.json({ 
      success: true,
      token,
      user: {
        id: userId,
        email
      },
      message: 'Login successful'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * Test token endpoint for development
 */
router.post('/test-token', (req, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    // Generate JWT token
    const token = generateTestToken(userId, email);

    res.json({ 
      success: true,
      token,
      user: {
        id: userId,
        email
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;

