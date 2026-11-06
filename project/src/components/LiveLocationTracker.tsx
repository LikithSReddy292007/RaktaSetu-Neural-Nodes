import { useEffect, useState } from 'react';
import { Navigation, Pause, Play, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

interface LiveLocationTrackerProps {
  requestId: string;
  isDonor: boolean;
  onNotice?: (msg: string) => void;
}

export function LiveLocationTracker({ requestId, isDonor, onNotice }: LiveLocationTrackerProps) {
  const [tracking, setTracking] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; speed?: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let watchId: number | null = null;

    if (tracking) {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your device.');
        setTracking(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const speed = position.coords.speed ? Math.round(position.coords.speed * 3.6) : undefined; // km/h

          setCoords({ lat, lng, speed });
          setLastUpdate(new Date().toLocaleTimeString());

          try {
            await api.updateLiveLocation({
              request_id: requestId,
              lat,
              lng,
              heading: position.coords.heading || 0,
              speed,
            });
          } catch (err: any) {
            console.warn('Failed to broadcast live location:', err.message);
          }
        },
        (geoError) => {
          console.warn('Location tracking error:', geoError.message);
          setError('Location permission denied or unavailable.');
          setTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [tracking, requestId]);

  const toggleTracking = () => {
    if (!tracking) {
      setError('');
      setTracking(true);
      if (onNotice) onNotice('Live location tracking started.');
    } else {
      setTracking(false);
      if (onNotice) onNotice('Live location tracking stopped.');
    }
  };

  return (
    <div
      style={{
        background: '#fffdf9',
        border: '1px solid #e2d7cc',
        padding: '18px',
        borderRadius: '4px',
        marginTop: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`pulse-dot ${tracking ? 'on' : ''}`} style={{ background: tracking ? '#5c9a6d' : '#bdb3aa' }} />
          <strong style={{ fontSize: '13px' }}>
            {tracking ? 'Live En-Route Tracking Active' : 'Live Location Tracking'}
          </strong>
        </div>
        {isDonor && (
          <button
            onClick={toggleTracking}
            className={`button ${tracking ? 'button-secondary' : 'button-primary'}`}
            style={{ minHeight: '34px', padding: '0 12px', fontSize: '11px' }}
          >
            {tracking ? (
              <>
                <Pause size={13} /> Stop sharing
              </>
            ) : (
              <>
                <Play size={13} /> Share my live location
              </>
            )}
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#81776f' }}>
        {tracking
          ? 'Your real-time GPS coordinates are securely shared with the requester to coordinate blood donation arrival.'
          : 'Share your location when you are on your way to the hospital so the patient family knows you are arriving.'}
      </p>

      {coords && tracking && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: '11px',
            background: '#f8f4ee',
            padding: '10px 14px',
            borderRadius: '4px',
            color: '#473f39',
          }}
        >
          <span>
            <Navigation size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Lat: <b>{coords.lat.toFixed(4)}</b>, Lng: <b>{coords.lng.toFixed(4)}</b>
          </span>
          {coords.speed !== undefined && (
            <span>
              Speed: <b>{coords.speed} km/h</b>
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: '#958a81' }}>Updated {lastUpdate}</span>
        </div>
      )}

      {error && (
        <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
          <ShieldAlert size={14} /> {error}
        </div>
      )}
    </div>
  );
}

