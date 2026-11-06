import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin } from 'lucide-react';

interface DonorMarkerData {
  id: string;
  full_name: string;
  blood_group: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  distance_km?: number;
  is_available: boolean;
  is_verified: boolean;
}

interface HospitalMarkerData {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  blood_group: string;
  urgency: string;
}

interface InteractiveDonorMapProps {
  donors: DonorMarkerData[];
  requests?: HospitalMarkerData[];
  onSelectDonor?: (donor: DonorMarkerData) => void;
  onRequestBlood?: () => void;
}

export function InteractiveDonorMap({
  donors,
  requests = [],
  onSelectDonor,
  onRequestBlood,
}: InteractiveDonorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [filterMode, setFilterMode] = useState<'nearby' | 'all'>('nearby');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946, // Bengaluru center default
  });
  const [geoLocating, setGeoLocating] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tiles with warm saturation filter
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Center on user location when changed
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], filterMode === 'nearby' ? 13 : 11);
    }
  }, [userLocation, filterMode]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. User Location Marker
    const userIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          width: 34px; height: 34px; border-radius: 50%; background: #d29c44; border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold; font-size: 11px;">
          📍
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px;">
          <strong style="color: #b13026; display: block; margin-bottom: 2px;">Your Location</strong>
          <span>Bengaluru, Karnataka</span>
        </div>
      `)
      .addTo(markersLayerRef.current);

    // 2. Radius Circle in Nearby mode
    if (filterMode === 'nearby') {
      L.circle([userLocation.lat, userLocation.lng], {
        radius: 6000, // 6km radius
        color: '#b13026',
        weight: 1,
        fillColor: '#b13026',
        fillOpacity: 0.05,
        dashArray: '4, 8',
      }).addTo(markersLayerRef.current);
    }

    // 3. Donor Markers
    donors.forEach((donor) => {
      const coords = donor.coordinates || {
        lat: userLocation.lat + (Math.random() - 0.5) * 0.06,
        lng: userLocation.lng + (Math.random() - 0.5) * 0.06,
      };

      const donorIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
            background: #b13026; transform: rotate(-45deg);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 14px rgba(177, 48, 38, 0.4);
            border: 2px solid #fff;">
            <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 11px;">
              ${donor.blood_group}
            </span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -32],
      });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; min-width: 170px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 13px; color: #282421;">${donor.full_name}</strong>
            <span style="background: #f4dad5; color: #b13026; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 10px;">
              ${donor.blood_group}
            </span>
          </div>
          <p style="margin: 0 0 6px 0; color: #766d65; font-size: 11px;">${donor.location}</p>
          <div style="font-size: 10px; color: #5f956a; font-weight: 600; margin-bottom: 8px;">
            ● ${donor.is_available ? 'Available to donate now' : 'Currently offline'}
          </div>
        </div>
      `;

      const marker = L.marker([coords.lat, coords.lng], { icon: donorIcon })
        .bindPopup(popupHtml)
        .addTo(markersLayerRef.current!);

      marker.on('click', () => {
        if (onSelectDonor) onSelectDonor(donor);
      });
    });

    // 4. Emergency Hospital Request Markers
    requests.forEach((req) => {
      const hospitalIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: #2b2420; border: 2px solid #b13026;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); color: #fff; font-size: 14px;">
            🏥
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([req.coordinates.lat, req.coordinates.lng], { icon: hospitalIcon })
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #b13026; display: block; margin-bottom: 2px;">${req.name}</strong>
            <span style="font-size: 11px; color: #555;">Needs <b>${req.blood_group}</b> (${req.urgency.toUpperCase()})</span>
          </div>
        `)
        .addTo(markersLayerRef.current!);
    });
  }, [donors, requests, userLocation, filterMode, onSelectDonor]);

  // Request browser location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoLocating(false);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message);
        setGeoLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="map-card" style={{ position: 'relative', minHeight: '460px', overflow: 'hidden' }}>
      {/* Top Map Controls */}
      <div className="map-controls">
        <button
          className={`map-control ${filterMode === 'nearby' ? 'active' : ''}`}
          onClick={() => setFilterMode('nearby')}
        >
          Nearby (6 km)
        </button>
        <button
          className={`map-control ${filterMode === 'all' ? 'all' : ''} ${filterMode === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMode('all')}
        >
          All Bengaluru
        </button>
        <button
          className="map-control"
          onClick={handleLocateMe}
          title="Use my current location"
          disabled={geoLocating}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Crosshair size={13} /> {geoLocating ? 'Locating…' : 'My location'}
        </button>
      </div>

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '460px', zIndex: 1 }} />

      {/* Map Legend */}
      <div className="map-legend" style={{ zIndex: 2 }}>
        <span>
          <i className="legend-red" /> Verified Donors
        </span>
        <span>
          <i className="legend-cream" /> Your Position
        </span>
        <span>
          <MapPin size={11} style={{ display: 'inline', color: '#2b2420' }} /> Emergency Hospitals
        </span>
        {onRequestBlood && (
          <button
            onClick={onRequestBlood}
            style={{
              marginLeft: 'auto',
              border: 0,
              background: '#b13026',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Request Blood
          </button>
        )}
      </div>
    </div>
  );
}

