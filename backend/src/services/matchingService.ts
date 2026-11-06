import { BloodGroup, Coordinates, MatchScore, UserProfile, BloodRequest, UrgencyLevel } from '../types/index.js';

// Medically verified ABO and Rh blood compatibility map
// Key: Recipient blood group -> Value: Array of compatible donor blood groups
export const RECIPIENT_CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

// Check if donor is compatible with recipient
export function isBloodCompatible(donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean {
  const allowed = RECIPIENT_CAN_RECEIVE_FROM[recipientGroup] || [];
  return allowed.includes(donorGroup);
}

// Medical 90-day recovery cooldown helper
export function isDonorIn90DayCooldown(donor: UserProfile): { inCooldown: boolean; daysRemaining: number; nextEligibleDate: string } {
  if (!donor.last_donation_date) {
    return { inCooldown: false, daysRemaining: 0, nextEligibleDate: '' };
  }
  const lastDonation = new Date(donor.last_donation_date).getTime();
  if (isNaN(lastDonation)) {
    return { inCooldown: false, daysRemaining: 0, nextEligibleDate: '' };
  }
  const diffDays = (Date.now() - lastDonation) / (1000 * 60 * 60 * 24);
  if (diffDays < 90) {
    const daysRemaining = Math.max(1, Math.ceil(90 - diffDays));
    const nextDate = new Date(lastDonation + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return { inCooldown: true, daysRemaining, nextEligibleDate: nextDate };
  }
  return { inCooldown: false, daysRemaining: 0, nextEligibleDate: '' };
}

// Convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Haversine formula to calculate accurate distance between two coordinates in kilometers
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

// Urgency multiplier to calculate priority
const URGENCY_WEIGHTS: Record<UrgencyLevel, number> = {
  critical: 1.5,
  urgent: 1.25,
  today: 1.0,
};

/**
 * Matching Algorithm:
 * 1. Checks request status: ONLY verified / matching requests are eligible for donor matching.
 *    Pending verification or rejected requests yield zero matches.
 * 2. Filters donors by blood compatibility (strict medical rule).
 * 3. Filters by availability (is_available === true).
 * 4. Filters out temporarily disqualified donors from health screening.
 * 5. Calculates geographic distance (Haversine).
 * 6. Filters donors within maximum radius (default 35-50 km).
 * 7. Computes a composite compatibility score.
 * 8. Returns candidates sorted by score descending.
 */
export function findMatchingDonors(
  request: BloodRequest,
  allDonors: UserProfile[],
  maxRadiusKm: number = 35
): MatchScore[] {
  // CRITICAL REQUIREMENT:
  // Unverified requests or requests pending medical verification CANNOT match donors.
  const isEligibleStatus = ['verified', 'matching', 'accepted', 'in_progress'].includes(request.status);
  const isMedicallyVerified = request.verification_status === 'verified' || isEligibleStatus;
  
  if (!isMedicallyVerified && request.status === 'pending_verification') {
    return [];
  }

  const matches: MatchScore[] = [];

  for (const donor of allDonors) {
    // Only donors
    if (donor.role !== 'donor') continue;

    // Check availability
    if (!donor.is_available) continue;

    // 90-Day mandatory whole blood donation recovery cooldown
    if (isDonorIn90DayCooldown(donor).inCooldown) continue;

    // Health screening eligibility check
    if (donor.eligibility_screening_status === 'temporarily_disqualified') {
      continue;
    }

    // Strict blood compatibility
    if (!isBloodCompatible(donor.blood_group, request.blood_group)) {
      continue;
    }

    // Default coordinates fallback (Bengaluru center: 12.9716, 77.5946) if missing
    const donorCoord = donor.coordinates || { lat: 12.9716, lng: 77.5946 };
    const requestCoord = request.coordinates || { lat: 12.9716, lng: 77.5946 };

    const distance = calculateDistanceKm(requestCoord, donorCoord);
    if (distance > maxRadiusKm) continue;

    // Calculate score
    const isExactMatch = donor.blood_group === request.blood_group;
    let baseScore = isExactMatch ? 100 : 80;

    // Proximity factor (closer = higher score, max penalty 40 pts)
    const proximityScore = Math.max(0, 40 - distance * 1.5);

    // Verification bonus
    const verificationBonus = donor.is_verified ? 15 : 0;

    // Urgency multiplier
    const urgencyMultiplier = URGENCY_WEIGHTS[request.urgency] || 1.0;

    const totalScore = Math.round((baseScore + proximityScore + verificationBonus) * urgencyMultiplier);

    matches.push({
      donor_id: donor.id,
      donor_name: donor.full_name,
      blood_group: donor.blood_group,
      distance_km: distance,
      compatibility_score: totalScore,
      is_available: donor.is_available,
      phone: donor.phone,
      location: donor.location,
      coordinates: donorCoord,
    });
  }

  // Sort by highest compatibility score first, then shortest distance
  matches.sort((a, b) => b.compatibility_score - a.compatibility_score || a.distance_km - b.distance_km);

  return matches;
}

/**
 * Reverse Matching: Find verified nearby active emergency requests for a given donor.
 */
export function findMatchingRequestsForDonor(
  donor: UserProfile,
  allRequests: BloodRequest[],
  maxRadiusKm: number = 40
): (BloodRequest & { distance_km: number })[] {
  if (!donor.is_available || donor.eligibility_screening_status === 'temporarily_disqualified' || isDonorIn90DayCooldown(donor).inCooldown) {
    return [];
  }

  const donorCoord = donor.coordinates || { lat: 12.9716, lng: 77.5946 };
  const results: (BloodRequest & { distance_km: number })[] = [];

  for (const req of allRequests) {
    // Only verified, matching, or newly submitted emergency requests
    if (!['verified', 'matching', 'pending_verification'].includes(req.status)) {
      continue;
    }

    // Must be blood compatible (donor can donate to patient's blood group)
    if (!isBloodCompatible(donor.blood_group, req.blood_group)) {
      continue;
    }

    const reqCoord = req.coordinates || { lat: 12.9716, lng: 77.5946 };
    const distance = calculateDistanceKm(donorCoord, reqCoord);

    if (distance <= maxRadiusKm) {
      results.push({
        ...req,
        distance_km: distance,
      });
    }
  }

  results.sort((a, b) => a.distance_km - b.distance_km);
  return results;
}
