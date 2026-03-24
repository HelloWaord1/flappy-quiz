import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const leadSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email(),
  score: z.number().optional(),
  balance: z.number().optional(),
  phase: z.number().optional(),
  answers: z.record(z.string(), z.any()).optional(),
});

router.post('/', async (req, res) => {
  try {
    const lead = leadSchema.parse(req.body);
    const webhookUrl = process.env.WEBHOOK_URL;

    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, timestamp: new Date().toISOString() }),
      }).catch(err => console.error('Webhook error:', err.message));
    }

    console.log('Lead received:', lead.name, lead.phone);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
