import { Router } from 'express';
import { sendMessage, getMessages, sendMessageSchema } from '../controllers/chatController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/:requestId', optionalAuth, getMessages);
router.post('/:requestId', optionalAuth, validateBody(sendMessageSchema), sendMessage);

export default router;

