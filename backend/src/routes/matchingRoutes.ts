import { Router } from 'express';
import { getMatchesForRequest } from '../controllers/matchingController.js';

const router = Router();

router.get('/:requestId', getMatchesForRequest);

export default router;

