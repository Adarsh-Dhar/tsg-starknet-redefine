import { Router } from 'express';

const router = Router();

// Placeholder route for /api/vault
router.get('/', (req, res) => {
  res.json({ message: 'Vault route is working!' });
});

export default router;
