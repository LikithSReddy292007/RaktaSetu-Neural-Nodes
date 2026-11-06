import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Navigation, Phone, ShieldCheck, Video, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { RequestChatModal } from './RequestChatModal';

interface LiveRouteTrackerProps {
  request: {
    id: string;
    patient_name: string;
    hospital: string;
    hospital_address?: string;
    location: string;
    blood_group: string;
    coordinates?: { lat: number; lng: number };
    accepted_donor_name?: string;
    accepted_donor_phone?: string;
    status: string;
  };
  role: 'donor' | 'requester';
  currentUserName?: string;
  onCall: (channelName: string, recipientName: string) => void;
  onNotice?: (msg: string) => void;
  onStatusChanged?: (newStatus: string) => void;
}

export function LiveRouteTracker({
  request,
  role,
  currentUserName,
  onCall,
  onNotice,
  onStatusChanged,
}: LiveRouteTrackerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const donorMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);

  const [donorLocation, setDonorLocation] = useState<{ lat: number; lng: number; speed?: number }>({
    lat: request.coordinates?.lat ? request.coordinates.lat - 0.015 : 12.955,
    lng: request.coordinates?.lng ? request.coordinates.lng - 0.015 : 77.58,
  });

  const [distanceKm, setDistanceKm] = useState<number>(2.4);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [gpsActive, setGpsActive] = useState<boolean>(true);

  const hospitalCoord = request.coordinates || { lat: 12.9716, lng: 77.5946 };
  const channelName = `call_${request.id.replace(/^req_/, '')}`;
  const recipientName =
    role === 'donor'
      ? request.patient_name || 'Patient Family'
      : request.accepted_donor_name || 'Donor';

  const handleComplete = async () => {
    const confirmed = window.confirm(
      'Are you sure the blood donation is completed? This marks the request as fulfilled and starts the donor’s mandatory 90-day recovery cooldown timer.'
    );
    if (!confirmed) return;

    setIsActionBusy(true);
    try {
      await api.completeRequest(request.id);
      if (onNotice) {
        onNotice('Donation marked as completed! 90-day recovery cooldown timer activated.');
      }
      if (onStatusChanged) {
        onStatusChanged('fulfilled');
      }
    } catch (err: any) {
      if (onNotice) {
        onNotice(err.message || 'Error completing request.');
      }
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleTerminate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to terminate this active request? This will cancel the coordination and free up both parties so new requests can be raised.'
    );
    if (!confirmed) return;

    setIsActionBusy(true);
    try {
      await api.terminateRequest(request.id);
      if (onNotice) {
        onNotice('Active request has been terminated. You can now raise or accept new requests.');
      }
      if (onStatusChanged) {
        onStatusChanged('cancelled');
      }
    } catch (err: any) {
      if (onNotice) {
        onNotice(err.message || 'Error terminating request.');
      }
    } finally {
      setIsActionBusy(false);
    }
  };

  // Haversine calculation
  const getDistance = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1.lat * Math.PI) / 180) *
        Math.cos((c2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // DONOR: High-accuracy GPS watchPosition streaming to backend
  useEffect(() => {
    if (role !== 'donor') return;

    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const speed = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 25;

          setDonorLocation({ lat, lng, speed });
          setDistanceKm(getDistance({ lat, lng }, hospitalCoord));
          setLastUpdated(new Date().toLocaleTimeString());

          try {
            await api.updateLiveLocation({
              request_id: request.id,
              lat,
              lng,
              speed,
              heading: position.coords.heading || 0,
            });
          } catch {
            // Keep going with in-memory state
          }
        },
        () => {
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [request.id, role]);

  // REQUESTER: Poll backend every 3 seconds for donor's live coordinates
  useEffect(() => {
    if (role !== 'requester') return;

    const pollLocation = async () => {
      try {
        const res = await api.getLiveLocation(request.id);
        if (res.data) {
          const lat = res.data.lat;
          const lng = res.data.lng;
          const speed = res.data.speed;
          setDonorLocation({ lat, lng, speed });
          setDistanceKm(getDistance({ lat, lng }, hospitalCoord));
          setLastUpdated('Just now');
        }
      } catch {
        // Fallback
      }
    };

    void pollLocation();
    const interval = window.setInterval(pollLocation, 3000);
    return () => window.clearInterval(interval);
  }, [request.id, role]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [hospitalCoord.lat, hospitalCoord.lng],
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      // Hospital Marker (Crimson)
      const hospitalIcon = L.divIcon({
        className: 'hospital-marker',
        html: `
          <div style="width: 38px; height: 38px; border-radius: 50%; background: #b13026; border: 3px solid white; box-shadow: 0 4px 14px rgba(177, 48, 38, 0.4); display: grid; place-items: center; color: white; font-size: 16px;">
            🏥
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([hospitalCoord.lat, hospitalCoord.lng], { icon: hospitalIcon })
        .bindPopup(`<strong>${request.hospital}</strong><br/>${request.location}`)
        .addTo(map);

      // Donor Marker (Green pulsating)
      const donorIcon = L.divIcon({
        className: 'donor-live-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: #2e7d32; border: 3px solid white; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.45); display: grid; place-items: center; color: white; font-size: 14px;">
            🩸
            <span style="position: absolute; inset: -5px; border-radius: 50%; border: 2px solid #2e7d32; animation: pulse 1.6s infinite;"></span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const donorMarker = L.marker([donorLocation.lat, donorLocation.lng], { icon: donorIcon }).addTo(map);
      donorMarkerRef.current = donorMarker;

      // Polyline route
      const polyline = L.polyline(
        [
          [donorLocation.lat, donorLocation.lng],
          [hospitalCoord.lat, hospitalCoord.lng],
        ],
        { color: '#b13026', weight: 4, opacity: 0.7, dashArray: '6, 8' }
      ).addTo(map);
      polylineRef.current = polyline;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update donor marker and route when coordinates change
  useEffect(() => {
    if (donorMarkerRef.current) {
      donorMarkerRef.current.setLatLng([donorLocation.lat, donorLocation.lng]);
    }
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [donorLocation.lat, donorLocation.lng],
        [hospitalCoord.lat, hospitalCoord.lng],
      ]);
    }
  }, [donorLocation]);

  const openGoogleMapsNavigation = () => {
    const destinationQuery = encodeURIComponent(
      `${request.hospital}, ${request.hospital_address || request.location || 'Bengaluru'}`
    );
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&destination_place_id=&travelmode=driving`;
    window.open(navUrl, '_blank', 'noopener,noreferrer');
    if (onNotice) onNotice('Opened Google Maps turn-by-turn navigation.');
  };

  return (
    <div
      style={{
        background: '#fffdf9',
        border: '2px solid #c9b3a0',
        borderRadius: '6px',
        padding: '20px',
        margin: '18px 0',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e8f5e9',
              color: '#2e7d32',
              border: '1px solid #c8e6c9',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2e7d32' }} />
            REAL-TIME EN-ROUTE COORDINATION
          </span>
          <h3 style={{ margin: '4px 0 2px', fontSize: '18px', color: '#2b2420' }}>
            {role === 'donor'
              ? `Delivering blood to ${request.hospital}`
              : `${recipientName} is on their way with blood!`}
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#7a6f66' }}>
            Patient: <b>{request.patient_name}</b> · Required: <b>{request.blood_group}</b>
          </p>
        </div>

        {/* Action Controls: Agora Call, Direct Chat & Google Maps Navigation */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-secondary"
            style={{
              minHeight: '38px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#b13026',
              borderColor: '#b13026',
            }}
            onClick={() => setIsChatOpen(true)}
          >
            <MessageSquare size={14} /> Direct Chat 💬
          </button>

          {role === 'donor' && (
            <button
              type="button"
              className="button button-primary"
              style={{
                minHeight: '38px',
                padding: '0 14px',
                fontSize: '12px',
                background: '#1b5e20',
                borderColor: '#1b5e20',
              }}
              onClick={openGoogleMapsNavigation}
            >
              <ExternalLink size={14} /> Open in Google Maps 🧭
            </button>
          )}

          <button
            type="button"
            className="button button-primary"
            style={{ minHeight: '38px', padding: '0 14px', fontSize: '12px' }}
            onClick={() => onCall(channelName, recipientName)}
          >
            <Video size={15} /> Call {role === 'donor' ? 'Patient' : 'Donor'} (Agora)
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '8px',
          background: '#fbf7f2',
          border: '1px solid #ebdcd0',
          borderRadius: '4px',
          padding: '10px 14px',
          marginBottom: '14px',
          textAlign: 'center',
        }}
      >
        <div>
          <strong style={{ display: 'block', fontSize: '16px', color: '#b13026', fontWeight: 800 }}>
            ~{distanceKm} km
          </strong>
          <small style={{ fontSize: '10px', color: '#887d74', textTransform: 'uppercase' }}>Distance</small>
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: '16px', color: '#2e7d32', fontWeight: 800 }}>
            {donorLocation.speed || 25} km/h
          </strong>
          <small style={{ fontSize: '10px', color: '#887d74', textTransform: 'uppercase' }}>Donor Speed</small>
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: '16px', color: '#282421', fontWeight: 700 }}>
            ~{Math.max(2, Math.round(distanceKm * 2.5))} min
          </strong>
          <small style={{ fontSize: '10px', color: '#887d74', textTransform: 'uppercase' }}>Est. Arrival</small>
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: '14px', color: '#554a43', fontWeight: 600 }}>
            {lastUpdated}
          </strong>
          <small style={{ fontSize: '10px', color: '#887d74', textTransform: 'uppercase' }}>GPS Status</small>
        </div>
      </div>

      {/* Interactive Map */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '240px',
          borderRadius: '4px',
          border: '1px solid #d4c6b8',
          overflow: 'hidden',
        }}
      />

      <div
        style={{
          marginTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#8c8075',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={13} color="#2e7d32" /> Real-time peer tracking coordinates protected.
        </span>
        <span>
          Hospital: <b>{request.hospital}</b> ({request.location})
        </span>
      </div>

      {/* Coordination Management Toolbar: Complete Donation & Terminate Request */}
      <div
        style={{
          marginTop: '12px',
          padding: '12px 14px',
          background: '#f9f6f0',
          border: '1px solid #e7dcd2',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <strong style={{ display: 'block', fontSize: '13px', color: '#2b2420' }}>
            Coordination Status: Active
          </strong>
          <small style={{ fontSize: '11px', color: '#7a6f66' }}>
            Once the donation has taken place, complete it to record your lifesaving impact. Or terminate if cancelled.
          </small>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-primary"
            style={{
              background: '#2e7d32',
              borderColor: '#2e7d32',
              fontSize: '12px',
              padding: '0 14px',
              minHeight: '36px',
            }}
            onClick={handleComplete}
            disabled={isActionBusy}
          >
            <CheckCircle size={14} /> Complete Donation ✓
          </button>

          <button
            type="button"
            className="button button-secondary"
            style={{
              color: '#b13026',
              borderColor: '#b13026',
              fontSize: '12px',
              padding: '0 14px',
              minHeight: '36px',
            }}
            onClick={handleTerminate}
            disabled={isActionBusy}
          >
            <XCircle size={14} /> Terminate Request ✕
          </button>
        </div>
      </div>

      {/* Direct Peer Chat Modal with Anti-Payment Detection */}
      <RequestChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        requestId={request.id}
        currentRole={role}
        currentUserName={currentUserName || (role === 'donor' ? 'Donor' : 'Requester')}
        otherPartyName={recipientName}
      />
    </div>
  );
}

