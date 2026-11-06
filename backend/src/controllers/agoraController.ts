import { Request, Response } from 'express';
import { z } from 'zod';
import { generateAgoraToken } from '../services/agoraService.js';
import { DataStore } from '../services/store.js';

export const agoraTokenSchema = z.object({
  channelName: z.string().min(3),
  role: z.enum(['publisher', 'subscriber']).default('publisher'),
  uid: z.number().int().nonnegative().default(0),
});

export async function createAgoraToken(req: Request, res: Response): Promise<void> {
  const { channelName, role, uid } = req.body;

  // Channel authorization check: if channel starts with req_, verify participant
  if (channelName.startsWith('req_')) {
    const requestId = channelName.replace(/^req_/, '').split('_')[0];
    const bloodRequest = await DataStore.getRequest(requestId);
    if (bloodRequest && req.user) {
      const isRequester = bloodRequest.user_id === req.user.id;
      const isAcceptedDonor = bloodRequest.accepted_donor_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isRequester && !isAcceptedDonor && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to join this private consultation channel.',
        });
        return;
      }
    }
  }

  const tokenData = generateAgoraToken(channelName, uid, role);

  res.status(200).json({
    success: true,
    message: 'Agora RTC token generated.',
    data: tokenData,
  });
}

