import { Router } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  acceptRequest,
  skipRequest,
  verifyRequest,
  getNearbyAlertForDonor,
  terminateRequest,
  completeRequest,
  createRequestSchema,
} from '../controllers/requestController.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/nearby-for-donor', optionalAuth, getNearbyAlertForDonor);
router.post('/', optionalAuth, validateBody(createRequestSchema), createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/:id/verify', authenticate, verifyRequest);
router.patch('/:id/status', authenticate, updateRequestStatus);
router.post('/:id/accept', authenticate, acceptRequest);
router.post('/:id/terminate', optionalAuth, terminateRequest);
router.post('/:id/complete', optionalAuth, completeRequest);
router.post('/:id/skip', optionalAuth, skipRequest);

export default router;
