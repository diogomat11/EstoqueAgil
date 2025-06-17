import { Router } from 'express';
import { pool } from '../database';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
