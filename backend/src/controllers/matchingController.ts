import { Request, Response } from 'express';
import { DataStore } from '../services/store.js';
import { findMatchingDonors } from '../services/matchingService.js';

export async function getMatchesForRequest(req: Request, res: Response): Promise<void> {
  const { requestId } = req.params;
  const { radiusKm } = req.query;

  const request = await DataStore.getRequest(requestId);
  if (!request) {
    res.status(404).json({ success: false, message: 'Blood request not found.' });
    return;
  }

  const allDonors = await DataStore.getAllDonors();
  const maxRadius = radiusKm ? parseFloat(radiusKm as string) : 50;

  const matches = findMatchingDonors(request, allDonors, maxRadius);

  res.status(200).json({
    success: true,
    count: matches.length,
    request: {
      id: request.id,
      patient_name: request.patient_name,
      blood_group: request.blood_group,
      hospital: request.hospital,
      location: request.location,
      urgency: request.urgency,
      coordinates: request.coordinates,
    },
    data: matches,
  });
}

