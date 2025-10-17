// Pricing configuration - switch between bundled and addon modes via env var

export const PRICING_MODE = process.env.PRICING_MODE || 'bundled';

export const PLANS = {
  starter: { 
    includes: ['linkedin'], 
    limits: {} 
  },
  growth: { 
    includes: ['linkedin', 'crm'], 
    limits: {} 
  },
  scale: { 
    includes: ['linkedin', 'crm', 'whatsapp', 'instagram', 'email'], 
    limits: {} 
  },
};

export const ADDONS = {
  whatsapp: { 
    feature: 'whatsapp', 
    limits: { messagesPerMonth: 5000 } 
  },
  instagram: { 
    feature: 'instagram', 
    limits: { messagesPerMonth: 5000 } 
  },
  email: { 
    feature: 'email', 
    limits: { messagesPerMonth: 10000 } 
  },
};

// Get user entitlements based on their plan and addons
export async function getEntitlements(userId: string, db: any) {
  const plan = await getUserPlan(userId, db);
  const addons = await getActiveAddons(userId, db);
  
  const access: Record<string, boolean> = { 
    whatsapp: false, 
    instagram: false, 
    email: false 
  };

  // Grant access from plan
  if (PLANS[plan as keyof typeof PLANS]?.includes) {
    PLANS[plan as keyof typeof PLANS].includes.forEach((f: string) => {
      if (f in access) {
        access[f] = true;
      }
    });
  }

  // Grant access from addons
  addons.forEach((addon: string) => {
    if (addon in access) {
      access[addon] = true;
    }
  });

  return access;
}

async function getUserPlan(userId: string, db: any): Promise<string> {
  // TODO: Implement actual plan retrieval from database
  // For now, default to 'scale' plan to allow WhatsApp access
  return 'scale';
}

async function getActiveAddons(userId: string, db: any): Promise<string[]> {
  const result = await db.query(
    'SELECT provider FROM channels_entitlement WHERE user_id = $1 AND is_active = true AND source = $2',
    [userId, 'addon']
  );
  return result.rows.map((row: any) => row.provider);
}

