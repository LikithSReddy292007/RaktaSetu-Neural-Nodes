export const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const USER_ROLES = ['donor', 'requester', 'volunteer', 'hospital', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REQUEST_STATUSES = [
  'pending_verification',
  'verification_rejected',
  'verified',
  'matching',
  'accepted',
  'in_progress',
  'fulfilled',
  'cancelled',
  'expired',
  'pending'
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const URGENCY_LEVELS = ['critical', 'urgent', 'today'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const SEVERITY_LEVELS = [
  'High — Emergency',
  'Medium — Urgent',
  'Low — Normal',
  'critical',
  'urgent',
  'today'
] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const ALCOHOL_OPTIONS = [
  'Within the last 24 hours',
  '24–48 hours ago',
  '2–7 days ago',
  'More than 7 days ago',
  'Never consumed'
] as const;
export type AlcoholConsumptionOption = (typeof ALCOHOL_OPTIONS)[number];

export type EligibilityScreeningStatus =
  | 'screened_eligible'
  | 'temporarily_disqualified'
  | 'special_screening_required'
  | 'pending_review';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UserProfile {
  id: string; // Auth UID
  email: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  role: UserRole;
  blood_group: BloodGroup;
  location: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  last_alcohol_consumption?: string;
  days_since_last_tattoo?: number;
  registration_status?: 'pending' | 'completed';
  eligibility_screening_status?: EligibilityScreeningStatus;
  coordinates?: Coordinates;
  is_available: boolean;
  is_verified: boolean;
  donation_count?: number;
  last_donation_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalDocument {
  id: string;
  filename: string;
  mime_type: string;
  file_data?: string; // Base64 data for secure storage
  url?: string;
  size_bytes?: number;
  uploaded_at: string;
}

export interface BloodRequest {
  id: string;
  user_id: string;
  requester_name: string;
  requester_phone?: string;
  patient_name: string;
  blood_group: BloodGroup;
  units_needed: number;
  hospital: string;
  hospital_address?: string;
  location: string;
  coordinates: Coordinates;
  severity?: string;
  urgency: UrgencyLevel;
  notes?: string;
  doctor_prescription_doc?: MedicalDocument;
  admission_proof_doc?: MedicalDocument;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  status: RequestStatus;
  matched_donor_ids: string[];
  accepted_donor_id?: string | null;
  accepted_donor_name?: string;
  accepted_donor_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface DonorAcceptance {
  id: string;
  request_id: string;
  donor_id: string;
  donor_name: string;
  donor_phone?: string;
  donor_blood_group: BloodGroup;
  status: 'accepted' | 'completed' | 'cancelled';
  accepted_at: string;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'donor' | 'requester';
  text: string;
  timestamp: string;
  blocked?: boolean;
}

export interface MatchScore {
  donor_id: string;
  donor_name: string;
  blood_group: BloodGroup;
  distance_km: number;
  compatibility_score: number;
  is_available: boolean;
  phone: string;
  location: string;
  coordinates: Coordinates;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'emergency' | 'match' | 'status_update' | 'system';
  data?: Record<string, string>;
  read: boolean;
  created_at: string;
}

export interface DonationHistoryItem {
  id: string;
  donor_id: string;
  donor_name: string;
  request_id: string;
  patient_name: string;
  hospital: string;
  blood_group: BloodGroup;
  units: number;
  date: string;
  status: 'completed' | 'verified';
}

export interface LiveLocationUpdate {
  request_id: string;
  user_id: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updated_at: number;
}
