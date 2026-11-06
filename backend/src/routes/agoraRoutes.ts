import { Router } from 'express';
import { createAgoraToken, agoraTokenSchema } from '../controllers/agoraController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/token', validateBody(agoraTokenSchema), createAgoraToken);

export default router;

