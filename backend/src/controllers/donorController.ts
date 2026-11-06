import { Request, Response } from 'express';
import { z } from 'zod';
import { DataStore } from '../services/store.js';
import { calculateDistanceKm, isDonorIn90DayCooldown } from '../services/matchingService.js';
import {
  ALCOHOL_OPTIONS,
  BLOOD_GROUPS,
  BloodGroup,
  EligibilityScreeningStatus,
  UserProfile,
} from '../types/index.js';

export const donorRegistrationSchema = z.object({
  // Step 1: Personal Identity
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  blood_group: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Invalid blood group selected' }) }),

  // Step 2: Location Details
  country: z.string().default('India'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),

  // Step 3: Health Declaration
  last_alcohol_consumption: z.enum(ALCOHOL_OPTIONS, {
    errorMap: () => ({ message: 'Please select when alcohol was last consumed' }),
  }),
  days_since_last_tattoo: z.coerce.number().min(0, 'Tattoo days must be 0 or greater'),

  // Optional identifiers if user is registering without an existing account
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export async function registerDonor(req: Request, res: Response): Promise<void> {
  const data = req.body;
  const now = new Date().toISOString();

  // Determine user identity
  let userId = req.user?.id;
  let existingUser: UserProfile | null = null;

  if (userId) {
    existingUser = await DataStore.getUser(userId);
  } else if (data.email) {
    existingUser = await DataStore.getUserByEmail(data.email);
    if (existingUser) {
      userId = existingUser.id;
    }
  }

  // Health declaration eligibility screening
  let eligibilityStatus: EligibilityScreeningStatus = 'screened_eligible';
  let isAvailable = true;
  const warnings: string[] = [];

  const alcohol = data.last_alcohol_consumption;
  if (alcohol === 'Within the last 24 hours' || alcohol === '24–48 hours ago') {
    eligibilityStatus = 'temporarily_disqualified';
    isAvailable = false;
    warnings.push('Alcohol within 48 hours disqualifies you temporarily. Please wait 48 hours before donating.');
  }

  const tattooDays = Number(data.days_since_last_tattoo);
  if (tattooDays > 0 && tattooDays < 180) {
    if (eligibilityStatus !== 'temporarily_disqualified') {
      eligibilityStatus = 'special_screening_required';
    }
    warnings.push('Tattoos within 6 months (180 days) require medical screening before donation.');
  }

  const fullLocation = `${data.city}, ${data.district}, ${data.state}, ${data.country}`;

  if (existingUser) {
    // Update existing user to prevent duplicate records
    existingUser.full_name = data.full_name;
    existingUser.blood_group = data.blood_group;
    existingUser.country = data.country || 'India';
    existingUser.state = data.state;
    existingUser.district = data.district;
    existingUser.city = data.city;
    existingUser.location = `${data.city}, ${data.state}`;
    existingUser.last_alcohol_consumption = data.last_alcohol_consumption;
    existingUser.days_since_last_tattoo = tattooDays;
    existingUser.registration_status = 'completed';
    existingUser.eligibility_screening_status = eligibilityStatus;
    existingUser.is_available = isAvailable;
    existingUser.role = 'donor';
    existingUser.updated_at = now;

    await DataStore.saveUser(existingUser);

    res.status(200).json({
      success: true,
      message: 'Donor registration successfully updated.',
      data: existingUser,
      token: `demo_${existingUser.id}`,
      screening_status: eligibilityStatus,
      warnings,
    });
    return;
  }

  // New Donor Profile creation
  const newId = `donor_${Date.now()}`;
  const generatedEmail = data.email || `${data.full_name.toLowerCase().replace(/\s+/g, '.')}.${Date.now().toString().slice(-4)}@donor.rakthasetu.org`;
  const defaultPhone = data.phone || '+91 98' + Math.floor(10000000 + Math.random() * 90000000);

  const newDonor: UserProfile = {
    id: newId,
    email: generatedEmail,
    full_name: data.full_name,
    phone: defaultPhone,
    date_of_birth: '1995-01-01',
    role: 'donor',
    blood_group: data.blood_group,
    location: `${data.city}, ${data.state}`,
    country: data.country || 'India',
    state: data.state,
    district: data.district,
    city: data.city,
    last_alcohol_consumption: data.last_alcohol_consumption,
    days_since_last_tattoo: tattooDays,
    registration_status: 'completed',
    eligibility_screening_status: eligibilityStatus,
    coordinates: { lat: 12.9716, lng: 77.5946 }, // Default Bengaluru
    is_available: isAvailable,
    is_verified: false,
    donation_count: 0,
    last_donation_date: null,
    created_at: now,
    updated_at: now,
  };

  await DataStore.saveUser(newDonor);

  // Add welcome notification
  await DataStore.addNotification({
    id: `notif_${Date.now()}_welcome`,
    user_id: newId,
    title: 'Welcome to the Lifesaving Network!',
    body: `Thank you ${data.full_name} for registering as an ${data.blood_group} donor. Your registration is complete.`,
    type: 'system',
    read: false,
    created_at: now,
  });

  res.status(201).json({
    success: true,
    message: 'Donor registration completed successfully! Join the lifesaving network.',
    data: newDonor,
    token: `demo_${newId}`,
    screening_status: eligibilityStatus,
    warnings,
  });
}

export async function getDonors(req: Request, res: Response): Promise<void> {
  const { group, available, lat, lng, radiusKm } = req.query;

  let donors = await DataStore.getAllDonors();

  if (available !== undefined) {
    const isAvail = available === 'true';
    donors = donors.filter((d) => d.is_available === isAvail);
  }

  if (group && typeof group === 'string') {
    const targetGroup = group.includes(' ') ? group.replace(' ', '+') : group;
    donors = donors.filter((d) => d.blood_group === targetGroup);
  }

  // Calculate distance if requester coordinates are provided
  let results = donors.map((donor) => {
    let distance_km = 0;
    if (lat && lng && donor.coordinates) {
      distance_km = calculateDistanceKm(
        { lat: parseFloat(lat as string), lng: parseFloat(lng as string) },
        donor.coordinates
      );
    }
    return {
      id: donor.id,
      full_name: donor.full_name,
      blood_group: donor.blood_group,
      location: donor.location,
      country: donor.country,
      state: donor.state,
      district: donor.district,
      city: donor.city,
      coordinates: donor.coordinates,
      is_available: donor.is_available,
      is_verified: donor.is_verified,
      registration_status: donor.registration_status,
      eligibility_screening_status: donor.eligibility_screening_status,
      donation_count: donor.donation_count || 0,
      last_donation_date: donor.last_donation_date,
      distance_km,
      phone_masked: donor.phone.slice(0, 4) + ' ••••• ' + donor.phone.slice(-2),
    };
  });

  if (radiusKm && lat && lng) {
    const maxR = parseFloat(radiusKm as string);
    results = results.filter((d) => d.distance_km <= maxR);
  }

  // Sort by nearest if coordinates provided
  if (lat && lng) {
    results.sort((a, b) => a.distance_km - b.distance_km);
  }

  res.status(200).json({ success: true, count: results.length, data: results });
}

export async function toggleAvailability(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const user = await DataStore.getUser(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const cooldown = isDonorIn90DayCooldown(user);
  if (cooldown.inCooldown) {
    user.is_available = false;
    await DataStore.saveUser(user);
    res.status(400).json({
      success: false,
      message: `You are in a mandatory 90-day donation recovery period (${cooldown.daysRemaining} days remaining). Next eligible date: ${cooldown.nextEligibleDate}.`,
      cooldown,
    });
    return;
  }

  const { is_available } = req.body;
  user.is_available = typeof is_available === 'boolean' ? is_available : !user.is_available;
  user.updated_at = new Date().toISOString();

  await DataStore.saveUser(user);

  res.status(200).json({
    success: true,
    message: user.is_available ? 'You are now marked available to help.' : 'You are now marked unavailable.',
    is_available: user.is_available,
  });
}

export async function submitVerification(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const user = await DataStore.getUser(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const cooldown = isDonorIn90DayCooldown(user);
  if (cooldown.inCooldown) {
    user.is_available = false;
    await DataStore.saveUser(user);
    res.status(400).json({
      success: false,
      message: `You are in a mandatory 90-day donation recovery period (${cooldown.daysRemaining} days remaining). Next eligible date: ${cooldown.nextEligibleDate}.`,
      cooldown,
    });
    return;
  }

  const { extracted_blood_group, document_type, notes } = req.body;

  user.is_verified = true;
  if (extracted_blood_group) {
    user.blood_group = extracted_blood_group as BloodGroup;
  }
  user.updated_at = new Date().toISOString();

  await DataStore.saveUser(user);

  res.status(200).json({
    success: true,
    message: 'Donor verification details updated successfully.',
    data: user,
  });
}
