import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from '../lib/geo';
import type { Perch } from '../store/settings';
import type { Fix } from '../location/types';

const perchIcon = L.divIcon({ className: 'fp-marker', html: '<span class="fp-eye"></span>', iconSize: [32, 32], iconAnchor: [16, 16] });
const draftIcon = L.divIcon({ className: 'fp-marker', html: '<span class="fp-eye is-draft"></span>', iconSize: [32, 32], iconAnchor: [16, 16] });
const realIcon = L.divIcon({ className: 'fp-marker', html: '<span class="fp-real"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });

export interface FlyTarget extends LatLng {
  zoom?: number;
  key: number;
}

function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const zoom = Math.max(map.getZoom(), target.zoom ?? 14);
    if (reduce) map.setView([target.lat, target.lng], zoom);
    else map.flyTo([target.lat, target.lng], zoom, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function TapToDrop({ onTap }: { onTap: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

interface Props {
  perch: Perch | null;
  draft: LatLng | null;
  real: Fix | null;
  flyTarget: FlyTarget | null;
  onTap: (p: LatLng) => void;
}

export default function MapView({ perch, draft, real, flyTarget, onTap }: Props) {
  const start: [number, number] = perch ? [perch.lat, perch.lng] : [20, 0];
  return (
    <MapContainer
      center={start}
      zoom={perch ? 13 : 2}
      zoomControl={false}
      worldCopyJump
      className="absolute inset-0 z-0"
      aria-label="Map. Tap anywhere to choose a new perch."
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <TapToDrop onTap={onTap} />
      <FlyTo target={flyTarget} />
      {real && (
        <>
          {real.accuracy && (
            <Circle
              center={[real.lat, real.lng]}
              radius={real.accuracy}
              pathOptions={{ color: '#4a5d6b', weight: 1, fillOpacity: 0.12 }}
            />
          )}
          <Marker position={[real.lat, real.lng]} icon={realIcon} title="Your real location (this session only)" />
        </>
      )}
      {perch && <Marker position={[perch.lat, perch.lng]} icon={perchIcon} title={`Perch: ${perch.label}`} />}
      {draft && <Marker position={[draft.lat, draft.lng]} icon={draftIcon} title="New perch (not set yet)" />}
    </MapContainer>
  );
}
