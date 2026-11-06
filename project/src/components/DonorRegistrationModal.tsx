import { useState, FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Droplet, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { api } from '@/lib/api';

interface DonorRegistrationModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialValues?: {
    full_name?: string;
    blood_group?: string;
    email?: string;
    phone?: string;
  };
}

export function DonorRegistrationModal({ onClose, onSuccess, initialValues }: DonorRegistrationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Personal Identity
  const [fullName, setFullName] = useState(initialValues?.full_name || '');
  const [bloodGroup, setBloodGroup] = useState(initialValues?.blood_group || '');

  // Step 2: Location Details
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('Bengaluru Urban');
  const [city, setCity] = useState('Bengaluru');

  // Step 3: Health Declaration
  const [lastAlcohol, setLastAlcohol] = useState('Never consumed');
  const [tattooDays, setTattooDays] = useState<string>('0');

  // Step 1 Validation & Proceed
  const handleStep1Continue = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name to proceed.');
      return;
    }
    if (!bloodGroup) {
      setError('Please select your blood group.');
      return;
    }
    setStep(2);
  };

  // Step 2 Validation & Proceed
  const handleStep2Continue = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!country.trim()) {
      setError('Country is required.');
      return;
    }
    if (!state.trim()) {
      setError('State/Region is required.');
      return;
    }
    if (!district.trim()) {
      setError('District is required.');
      return;
    }
    if (!city.trim()) {
      setError('City is required.');
      return;
    }
    setStep(3);
  };

  // Step 3 Validation & Submit
  const handleCompleteRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const days = parseInt(tattooDays, 10);
    if (isNaN(days) || days < 0) {
      setError('Days since last tattoo must be a valid non-negative number (enter 0 if none).');
      return;
    }
    if (!lastAlcohol) {
      setError('Please select your last alcohol consumption.');
      return;
    }

    setBusy(true);

    try {
      const res = await api.registerDonor({
        full_name: fullName.trim(),
        blood_group: bloodGroup,
        country: country.trim(),
        state: state.trim(),
        district: district.trim(),
        city: city.trim(),
        last_alcohol_consumption: lastAlcohol,
        days_since_last_tattoo: days,
        email: initialValues?.email,
        phone: initialValues?.phone,
      });

      let successMsg = 'Registration completed! Welcome to the lifesaving network.';
      if (res.warnings && res.warnings.length > 0) {
        successMsg = `Registration completed. Note: ${res.warnings[0]}`;
      }

      onSuccess(successMsg);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: '540px', padding: '32px' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={19} />
        </button>

        {/* Card Header with Blood Drop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <span className="modal-icon" style={{ margin: 0, width: '44px', height: '44px' }}>
            <Droplet size={22} fill="currentColor" />
          </span>
          <div>
            <span className="eyebrow dark" style={{ letterSpacing: '1.2px', fontSize: '10px' }}>
              STEP {step} OF 3
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '24px', letterSpacing: '-0.8px' }}>Donor Registration</h2>
            <small style={{ color: '#887d74', fontSize: '12px' }}>Join the lifesaving network.</small>
          </div>
        </div>

        {/* 3-Step Progress Indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            margin: '20px 0 24px',
            position: 'relative',
          }}
        >
          {[
            { num: 1, label: 'Identity' },
            { num: 2, label: 'Location' },
            { num: 3, label: 'Health' },
          ].map((item) => {
            const isCurrent = step === item.num;
            const isCompleted = step > item.num;
            return (
              <div
                key={item.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  background: isCurrent ? '#fbeae7' : isCompleted ? '#edf6ef' : '#f8f4ee',
                  border: `1px solid ${isCurrent ? '#e5aba5' : isCompleted ? '#cbe5d2' : '#e5dbd0'}`,
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isCurrent ? '#b13026' : isCompleted ? '#528d61' : '#d2c5b7',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {isCompleted ? <Check size={12} /> : item.num}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#b13026' : isCompleted ? '#447551' : '#887c73',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* STEP 1: PERSONAL IDENTITY */}
        {step === 1 && (
          <form onSubmit={handleStep1Continue} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid #eee5dc', paddingBottom: '10px', marginBottom: '2px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#2d2824' }}>Personal Identity</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#887d74' }}>
                Please provide your full legal name and verified blood group.
              </p>
            </div>

            <label>
              Full Name <span style={{ color: '#b13026' }}>*</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                autoFocus
              />
            </label>

            <label>
              Blood Group <span style={{ color: '#b13026' }}>*</span>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select blood group
                </option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="button button-primary" type="submit">
                CONTINUE <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: LOCATION DETAILS */}
        {step === 2 && (
          <form onSubmit={handleStep2Continue} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid #eee5dc', paddingBottom: '10px', marginBottom: '2px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#2d2824' }}>Location Details</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#887d74' }}>
                Accurate location ensures nearby emergency patients connect with you quickly.
              </p>
            </div>

            <label>
              Country <span style={{ color: '#b13026' }}>*</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)} required>
                <option value="India">India</option>
                <option value="Nepal">Nepal</option>
                <option value="Sri Lanka">Sri Lanka</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <div className="form-grid">
              <label>
                State / Region <span style={{ color: '#b13026' }}>*</span>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                  required
                />
              </label>

              <label>
                District <span style={{ color: '#b13026' }}>*</span>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Bengaluru Urban"
                  required
                />
              </label>
            </div>

            <label>
              City <span style={{ color: '#b13026' }}>*</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru / Koramangala"
                required
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
              >
                <ArrowLeft size={15} /> BACK
              </button>
              <button className="button button-primary" type="submit">
                CONTINUE <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: HEALTH DECLARATION */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid #eee5dc', paddingBottom: '10px', marginBottom: '2px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#2d2824' }}>Health Declaration</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#887d74' }}>
                Preliminary medical eligibility questions for patient and donor safety.
              </p>
            </div>

            <label>
              Last Alcohol Consumption <span style={{ color: '#b13026' }}>*</span>
              <select value={lastAlcohol} onChange={(e) => setLastAlcohol(e.target.value)} required>
                <option value="Never consumed">Never consumed</option>
                <option value="More than 7 days ago">More than 7 days ago</option>
                <option value="2–7 days ago">2–7 days ago</option>
                <option value="24–48 hours ago">24–48 hours ago</option>
                <option value="Within the last 24 hours">Within the last 24 hours</option>
              </select>
            </label>

            <label>
              Days Since Last Tattoo <span style={{ color: '#b13026' }}>*</span>
              <input
                type="number"
                min="0"
                value={tattooDays}
                onChange={(e) => setTattooDays(e.target.value)}
                placeholder="e.g. 0, 90, 200 (0 indicates no tattoo)"
                required
              />
            </label>

            {/* Informational Health Notice */}
            <div
              style={{
                background: '#fef7e7',
                border: '1px solid #f2dfa8',
                padding: '12px 14px',
                borderRadius: '4px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                color: '#7f5f14',
                fontSize: '11px',
                lineHeight: 1.55,
              }}
            >
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Medical Screening Notice:</strong>
                <p style={{ margin: '3px 0 0', color: '#8c6819' }}>
                  Note: Tattoos within 6 months (180 days) require special screening. Alcohol within 48 hours disqualifies you temporarily.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setStep(2);
                }}
              >
                <ArrowLeft size={15} /> BACK
              </button>
              <button className="button button-primary" type="submit" disabled={busy}>
                {busy ? 'Registering…' : 'COMPLETE REGISTRATION ✓'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

