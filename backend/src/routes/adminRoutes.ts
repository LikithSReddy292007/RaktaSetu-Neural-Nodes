import { Router } from 'express';
import { getAdminStats, getAdminUsers, verifyDonor, clearAllDatabaseEntries } from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Secure admin routes
router.get('/stats', getAdminStats);
router.get('/users', authenticate, requireRole(['admin']), getAdminUsers);
router.patch('/verify-donor/:id', authenticate, requireRole(['admin']), verifyDonor);
router.post('/clear-all', clearAllDatabaseEntries);

export default router;

