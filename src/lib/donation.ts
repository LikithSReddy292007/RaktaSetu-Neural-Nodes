export const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

export type Urgency = 'critical' | 'urgent' | 'today';
export const URGENCY_ORDER: Urgency[] = ['critical', 'urgent', 'today'];
export const URGENCY_LABELS: Record<Urgency, string> = {
  critical: 'Critical',
  urgent: 'Urgent',
  today: 'Needed today',
};

export type BloodBankSummary = {
  id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
};

export type Appointment = {
  id: string;
  appointment_date: string;
  time_slot: string;
  status: 'scheduled' | 'cancelled';
  blood_bank_id: string;
  blood_banks: BloodBankSummary | null;
};

export function toIsoDate(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function getDayParts(date: Date) {
  return {
    day: date.toLocaleDateString('en-IN', { day: 'numeric' }),
    month: date.toLocaleDateString('en-IN', { month: 'short' }),
    full: date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

export function formatTimeSlot(slot: string) {
  const [hours, minutes] = slot.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(startIso: string, endIso: string) {
  const format = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${format(startIso)} – ${format(endIso)}`;
}

export function isSlotInPast(isoDate: string, slot: string) {
  return new Date(`${isoDate}T${slot}:00`).getTime() <= Date.now();
}

export function formatRelativeTime(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function toTelHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}
