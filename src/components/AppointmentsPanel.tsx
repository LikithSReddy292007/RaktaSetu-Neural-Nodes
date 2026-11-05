import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Clock3, MapPin, Pencil, Plus } from 'lucide-react';
import { AppointmentModal } from '@/components/AppointmentModal';
import { supabase } from '@/lib/supabase';
import {
  Appointment,
  formatTimeSlot,
  getDayParts,
  toIsoDate,
} from '@/lib/donation';

type AppointmentsPanelProps = {
  userId: string | null;
  onSignIn: () => void;
  showNotice: (message: string) => void;
};

export function AppointmentsPanel({ userId, onSignIn, showNotice }: AppointmentsPanelProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<Appointment | 'new' | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, time_slot, status, blood_bank_id, blood_banks(id, name, area, address, phone)')
      .order('appointment_date', { ascending: true });
    setLoading(false);
    if (error || !Array.isArray(data)) {
      setLoadError('We could not load your appointments. Please try again.');
      return;
    }
    setLoadError('');
    setAppointments(data as Appointment[]);
  }, []);

  useEffect(() => {
    if (userId) void loadAppointments();
  }, [userId, loadAppointments]);

  if (!userId) {
    return (
      <section className="page-section section-wrap">
        <div className="rs-empty">
          <span className="modal-icon"><CalendarCheck size={20} /></span>
          <h2>Sign in to book a donation.</h2>
          <p>Your appointments are private. Log in or create a profile to schedule, reschedule or cancel.</p>
          <button className="button button-primary" onClick={onSignIn}>Log in to continue</button>
        </div>
      </section>
    );
  }

  const today = toIsoDate(new Date());
  const upcoming = appointments.filter((item) => item.status === 'scheduled' && item.appointment_date >= today);
  const history = appointments.filter((item) => !upcoming.includes(item)).reverse();

  const cancelAppointment = async (appointment: Appointment) => {
    setBusyId(appointment.id);
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointment.id);
    setBusyId(null);
    setConfirmingId(null);
    if (error) {
      showNotice('We could not cancel that appointment. Please try again.');
      return;
    }
    showNotice('Your appointment has been cancelled.');
    await loadAppointments();
  };

  const renderCard = (appointment: Appointment, isUpcoming: boolean) => {
    const bank = appointment.blood_banks;
    const parts = getDayParts(new Date(`${appointment.appointment_date}T00:00:00`));
    const isCancelled = appointment.status === 'cancelled';
    const statusLabel = isCancelled ? 'Cancelled' : isUpcoming ? 'Scheduled' : 'Past';
    const statusTone = isCancelled ? 'cancelled' : isUpcoming ? 'scheduled' : 'past';
    const isConfirming = confirmingId === appointment.id;
    const isBusy = busyId === appointment.id;

    return (
      <article key={appointment.id} className={`rs-card appt-card ${isUpcoming ? '' : 'is-muted'}`}>
        <div className="rs-date-block">
          <span className="rs-date-day">{parts.day}</span>
          <span className="rs-date-month">{parts.month}</span>
        </div>
        <div className="appt-card-body">
          <h3>{bank?.name ?? 'Blood bank'}</h3>
          <p className="rs-meta"><MapPin size={14} /> {bank?.address ?? bank?.area ?? 'Address unavailable'}</p>
          <p className="rs-meta"><Clock3 size={14} /> {parts.full} · {formatTimeSlot(appointment.time_slot)}</p>
        </div>
        <div className="appt-card-side">
          <span className={`rs-status rs-status--${statusTone}`}>{statusLabel}</span>
          {isUpcoming && !isConfirming && (
            <div className="appt-actions">
              <button className="text-button" onClick={() => setEditing(appointment)} disabled={isBusy}>
                <Pencil size={14} /> Reschedule
              </button>
              <button className="text-button rs-text-danger" onClick={() => setConfirmingId(appointment.id)} disabled={isBusy}>
                Cancel
              </button>
            </div>
          )}
          {isUpcoming && isConfirming && (
            <div className="appt-actions">
              <button className="button button-secondary rs-button-compact" onClick={() => setConfirmingId(null)}>Keep it</button>
              <button className="button rs-button-danger rs-button-compact" onClick={() => void cancelAppointment(appointment)} disabled={isBusy}>
                {isBusy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="page-section section-wrap">
      <div className="page-intro">
        <div>
          <span className="eyebrow dark">DONOR APPOINTMENTS</span>
          <h1>Your donation <em>schedule.</em></h1>
          <p>Book a slot at a nearby blood bank, move it when plans change, or cancel in one tap.</p>
        </div>
        <button className="button button-primary" onClick={() => setEditing('new')}>
          <Plus size={16} /> Book appointment
        </button>
      </div>

      {loadError && <div className="form-error rs-spaced">{loadError}</div>}
      {loading && appointments.length === 0 && <p className="rs-loading">Loading your appointments…</p>}

      {!loading && !loadError && appointments.length === 0 && (
        <div className="rs-empty rs-spaced">
          <span className="modal-icon"><CalendarCheck size={20} /></span>
          <h2>No appointments yet.</h2>
          <p>Pick a blood bank and a time that works for you. It takes less than a minute.</p>
          <button className="button button-primary" onClick={() => setEditing('new')}>Book your first donation</button>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="rs-subhead">Upcoming</h2>
          <div className="rs-stack">{upcoming.map((item) => renderCard(item, true))}</div>
        </>
      )}

      {history.length > 0 && (
        <>
          <h2 className="rs-subhead">Past and cancelled</h2>
          <div className="rs-stack">{history.map((item) => renderCard(item, false))}</div>
        </>
      )}

      {editing && (
        <AppointmentModal
          appointment={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            showNotice(message);
            void loadAppointments();
          }}
        />
      )}
    </section>
  );
}
