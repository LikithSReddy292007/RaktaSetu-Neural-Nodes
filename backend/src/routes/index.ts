import { Router } from 'express';
import authRoutes from './authRoutes.js';
import donorRoutes from './donorRoutes.js';
import requestRoutes from './requestRoutes.js';
import matchingRoutes from './matchingRoutes.js';
import agoraRoutes from './agoraRoutes.js';
import locationRoutes from './locationRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import adminRoutes from './adminRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/donors', donorRoutes);
router.use('/requests', requestRoutes);
router.use('/matching', matchingRoutes);
router.use('/agora', agoraRoutes);
router.use('/location', locationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);

export default router;

