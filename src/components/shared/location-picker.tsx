import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface ClickHandlerProps {
  onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Recenters the map when lat/lng change externally (e.g. after address search or city switch)
function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  zoom?: number;          // override zoom (16 = street, 11 = city overview)
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ lat, lng, zoom, onChange }: LocationPickerProps) {
  const center: [number, number] = (lat && lng) ? [lat, lng] : [13.7563, 100.5018];
  const resolvedZoom = zoom ?? ((lat && lng) ? 16 : 11);

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 210 }}>
      <MapContainer
        center={center}
        zoom={resolvedZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={onChange} />
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} />
            <Recenter lat={lat} lng={lng} zoom={resolvedZoom} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
