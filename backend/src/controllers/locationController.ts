import { Request, Response } from 'express';
import { z } from 'zod';
import { DataStore } from '../services/store.js';

export const locationUpdateSchema = z.object({
  request_id: z.string().min(1),
  user_id: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

export async function postLocationUpdate(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id || req.body.user_id || 'anonymous_tracker';
  const { request_id, lat, lng, heading, speed } = req.body;

  const bloodRequest = await DataStore.getRequest(request_id);
  if (!bloodRequest) {
    res.status(404).json({ success: false, message: 'Active request not found.' });
    return;
  }

  // Only allow active or accepted requests
  if (!['matching', 'accepted', 'in_progress'].includes(bloodRequest.status)) {
    res.status(400).json({ success: false, message: 'Location tracking is only active during active requests.' });
    return;
  }

  await DataStore.updateLiveLocation({
    request_id,
    user_id: userId,
    lat,
    lng,
    heading,
    speed,
    updated_at: Date.now(),
  });

  res.status(200).json({ success: true, message: 'Live location recorded.' });
}

export async function getLiveLocation(req: Request, res: Response): Promise<void> {
  const { requestId, userId } = req.params;

  const location = await DataStore.getLiveLocation(requestId, userId);
  if (!location) {
    res.status(404).json({ success: false, message: 'No live location found for this user/request.' });
    return;
  }

  res.status(200).json({ success: true, data: location });
}
