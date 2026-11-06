import { Router } from 'express';
import { postLocationUpdate, getLiveLocation, locationUpdateSchema } from '../controllers/locationController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/update', validateBody(locationUpdateSchema), postLocationUpdate);
router.get('/:requestId', getLiveLocation);
router.get('/:requestId/:userId', getLiveLocation);

export default router;

