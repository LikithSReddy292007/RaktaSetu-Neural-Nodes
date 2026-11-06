import test from 'node:test';
import assert from 'node:assert/strict';
import { isBloodCompatible, calculateDistanceKm, findMatchingDonors } from '../services/matchingService.js';
import { generateAgoraToken } from '../services/agoraService.js';
import { BloodRequest, UserProfile } from '../types/index.js';

test('ABO and Rh Blood Compatibility Matrix', () => {
  // Universal Donor: O- can donate to everyone
  assert.equal(isBloodCompatible('O-', 'O-'), true);
  assert.equal(isBloodCompatible('O-', 'O+'), true);
  assert.equal(isBloodCompatible('O-', 'A+'), true);
  assert.equal(isBloodCompatible('O-', 'AB+'), true);

  // Universal Recipient: AB+ can receive from everyone
  assert.equal(isBloodCompatible('O+', 'AB+'), true);
  assert.equal(isBloodCompatible('A-', 'AB+'), true);
  assert.equal(isBloodCompatible('B+', 'AB+'), true);
  assert.equal(isBloodCompatible('AB-', 'AB+'), true);

  // Incompatible combinations
  assert.equal(isBloodCompatible('A+', 'B+'), false);
  assert.equal(isBloodCompatible('B+', 'A+'), false);
  assert.equal(isBloodCompatible('AB+', 'O+'), false);
  assert.equal(isBloodCompatible('O+', 'O-'), false);
});

test('Haversine Distance Calculation', () => {
  // Distance between Indiranagar (12.9784, 77.6408) and Manipal Hospital (12.9592, 77.6545)
  const dist = calculateDistanceKm(
    { lat: 12.9784, lng: 77.6408 },
    { lat: 12.9592, lng: 77.6545 }
  );
  // Should be approx 2.6 - 2.8 km
  assert.ok(dist >= 2.0 && dist <= 3.5, `Distance was ${dist}`);
});

test('Matching Engine: Unverified request cannot match donors', () => {
  const unverifiedReq: BloodRequest = {
    id: 'req_unver',
    user_id: 'user_u',
    requester_name: 'Test',
    patient_name: 'Patient Unverified',
    blood_group: 'O+',
    units_needed: 1,
    hospital: 'Hospital A',
    location: 'Bengaluru',
    coordinates: { lat: 12.9592, lng: 77.6545 },
    urgency: 'critical',
    verification_status: 'pending',
    status: 'pending_verification',
    matched_donor_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const donors: UserProfile[] = [
    {
      id: 'd1',
      email: 'd1@test.com',
      full_name: 'Donor',
      phone: '9845000001',
      date_of_birth: '1995-01-01',
      role: 'donor',
      blood_group: 'O+',
      location: 'Old Airport Road',
      coordinates: { lat: 12.9600, lng: 77.6550 },
      is_available: true,
      is_verified: true,
      created_at: '',
      updated_at: '',
    },
  ];

  const matches = findMatchingDonors(unverifiedReq, donors);
  assert.equal(matches.length, 0, 'Unverified requests must return 0 matching donors');
});

test('Matching Engine: Ranks available, screened, and compatible donors', () => {
  const request: BloodRequest = {
    id: 'test_req_1',
    user_id: 'user_1',
    requester_name: 'Test Requester',
    patient_name: 'Patient Test',
    blood_group: 'O+',
    units_needed: 1,
    hospital: 'Manipal Hospital',
    location: 'Old Airport Road',
    coordinates: { lat: 12.9592, lng: 77.6545 },
    urgency: 'critical',
    verification_status: 'verified',
    status: 'matching',
    matched_donor_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const donors: UserProfile[] = [
    {
      id: 'd1_exact_near',
      email: 'd1@test.com',
      full_name: 'Near O+ Donor',
      phone: '9845000001',
      date_of_birth: '1995-01-01',
      role: 'donor',
      blood_group: 'O+',
      location: 'Old Airport Road',
      coordinates: { lat: 12.9600, lng: 77.6550 },
      is_available: true,
      is_verified: true,
      eligibility_screening_status: 'screened_eligible',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'd2_incompatible',
      email: 'd2@test.com',
      full_name: 'Incompatible Donor',
      phone: '9845000002',
      date_of_birth: '1995-01-01',
      role: 'donor',
      blood_group: 'AB+', // Incompatible with O+
      location: 'Nearby',
      coordinates: { lat: 12.9600, lng: 77.6550 },
      is_available: true,
      is_verified: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'd3_disqualified_alcohol',
      email: 'd3@test.com',
      full_name: 'Alcohol Disqualified Donor',
      phone: '9845000003',
      date_of_birth: '1995-01-01',
      role: 'donor',
      blood_group: 'O+',
      location: 'Nearby',
      coordinates: { lat: 12.9600, lng: 77.6550 },
      is_available: true,
      is_verified: true,
      eligibility_screening_status: 'temporarily_disqualified', // Excluded!
      created_at: '',
      updated_at: '',
    },
    {
      id: 'd4_compatible_far',
      email: 'd4@test.com',
      full_name: 'Far O- Donor',
      phone: '9845000004',
      date_of_birth: '1995-01-01',
      role: 'donor',
      blood_group: 'O-', // Compatible
      location: 'Whitefield',
      coordinates: { lat: 12.9698, lng: 77.7499 },
      is_available: true,
      is_verified: false,
      eligibility_screening_status: 'screened_eligible',
      created_at: '',
      updated_at: '',
    },
  ];

  const matches = findMatchingDonors(request, donors);

  assert.equal(matches.length, 2);
  assert.equal(matches[0].donor_id, 'd1_exact_near');
  assert.equal(matches[1].donor_id, 'd4_compatible_far');
  assert.ok(matches[0].compatibility_score > matches[1].compatibility_score);
});

test('Agora Service: Token generation produces valid structure', () => {
  const tokenData = generateAgoraToken('test_channel', 1234, 'publisher');
  assert.ok(tokenData.token);
  assert.equal(tokenData.channelName, 'test_channel');
  assert.equal(tokenData.uid, 1234);
});
