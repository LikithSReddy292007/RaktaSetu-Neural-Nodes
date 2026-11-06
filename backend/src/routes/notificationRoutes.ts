import { Router } from 'express';
import { getUserNotifications, markAsRead } from '../controllers/notificationController.js';

const router = Router();

router.get('/', getUserNotifications);
router.patch('/:id/read', markAsRead);

export default router;

