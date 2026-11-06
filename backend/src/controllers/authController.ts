import { Request, Response } from 'express';
import { z } from 'zod';
import { DataStore } from '../services/store.js';
import { BLOOD_GROUPS, USER_ROLES, UserProfile } from '../types/index.js';

export const registerSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  full_name: z.string().min(2),
  phone: z.string().min(8),
  date_of_birth: z.string(),
  role: z.enum(USER_ROLES),
  blood_group: z.enum(BLOOD_GROUPS),
  location: z.string().min(2),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export async function register(req: Request, res: Response): Promise<void> {
  const data = req.body;
  const existing = await DataStore.getUserByEmail(data.email);
  if (existing) {
    res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    return;
  }

  const userId = data.id || `user_${Date.now()}`;
  const now = new Date().toISOString();

  const newProfile: UserProfile = {
    id: userId,
    email: data.email,
    full_name: data.full_name,
    phone: data.phone,
    date_of_birth: data.date_of_birth,
    role: data.role,
    blood_group: data.blood_group,
    location: data.location,
    coordinates: data.coordinates || { lat: 12.9716, lng: 77.5946 }, // Default Bengaluru
    is_available: data.role === 'donor',
    is_verified: false,
    donation_count: 0,
    last_donation_date: null,
    created_at: now,
    updated_at: now,
  };

  await DataStore.saveUser(newProfile);

  res.status(201).json({
    success: true,
    message: 'Profile registered successfully.',
    data: newProfile,
    token: `demo_${userId}`,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required.' });
    return;
  }

  const user = await DataStore.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ success: false, message: 'No account found with this email.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: user,
    token: `demo_${user.id}`,
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const user = await DataStore.getUser(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.status(200).json({ success: true, data: user });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const current = await DataStore.getUser(req.user.id);
  if (!current) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const allowedUpdates = ['full_name', 'phone', 'location', 'coordinates', 'is_available', 'blood_group'];
  const updates: Partial<UserProfile> = {};

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      (updates as any)[key] = req.body[key];
    }
  }

  const updatedUser: UserProfile = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await DataStore.saveUser(updatedUser);
  res.status(200).json({ success: true, message: 'Profile updated.', data: updatedUser });
}

