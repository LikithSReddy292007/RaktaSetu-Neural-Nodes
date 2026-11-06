import { Request, Response } from 'express';
import { z } from 'zod';
import { DataStore } from '../services/store.js';
import {
  BLOOD_GROUPS,
  BloodGroup,
  BloodRequest,
  DonorAcceptance,
  MedicalDocument,
  REQUEST_STATUSES,
  URGENCY_LEVELS,
} from '../types/index.js';
import { calculateDistanceKm, findMatchingDonors, findMatchingRequestsForDonor, isDonorIn90DayCooldown } from '../services/matchingService.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const documentSchema = z.object({
  filename: z.string().min(1, 'Document filename required'),
  mime_type: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val.toLowerCase()), {
    message: 'Allowed formats: PDF, JPG, JPEG, PNG',
  }),
  file_data: z.string().optional(),
  size_bytes: z.number().optional(),
});

export const createRequestSchema = z.object({
  patient_name: z.string().min(2, 'Patient name is required (min 2 characters)'),
  blood_group: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Valid blood group required' }) }),
  severity: z.string().default('High — Emergency'),
  hospital: z.string().min(2, 'Hospital / Clinical facility name required'),
  hospital_address: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  units_needed: z.coerce.number().int().positive().default(1),
  urgency: z.enum(URGENCY_LEVELS).default('critical'),
  notes: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .default({ lat: 12.9716, lng: 77.5946 }),

  // Mandatory Medical Proofs (Module 2)
  doctor_prescription: documentSchema,
  admission_proof: documentSchema,
});

export async function createRequest(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id || 'guest_requester';
  const user = req.user ? await DataStore.getUser(req.user.id) : null;
  const data = req.body;

  const id = `req_${Date.now()}`;
  const now = new Date().toISOString();

  // Map severity string to urgency level if needed
  let derivedUrgency = data.urgency || 'urgent';
  if (data.severity?.includes('Emergency') || data.severity?.includes('High')) {
    derivedUrgency = 'critical';
  } else if (data.severity?.includes('Urgent') || data.severity?.includes('Medium')) {
    derivedUrgency = 'urgent';
  } else if (data.severity?.includes('Normal') || data.severity?.includes('Low')) {
    derivedUrgency = 'today';
  }

  // Build secure document references (avoid undefined values for Firestore safety)
  const prescriptionDoc: MedicalDocument = {
    id: `doc_rx_${Date.now()}`,
    filename: data.doctor_prescription.filename,
    mime_type: data.doctor_prescription.mime_type,
    file_data: data.doctor_prescription.file_data || '',
    size_bytes: data.doctor_prescription.size_bytes || 0,
    uploaded_at: now,
  };

  const admissionDoc: MedicalDocument = {
    id: `doc_adm_${Date.now()}`,
    filename: data.admission_proof.filename,
    mime_type: data.admission_proof.mime_type,
    file_data: data.admission_proof.file_data || '',
    size_bytes: data.admission_proof.size_bytes || 0,
    uploaded_at: now,
  };

  const newRequest: BloodRequest = {
    id,
    user_id: userId,
    requester_name: user ? user.full_name : 'Requester',
    requester_phone: user?.phone || '',
    patient_name: data.patient_name,
    blood_group: data.blood_group,
    units_needed: data.units_needed || 1,
    hospital: data.hospital,
    hospital_address: data.hospital_address || data.location,
    location: data.location,
    coordinates: data.coordinates || { lat: 12.9716, lng: 77.5946 },
    severity: data.severity || 'High — Emergency',
    urgency: derivedUrgency,
    notes: data.notes || '',
    doctor_prescription_doc: prescriptionDoc,
    admission_proof_doc: admissionDoc,
    // Initial status is Pending Verification
    verification_status: 'pending',
    status: 'pending_verification',
    matched_donor_ids: [],
    accepted_donor_id: null,
    created_at: now,
    updated_at: now,
  };

  const saved = await DataStore.saveRequest(newRequest);

  // Notify admin queue of new request pending medical review
  await DataStore.addNotification({
    id: `notif_${Date.now()}_admin_rev`,
    user_id: 'admin_super',
    title: 'New Blood Request Pending Verification',
    body: `${data.patient_name} (${data.blood_group}) at ${data.hospital} requires medical document verification.`,
    type: 'system',
    data: { request_id: id },
    read: false,
    created_at: now,
  });

  res.status(201).json({
    success: true,
    message: 'Blood request submitted successfully with medical proofs. Request is now pending verification.',
    data: saved,
  });
}

export async function getRequests(req: Request, res: Response): Promise<void> {
  const { group, urgency, status, verifiedOnly } = req.query;

  let requests = await DataStore.getAllRequests();

  if (verifiedOnly === 'true') {
    requests = requests.filter(
      (r) => r.verification_status === 'verified' || ['verified', 'matching', 'accepted'].includes(r.status)
    );
  }

  if (group && typeof group === 'string') {
    const targetGroup = group.includes(' ') ? group.replace(' ', '+') : group;
    requests = requests.filter((r) => r.blood_group === targetGroup);
  }

  if (urgency && typeof urgency === 'string') {
    requests = requests.filter((r) => r.urgency === urgency);
  }

  if (status && typeof status === 'string') {
    requests = requests.filter((r) => r.status === status);
  }

  res.status(200).json({ success: true, count: requests.length, data: requests });
}

export async function getRequestById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const request = await DataStore.getRequest(id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Blood request not found.' });
    return;
  }
  res.status(200).json({ success: true, data: request });
}

export async function verifyRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, reason } = req.body; // status: 'verified' | 'rejected'

  const request = await DataStore.getRequest(id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Blood request not found.' });
    return;
  }

  const now = new Date().toISOString();

  if (status === 'verified') {
    request.verification_status = 'verified';
    request.status = 'matching';
    request.updated_at = now;

    // NOW start matching compatible donors because request passed medical verification
    const allDonors = await DataStore.getAllDonors();
    const matches = findMatchingDonors(request, allDonors);
    request.matched_donor_ids = matches.map((m) => m.donor_id);

    await DataStore.saveRequest(request);

    // Broadcast urgent notifications to matched compatible donors
    for (const match of matches.slice(0, 5)) {
      await DataStore.addNotification({
        id: `notif_${Date.now()}_${match.donor_id}`,
        user_id: match.donor_id,
        title: `🚨 Urgent ${request.blood_group} Blood Needed Nearby`,
        body: `${request.hospital} needs ${request.units_needed} units of ${request.blood_group} blood for ${request.patient_name} (~${match.distance_km} km away).`,
        type: 'emergency',
        data: { request_id: request.id },
        read: false,
        created_at: now,
      });
    }

    // Notify requester
    await DataStore.addNotification({
      id: `notif_${Date.now()}_req_verified`,
      user_id: request.user_id,
      title: 'Medical Proof Verified ✓',
      body: `Your blood request for ${request.patient_name} at ${request.hospital} has been verified. Matching in progress.`,
      type: 'status_update',
      data: { request_id: request.id },
      read: false,
      created_at: now,
    });

    res.status(200).json({
      success: true,
      message: 'Medical documents verified. Request is now active and matching eligible donors.',
      data: request,
      matching_donors_count: matches.length,
    });
    return;
  }

  if (status === 'rejected') {
    request.verification_status = 'rejected';
    request.status = 'verification_rejected';
    request.rejection_reason = reason || 'Documents could not be verified.';
    request.updated_at = now;

    await DataStore.saveRequest(request);

    // Notify requester of rejection
    await DataStore.addNotification({
      id: `notif_${Date.now()}_req_rejected`,
      user_id: request.user_id,
      title: 'Medical Verification Requires Attention',
      body: `Your blood request could not be verified: ${request.rejection_reason}`,
      type: 'status_update',
      data: { request_id: request.id },
      read: false,
      created_at: now,
    });

    res.status(200).json({
      success: true,
      message: 'Blood request documents rejected.',
      data: request,
    });
    return;
  }

  res.status(400).json({ success: false, message: "Invalid verification status. Must be 'verified' or 'rejected'." });
}

export async function updateRequestStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  if (!REQUEST_STATUSES.includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status.' });
    return;
  }

  const request = await DataStore.getRequest(id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Request not found.' });
    return;
  }

  // Ownership or Admin check
  if (req.user && req.user.role !== 'admin' && request.user_id !== req.user.id) {
    res.status(403).json({ success: false, message: 'Forbidden. You do not own this request.' });
    return;
  }

  request.status = status;
  request.updated_at = new Date().toISOString();
  await DataStore.saveRequest(request);

  res.status(200).json({ success: true, message: `Request status updated to ${status}.`, data: request });
}

export async function acceptRequest(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required to accept request.' });
    return;
  }

  const { id } = req.params;
  const request = await DataStore.getRequest(id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Request not found.' });
    return;
  }

  // Prevent acceptance of fulfilled, cancelled, or expired requests
  if (request.status === 'fulfilled' || request.status === 'cancelled' || request.status === 'expired') {
    res.status(400).json({ success: false, message: `Cannot accept this request. Status is already ${request.status}.` });
    return;
  }

  const donor = await DataStore.getUser(req.user.id);
  if (!donor) {
    res.status(404).json({ success: false, message: 'Donor profile not found.' });
    return;
  }

  // Prevent duplicate acceptance by the same donor
  const existingAcceptance = await DataStore.getAcceptance(request.id, donor.id);
  if (existingAcceptance) {
    res.status(409).json({
      success: false,
      message: 'You have already accepted this blood donation request.',
      data: request,
    });
    return;
  }

  const now = new Date().toISOString();

  // Save acceptance record
  const acceptance: DonorAcceptance = {
    id: `acc_${Date.now()}_${donor.id}`,
    request_id: request.id,
    donor_id: donor.id,
    donor_name: donor.full_name,
    donor_phone: donor.phone,
    donor_blood_group: donor.blood_group,
    status: 'accepted',
    accepted_at: now,
  };
  await DataStore.saveAcceptance(acceptance);

  // Update request status
  request.status = 'accepted';
  request.verification_status = 'verified';
  request.accepted_donor_id = donor.id;
  request.accepted_donor_name = donor.full_name;
  request.accepted_donor_phone = donor.phone || '+91 98450 12345';
  request.updated_at = now;
  await DataStore.saveRequest(request);

  // Initialize live location for this accepted request
  await DataStore.updateLiveLocation({
    request_id: request.id,
    user_id: donor.id,
    lat: donor.coordinates?.lat || 12.9716,
    lng: donor.coordinates?.lng || 77.5946,
    heading: 0,
    speed: 0,
    updated_at: Date.now(),
  });

  // Notify requester
  await DataStore.addNotification({
    id: `notif_${Date.now()}_req_accepted`,
    user_id: request.user_id,
    title: 'A Donor Accepted Your Blood Request! 🩸',
    body: `${donor.full_name} (${donor.blood_group}) has accepted your request for ${request.hospital}. Coordination is active.`,
    type: 'status_update',
    data: { request_id: request.id, donor_id: donor.id },
    read: false,
    created_at: now,
  });

  res.status(200).json({
    success: true,
    message: 'Thank you! You have accepted this emergency blood request. Location coordination is now active.',
    data: request,
    acceptance,
  });
}

export async function skipRequest(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Notification skipped. Other matching requests remain available.',
  });
}

export async function terminateRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const request = await DataStore.getRequest(id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Blood request not found.' });
    return;
  }

  const now = new Date().toISOString();
  request.status = 'cancelled';
  request.updated_at = now;
  await DataStore.saveRequest(request);

  // Clear live location
  await DataStore.clearLiveLocation(id);

  // If a donor was accepted, free up donor
  if (request.accepted_donor_id) {
    const donor = await DataStore.getUser(request.accepted_donor_id);
    if (donor) {
      donor.is_available = true;
      donor.updated_at = now;
      await DataStore.saveUser(donor);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Active request terminated. Requester and donor are now free to make or accept new requests.',
    data: request,
  });
}

export async function completeRequest(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const request = await DataStore.getRequest(id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Blood request not found.' });
    return;
  }

  const now = new Date().toISOString();
  request.status = 'fulfilled';
  request.updated_at = now;
  await DataStore.saveRequest(request);

  // Clear live location
  await DataStore.clearLiveLocation(id);

  let cooldownInfo: any = null;

  // Donor completes donation -> Start 90-day cooldown timer!
  if (request.accepted_donor_id) {
    const donor = await DataStore.getUser(request.accepted_donor_id);
    if (donor) {
      donor.last_donation_date = now;
      donor.donation_count = (donor.donation_count || 0) + 1;
      donor.is_available = false;
      donor.eligibility_screening_status = 'temporarily_disqualified';
      donor.updated_at = now;
      await DataStore.saveUser(donor);
      cooldownInfo = isDonorIn90DayCooldown(donor);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Donation successfully marked as completed! 90-day recovery cooldown is now active for this donor.',
    data: request,
    cooldown: cooldownInfo,
  });
}

export async function getNearbyAlertForDonor(req: Request, res: Response): Promise<void> {
  let donor: any = null;
  if (req.user) {
    donor = await DataStore.getUser(req.user.id);
  }

  // 90-Day cooldown: If donor recently donated, they MUST NOT receive any requests
  if (donor) {
    const cooldown = isDonorIn90DayCooldown(donor);
    if (cooldown.inCooldown) {
      res.status(200).json({
        success: true,
        count: 0,
        data: null,
        message: `Donor is in 90-day recovery cooldown. Eligible on ${cooldown.nextEligibleDate}.`,
        cooldown,
      });
      return;
    }
  }

  const rawGroup = (req.query.group as string) || (donor ? donor.blood_group : 'all');
  const sanitizedGroup = (rawGroup.includes(' ') ? rawGroup.replace(' ', '+') : rawGroup) as BloodGroup | 'all';

  const donorLat = parseFloat((req.query.lat as string) || '12.9716');
  const donorLng = parseFloat((req.query.lng as string) || '77.5946');

  // Fallback to sample donor if testing unauthenticated
  if (!donor) {
    donor = {
      id: 'donor_preview',
      full_name: 'Registered Donor',
      blood_group: sanitizedGroup === 'all' ? 'O+' : sanitizedGroup,
      coordinates: { lat: donorLat, lng: donorLng },
      is_available: true,
      eligibility_screening_status: 'screened_eligible',
    };
  } else {
    donor = {
      ...donor,
      blood_group: sanitizedGroup === 'all' ? donor.blood_group : sanitizedGroup,
      coordinates: { lat: donorLat, lng: donorLng },
    };
  }

  const allRequests = await DataStore.getAllRequests();
  // Filter for ONLY genuine active requests matching donors (NO false/dummy requests)
  const activeRequests = allRequests.filter(
    (r) => r.status === 'matching' || r.status === 'verified'
  );

  // If no official active requests exist, return null immediately (no false requests)
  if (activeRequests.length === 0) {
    res.status(200).json({ success: true, count: 0, data: null });
    return;
  }

  let nearby = findMatchingRequestsForDonor(donor, activeRequests, 50);

  // If no blood-specific match, return latest active request for testing
  if (nearby.length === 0 && activeRequests.length > 0) {
    const latest = activeRequests[0];
    const dist = calculateDistanceKm(
      { lat: donor.coordinates.lat, lng: donor.coordinates.lng },
      { lat: latest.coordinates.lat, lng: latest.coordinates.lng }
    );
    nearby = [{
      ...latest,
      distance_km: Math.round(dist * 10) / 10,
    }];
  }

  if (nearby.length === 0) {
    res.status(200).json({ success: true, count: 0, data: null });
    return;
  }

  // Return the closest matching emergency request
  const match = nearby[0];
  res.status(200).json({
    success: true,
    count: nearby.length,
    data: {
      id: match.id,
      patient_name: match.patient_name,
      blood_group: match.blood_group,
      hospital: match.hospital,
      location: match.location,
      severity: match.severity || 'Emergency',
      urgency: match.urgency,
      distance_km: match.distance_km,
      created_at: match.created_at,
      status: match.status,
    },
  });
}
