import { useState, useEffect } from 'react';
import { Clock, Droplet, HeartPulse, Hospital, MapPin, ShieldAlert, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';

interface NearbyEmergencyNotificationProps {
  donorGroup?: string;
  donorCoordinates?: { lat: number; lng: number };
  onAccepted?: (request: any) => void;
  onClose?: () => void;
}

export function NearbyEmergencyNotification({
  donorGroup,
  donorCoordinates,
  onAccepted,
  onClose,
}: NearbyEmergencyNotificationProps) {
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

  // Play gentle alert chime for urgent nearby request
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy
    }
  };

  const fetchNearby = async () => {
    try {
      const res = await api.getNearbyAlertForDonor({
        group: donorGroup || 'all',
        lat: donorCoordinates?.lat || 12.9716,
        lng: donorCoordinates?.lng || 77.5946,
      });

      if (res.data) {
        // If a new request arrives that hasn't been dismissed
        if (res.data.id !== dismissedId) {
          setRequest(res.data);
          if (res.data.id !== lastNotifiedId) {
            setLastNotifiedId(res.data.id);
            playChime();
          }
        } else {
          setRequest(null);
        }
      } else {
        setRequest(null);
      }
    } catch (err) {
      console.warn('Failed to load nearby emergency alert:', err);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  // Real-time polling: fetch every 3 seconds so friends receive alerts instantly!
  useEffect(() => {
    void fetchNearby();
    const interval = window.setInterval(() => {
      void fetchNearby();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [donorGroup, donorCoordinates, dismissedId]);

  // Calculate dynamic relative time from request created_at
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleSkip = async () => {
    if (request?.id) {
      setDismissedId(request.id);
      try {
        await api.skipRequest(request.id);
      } catch {
        // Ignore
      }
    }
    setRequest(null);
    if (onClose) onClose();
  };

  const handleAccept = async () => {
    if (!request?.id) return;
    setBusy(true);
    setFeedback(null);

    try {
      const res = await api.acceptRequest(request.id);
      setFeedback({
        type: 'success',
        message: 'Request accepted! You are now connected with the hospital. Live navigation & tracking active.',
      });

      if (onAccepted) onAccepted(res.data || request);
      window.setTimeout(() => {
        setDismissedId(request.id);
        setRequest(null);
        if (onClose) onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to accept this request. It may be fulfilled or expired.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !request || request.id === dismissedId) {
    return null;
  }

  const distanceText =
    typeof request.distance_km === 'number'
      ? `~${request.distance_km.toFixed(1)} km`
      : '~2.4 km';

  const severityText = request.severity || (request.urgency === 'critical' ? 'Emergency' : 'Urgent');
  const postedText = getRelativeTime(request.created_at);

  return (
    <div
      style={{
        margin: '20px auto 30px auto',
        width: 'min(580px, 100%)',
        animation: 'modal-in 0.3s ease-out',
      }}
    >
      <div
        style={{
          background: '#fffdf9',
          border: '2px solid #b13026',
          boxShadow: '0 12px 35px rgba(177, 48, 38, 0.16)',
          borderRadius: '6px',
          padding: '24px 26px',
          position: 'relative',
        }}
      >
        <button
          onClick={handleSkip}
          aria-label="Skip"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            border: 0,
            background: 'transparent',
            color: '#9e9185',
            padding: '4px',
            cursor: 'pointer',
          }}
        >
          <X size={17} />
        </button>

        {/* 1. Blood drop icon inside a circular container & 2. Badge: 🚨 URGENT REQUEST */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#f4dad5',
              color: '#b13026',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 4px #faeae7',
            }}
          >
            <Droplet size={20} fill="currentColor" />
          </div>

          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#fbeae7',
                color: '#b13026',
                border: '1px solid #eab7b1',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.8px',
              }}
            >
              🚨 URGENT REQUEST
            </span>
            {/* 3. Main Heading: Blood Request Nearby */}
            <h3
              style={{
                margin: '2px 0 0',
                fontSize: '20px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 800,
                color: '#282421',
                letterSpacing: '-0.5px',
              }}
            >
              Blood Request Nearby
            </h3>
          </div>
        </div>

        {/* 4. Blood Group Badge & 5. Patient Info & 6. Hospital Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: '#fbf7f2',
            border: '1px solid #ebdcd0',
            padding: '14px 16px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              minWidth: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#b13026',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '15px',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(177, 48, 38, 0.28)',
            }}
          >
            {request.blood_group}
          </div>

          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '15px', color: '#2b2521', marginBottom: '2px' }}>
              {request.patient_name} needs blood
            </strong>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: '#7f746b',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Hospital size={13} color="#94877e" /> {request.hospital}
              {request.location && request.location !== request.hospital && (
                <span>· {request.location}</span>
              )}
            </p>
          </div>
        </div>

        {/* 7. Request Information Panel with Three Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: '#fff',
            border: '1px solid #e7ded4',
            borderRadius: '4px',
            padding: '12px 14px',
            textAlign: 'center',
            marginBottom: '18px',
          }}
        >
          {/* COLUMN 1: Severity */}
          <div style={{ borderRight: '1px solid #eee5dc', paddingRight: '8px' }}>
            <strong style={{ display: 'block', fontSize: '14px', color: '#b13026', fontWeight: 800 }}>
              {severityText}
            </strong>
            <small style={{ fontSize: '10px', color: '#9c9187', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Severity
            </small>
          </div>

          {/* COLUMN 2: Distance */}
          <div style={{ borderRight: '1px solid #eee5dc', paddingRight: '8px' }}>
            <strong style={{ display: 'block', fontSize: '14px', color: '#282421', fontWeight: 700 }}>
              {distanceText}
            </strong>
            <small style={{ fontSize: '10px', color: '#9c9187', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Distance
            </small>
          </div>

          {/* COLUMN 3: Posted */}
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#282421', fontWeight: 700 }}>
              {postedText}
            </strong>
            <small style={{ fontSize: '10px', color: '#9c9187', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Posted
            </small>
          </div>
        </div>

        {feedback && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              marginBottom: '14px',
              background: feedback.type === 'success' ? '#ebf6ee' : '#f8e1de',
              color: feedback.type === 'success' ? '#2e6b3f' : '#a52e27',
              border: `1px solid ${feedback.type === 'success' ? '#c4e5cc' : '#f2c6bf'}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* ACTION BUTTONS: SKIP and ACCEPT REQUEST */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleSkip}
            disabled={busy}
            style={{ minHeight: '44px', fontWeight: 700, fontSize: '12px' }}
          >
            SKIP
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={handleAccept}
            disabled={busy}
            style={{ minHeight: '44px', fontWeight: 700, fontSize: '12px' }}
          >
            {busy ? 'Processing…' : 'ACCEPT REQUEST'}
          </button>
        </div>
      </div>
    </div>
  );
}

