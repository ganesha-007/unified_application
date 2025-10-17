import { Router, Response } from 'express';

const router = Router();

/**
 * Simple login endpoint - no JWT required
 */
router.post('/login', (req, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'userId and email are required' 
      });
    }

    // Return success without token
    res.json({ 
      success: true,
      userId,
      email,
      message: 'Login successful - no authentication required'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;

