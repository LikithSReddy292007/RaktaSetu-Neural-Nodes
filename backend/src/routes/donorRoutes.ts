import { Router } from 'express';
import {
  getDonors,
  toggleAvailability,
  submitVerification,
  registerDonor,
  donorRegistrationSchema,
} from '../controllers/donorController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', getDonors);
router.post('/register', optionalAuth, validateBody(donorRegistrationSchema), registerDonor);
router.patch('/availability', authenticate, toggleAvailability);
router.post('/verify', authenticate, submitVerification);

export default router;
