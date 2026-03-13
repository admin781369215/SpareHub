import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition, onLocationSelect }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void, onLocationSelect: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function LocationPicker({ initialLat, initialLng, onLocationSelect }: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  
  // Default center (Riyadh, Saudi Arabia) if no initial position
  const defaultCenter: [number, number] = [24.7136, 46.6753];
  const center: [number, number] = initialLat && initialLng ? [initialLat, initialLng] : defaultCenter;

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition(new L.LatLng(initialLat, initialLng));
    }
  }, [initialLat, initialLng]);

  return (
    <div className="h-64 w-full rounded-md overflow-hidden border border-brand-border z-0 relative">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}
