import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AgenciaRow } from "@/lib/supabase/types";
import { localNumberFromPos } from "@/utils/agencia";

const PERU_CENTER: [number, number] = [-9.19, -75.0152];

const ESTADO_COLOR: Record<string, string> = {
  "EN PRODUCCION": "#059669", // positive
  PENDIENTE: "#d97706", // amber
  INACTIVA: "#94a3b8", // muted
  "DADA DE BAJA": "#dc2626", // negative
};

interface Props {
  agencias: AgenciaRow[];
  onSelect?: (agencia: AgenciaRow) => void;
  selectedId?: string | null;
  // Optional — when provided, the popup also shows how many terminales that agencia has.
  terminalesCountById?: Map<string, number>;
}

// Recenters the map when `selectedId` changes (e.g. clicking a row in a list beside the
// map) — react-leaflet has no declarative "pan to" prop, so this reaches the underlying
// Leaflet map instance via useMap().
function FlyToSelected({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [position, map]);
  return null;
}

export function AgenciasMap({ agencias, onSelect, selectedId, terminalesCountById }: Props) {
  const withCoords = agencias.filter((a) => a.lat != null && a.lng != null);
  const center: [number, number] =
    withCoords.length > 0 ? [withCoords[0].lat as number, withCoords[0].lng as number] : PERU_CENTER;
  const selected = selectedId ? withCoords.find((a) => a.id === selectedId) : null;
  const selectedPosition: [number, number] | null = selected ? [selected.lat as number, selected.lng as number] : null;
  const markerRefs = useRef(new Map<string, LeafletCircleMarker>());

  useEffect(() => {
    if (selectedId) markerRefs.current.get(selectedId)?.openPopup();
  }, [selectedId]);

  return (
    <MapContainer center={center} zoom={withCoords.length > 0 ? 6 : 5} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected position={selectedPosition} />
      {withCoords.map((a) => {
        const isSelected = a.id === selectedId;
        const count = terminalesCountById?.get(a.id);
        return (
          <CircleMarker
            key={a.id}
            ref={(instance) => {
              if (instance) markerRefs.current.set(a.id, instance);
              else markerRefs.current.delete(a.id);
            }}
            center={[a.lat as number, a.lng as number]}
            radius={isSelected ? 11 : 7}
            pathOptions={{
              color: ESTADO_COLOR[a.estado] ?? "#64748b",
              fillColor: ESTADO_COLOR[a.estado] ?? "#64748b",
              fillOpacity: isSelected ? 1 : 0.85,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={onSelect ? { click: () => onSelect(a) } : undefined}
          >
            <Popup>
              <div style={{ fontFamily: "inherit", minWidth: 180 }}>
                {a.foto_url && (
                  <img
                    src={a.foto_url}
                    alt={a.nombre}
                    style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginBottom: 6 }}
                  />
                )}
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{a.nombre}</div>
                {a.direccion && <div style={{ fontSize: 12, color: "#64748b" }}>{a.direccion}</div>}
                <div style={{ fontSize: 12, color: "#64748b" }}>{a.departamento}</div>
                {a.encargado && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Agente: {a.encargado}</div>
                )}
                {localNumberFromPos(a.pos) && (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>N° local: {localNumberFromPos(a.pos)}</div>
                )}
                <div style={{ fontSize: 12, marginTop: 4, color: ESTADO_COLOR[a.estado] ?? "#64748b", fontWeight: 600 }}>
                  {a.estado}
                </div>
                {count != null && (
                  <div style={{ fontSize: 12, marginTop: 2, fontWeight: 700 }}>
                    {count} terminal{count === 1 ? "" : "es"}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

