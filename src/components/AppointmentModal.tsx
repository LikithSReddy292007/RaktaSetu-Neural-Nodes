import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Appointment,
  BloodBankSummary,
  TIME_SLOTS,
  formatTimeSlot,
  isSlotInPast,
  toIsoDate,
} from '@/lib/donation';

const MAX_DAYS_AHEAD = 60;

type AppointmentModalProps = {
  appointment: Appointment | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function AppointmentModal({ appointment, onClose, onSaved }: AppointmentModalProps) {
  const isEdit = appointment !== null;
  const today = toIsoDate(new Date());
  const maxDate = toIsoDate(new Date(Date.now() + MAX_DAYS_AHEAD * 86400000));

  const [bloodBanks, setBloodBanks] = useState<BloodBankSummary[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankLoadError, setBankLoadError] = useState('');
  const [bankId, setBankId] = useState(appointment?.blood_bank_id ?? '');
  const [date, setDate] = useState(appointment?.appointment_date ?? '');
  const [slot, setSlot] = useState(appointment?.time_slot ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase
      .from('blood_banks')
      .select('id, name, area, address, phone')
      .order('name', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setBanksLoading(false);
        if (loadError || !Array.isArray(data)) {
          setBankLoadError('We could not load blood banks. Please try again later.');
          return;
        }
        setBloodBanks(data as BloodBankSummary[]);
      });
    return () => { active = false; };
  }, []);

  const selectedBank = bloodBanks.find((bank) => bank.id === bankId);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bankId) { setError('Please choose a blood bank.'); return; }
    if (!date) { setError('Please choose a date.'); return; }
    if (date < today) { setError('Please choose today or a future date.'); return; }
    if (!slot) { setError('Please choose a time slot.'); return; }
    if (isSlotInPast(date, slot)) { setError('That time has already passed. Please pick a later slot.'); return; }

    const payload = { blood_bank_id: bankId, appointment_date: date, time_slot: slot };
    setSaving(true);
    setError('');
    const result = appointment
      ? await supabase.from('appointments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', appointment.id)
      : await supabase.from('appointments').insert(payload);
    setSaving(false);

    if (result.error) {
      setError(
        result.error.code === '23505'
          ? 'That time slot was just booked at this blood bank. Please choose another time.'
          : 'We could not save your appointment. Please try again.'
      );
      return;
    }
    onSaved(isEdit ? 'Your appointment has been rescheduled.' : 'Your donation appointment is booked.');
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="appointment-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="modal-icon"><CalendarDays size={20} /></span>
        <span className="eyebrow dark">{isEdit ? 'RESCHEDULE' : 'BOOK A DONATION'}</span>
        <h2 id="appointment-modal-title">{isEdit ? 'Pick a new time.' : 'Schedule your donation.'}</h2>
        <p>Choose a nearby blood bank, a date and a time that suits you. You can change or cancel it later.</p>

        {bankLoadError ? (
          <div className="form-error">{bankLoadError}</div>
        ) : (
          <form onSubmit={submit}>
            <label>
              Blood bank
              <select value={bankId} onChange={(event) => setBankId(event.target.value)} disabled={banksLoading} required>
                <option value="" disabled>{banksLoading ? 'Loading blood banks…' : 'Select a blood bank'}</option>
                {bloodBanks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name} · {bank.area}</option>)}
              </select>
            </label>
            {selectedBank && <p className="rs-meta"><MapPin size={14} /> {selectedBank.address}</p>}

            <label>
              Date
              <input type="date" value={date} min={today} max={maxDate} onChange={(event) => setDate(event.target.value)} required />
            </label>

            <div className="slot-field">
              <span className="slot-label">Time slot</span>
              <div className="slot-grid">
                {TIME_SLOTS.map((time) => {
                  const unavailable = date !== '' && isSlotInPast(date, time);
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`slot-option ${slot === time ? 'active' : ''}`}
                      disabled={unavailable}
                      onClick={() => setSlot(time)}
                      aria-pressed={slot === time}
                    >
                      {formatTimeSlot(time)}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}
            <button className="button button-primary full-width" type="submit" disabled={saving || banksLoading}>
              {saving ? 'Saving…' : isEdit ? 'Save new time' : 'Confirm appointment'} <ArrowRight size={16} />
            </button>
            <small className="form-note">Donations are always free. Never share payment details with anyone.</small>
          </form>
        )}
      </div>
    </div>
  );
}
