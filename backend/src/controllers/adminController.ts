import { Request, Response } from 'express';
import { DataStore } from '../services/store.js';

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  const users = await DataStore.getAllUsers();
  const requests = await DataStore.getAllRequests();
  const donors = users.filter((u) => u.role === 'donor');
  const availableDonors = donors.filter((d) => d.is_available);
  const verifiedDonors = donors.filter((d) => d.is_verified);

  const pendingVerificationRequests = requests.filter(
    (r) => r.status === 'pending_verification' || r.verification_status === 'pending'
  );
  const activeRequests = requests.filter((r) =>
    ['pending', 'matching', 'accepted', 'in_progress', 'verified'].includes(r.status)
  );
  const fulfilledRequests = requests.filter((r) => r.status === 'fulfilled');

  // Distribution by blood group
  const bloodGroupDistribution: Record<string, { donors: number; requests: number }> = {};
  for (const group of ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-']) {
    bloodGroupDistribution[group] = {
      donors: donors.filter((d) => d.blood_group === group).length,
      requests: requests.filter((r) => r.blood_group === group).length,
    };
  }

  res.status(200).json({
    success: true,
    data: {
      total_users: users.length,
      total_donors: donors.length,
      available_donors: availableDonors.length,
      verified_donors: verifiedDonors.length,
      total_requests: requests.length,
      pending_verifications: pendingVerificationRequests.length,
      active_requests: activeRequests.length,
      fulfilled_requests: fulfilledRequests.length,
      blood_group_distribution: bloodGroupDistribution,
    },
  });
}

export async function getAdminUsers(req: Request, res: Response): Promise<void> {
  const users = await DataStore.getAllUsers();
  res.status(200).json({ success: true, count: users.length, data: users });
}

export async function verifyDonor(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await DataStore.getUser(id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  user.is_verified = true;
  user.updated_at = new Date().toISOString();
  await DataStore.saveUser(user);

  res.status(200).json({ success: true, message: `Donor ${user.full_name} is now verified.`, data: user });
}

export async function clearAllDatabaseEntries(req: Request, res: Response): Promise<void> {
  const result = await DataStore.clearAllDatabaseEntries();
  res.status(200).json({ success: true, ...result });
}
