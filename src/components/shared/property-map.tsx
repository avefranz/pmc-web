import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

interface PropertyMapProps {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
  className?: string;
}

// Custom pin that matches the screenshot style
function buildIcon() {
  return L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

export function PropertyMap({ lat, lng, label, height = 220, className }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
    });

    // ── Satellite base layer (Esri World Imagery — free, no API key) ──────────
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      },
    ).addTo(map);

    // ── Labels overlay (roads, place names, POIs) ─────────────────────────────
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 1 },
    ).addTo(map);

    // ── Marker ────────────────────────────────────────────────────────────────
    const marker = L.marker([lat, lng], { icon: buildIcon() }).addTo(map);
    if (label) marker.bindPopup(label);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div style={{ height }} className={className ?? "w-full rounded-2xl overflow-hidden border border-border"}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
