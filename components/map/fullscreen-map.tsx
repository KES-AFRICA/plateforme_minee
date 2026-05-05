"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Satellite, Check } from "lucide-react";
import type { WaypointClickData } from "@/components/map/support-reas-modal";

export interface EquipmentRecord {
  m_rid: string | number;
  name?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lattitude?: number | string | null;
  type?: string;
  table?: string;
  [key: string]: unknown;
}

interface WireWaypoint {
  lat: number;
  lng: number;
  type: string;
  troncon_index?: number;
  support_index?: number;
  wire_id?: number;
}

interface WireSegment {
  type: "aerien" | "souterrain" | "remontee";
  coordinates: [number, number][];
  waypoints?: WireWaypoint[];
}

interface FullscreenMapProps {
  equipments?: Record<string, unknown>[];
  wires?: any[];
  onMarkerClick?:   (equipment: Record<string, unknown>) => void;
  onWireClick?:     (wire: any) => void;
  onWaypointClick?: (data: WaypointClickData) => void;
  feederColor?: string;
  wireColor?: string;
}

type LayerType = "street" | "satellite";

const TABLE_COLORS: Record<string, string> = {
  feeder: "#06b6d4", substation: "#3b82f6", powertransformer: "#8b5cf6",
  busbar: "#f59e0b", bay: "#10b981", switch: "#ef4444", pole: "#78716c", node: "#9ca3af",
};

function segmentStyle(type: string, color: string) {
  if (type === "souterrain") return { color, weight: 4, opacity: 0.85, dashArray: "12 7" };
  if (type === "remontee")   return { color, weight: 4, opacity: 0.85, dashArray: "12 7" };
  return                            { color, weight: 5, opacity: 0.95, dashArray: null   };
}

// ── Résolution des coordonnées nulles via les autres wires ────────────────────

/**
 * Pour un wire dont debut_coords est null (ex: dérivation en début),
 * cherche dans tous les autres wires celui qui a ce code comme FIN
 * et récupère ses fin_coords, ou comme DÉBUT et récupère ses debut_coords.
 */
function resolveNullDebutCoords(
  wire: any,
  allWires: any[]
): [number, number] | null {
  const debutCode = wire.debut?.code;
  if (!debutCode) return null;

  for (const other of allWires) {
    if (other.id === wire.id) continue;
    // Notre début = fin d'un autre wire
    if (
      other.fin?.code === debutCode &&
      other.fin?.latitude != null &&
      other.fin?.longitude != null
    ) {
      return [other.fin.latitude, other.fin.longitude];
    }
    // Notre début = début d'un autre wire (même nœud)
    if (
      other.debut?.code === debutCode &&
      other.debut?.latitude != null &&
      other.debut?.longitude != null
    ) {
      return [other.debut.latitude, other.debut.longitude];
    }
  }
  return null;
}

function resolveNullFinCoords(
  wire: any,
  allWires: any[]
): [number, number] | null {
  const finCode = wire.fin?.code;
  if (!finCode) return null;

  for (const other of allWires) {
    if (other.id === wire.id) continue;
    // Notre fin = début d'un autre wire
    if (
      other.debut?.code === finCode &&
      other.debut?.latitude != null &&
      other.debut?.longitude != null
    ) {
      return [other.debut.latitude, other.debut.longitude];
    }
    // Notre fin = fin d'un autre wire (même nœud)
    if (
      other.fin?.code === finCode &&
      other.fin?.latitude != null &&
      other.fin?.longitude != null
    ) {
      return [other.fin.latitude, other.fin.longitude];
    }
  }
  return null;
}

// ── Icônes waypoints ──────────────────────────────────────────────────────────

function makeWaypointIcon(L: any, wpType: string, hasDetail: boolean): any {
  const configs: Record<string, { color: string; label: string; shape: "square" | "diamond" | "circle" | "pentagon" }> = {
    // Supports aériens
    support:  { color: "#22c55e", label: "S", shape: "square"   },
    // Remontées REAS
    remontee: { color: "#f59e0b", label: "R", shape: "square"   },
    // Points remarquables souterrains (toutes variantes)
    "Borne ou balise de signalisation": { color: "#06b6d4", label: "P", shape: "diamond" },
    "Marquage au sol":                  { color: "#06b6d4", label: "P", shape: "diamond" },
    "Borne":                            { color: "#06b6d4", label: "P", shape: "diamond" },
    "Balise":                           { color: "#06b6d4", label: "P", shape: "diamond" },
    balise:                             { color: "#06b6d4", label: "P", shape: "diamond" },
    marquage:                           { color: "#06b6d4", label: "P", shape: "diamond" },
    point_remarquable:                  { color: "#06b6d4", label: "P", shape: "diamond" },
    // OCR
    ocr:        { color: "#8b5cf6", label: "O", shape: "circle"  },
    OCR:        { color: "#8b5cf6", label: "O", shape: "circle"  },
    "OCR_fin":  { color: "#8b5cf6", label: "O", shape: "circle"  },
    // Dérivations
    derivation: { color: "#f97316", label: "D", shape: "pentagon" },
    Derivation: { color: "#f97316", label: "D", shape: "pentagon" },
    "derivation_fin": { color: "#f97316", label: "D", shape: "pentagon" },
    // Inconnu
    aucune:     { color: "#6b7280", label: "?", shape: "square"  },
  };

  // Fallback par correspondance partielle
  let cfg = configs[wpType];
  if (!cfg) {
    const lc = wpType.toLowerCase();
    if (lc.includes("borne") || lc.includes("balise") || lc.includes("signali") || lc.includes("remarq"))
      cfg = { color: "#06b6d4", label: "P", shape: "diamond" };
    else if (lc.includes("marqu"))
      cfg = { color: "#06b6d4", label: "P", shape: "diamond" };
    else if (lc.includes("ocr"))
      cfg = { color: "#8b5cf6", label: "O", shape: "circle" };
    else if (lc.includes("deriv"))
      cfg = { color: "#f97316", label: "D", shape: "pentagon" };
    else if (lc.includes("remont"))
      cfg = { color: "#f59e0b", label: "R", shape: "square" };
    else
      cfg = { color: "#6b7280", label: "?", shape: "square" };
  }

  const { color, label, shape } = cfg;
  const cursor = hasDetail ? "cursor:pointer;" : "";
  const ring   = hasDetail ? `stroke="#fff" stroke-width="2"` : `stroke="#fff" stroke-width="1.5"`;
  const size   = hasDetail ? 18 : 14;
  const h      = size / 2;

  let shapeEl = "";
  if (shape === "diamond") {
    // Losange pour les points remarquables
    shapeEl = `<polygon points="${h},2 ${size - 2},${h} ${h},${size - 2} 2,${h}" fill="${color}" ${ring}/>`;
  } else if (shape === "circle") {
    // Cercle pour OCR
    shapeEl = `<circle cx="${h}" cy="${h}" r="${h - 2}" fill="${color}" ${ring}/>`;
  } else if (shape === "pentagon") {
    // Pentagone pour Dérivation
    const r = h - 2;
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      return `${(h + r * Math.cos(a)).toFixed(1)},${(h + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    shapeEl = `<polygon points="${pts}" fill="${color}" ${ring}/>`;
  } else {
    // Carré arrondi pour support / REAS / autres
    shapeEl = `<rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="2.5" fill="${color}" ${ring}/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
    viewBox="0 0 ${size} ${size}" style="${cursor}">
    ${shapeEl}
    <text x="${h}" y="${h + 3.5}" text-anchor="middle"
      font-size="${hasDetail ? 8 : 7}" font-weight="700"
      fill="white" font-family="sans-serif">${label}</text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className:   "",
    iconSize:    [size, size],
    iconAnchor:  [h, h],
    popupAnchor: [0, -(h + 4)],
  });
}

// ── Helpers génériques ────────────────────────────────────────────────────────

function getCoords(eq: EquipmentRecord): [number, number] | null {
  const lat = parseFloat(String(eq.latitude ?? eq.lattitude ?? ""));
  const lng = parseFloat(String(eq.longitude ?? ""));
  if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) return [lat, lng];
  return null;
}

function makeSVGIcon(eq: EquipmentRecord, L: any): any {
  const color   = TABLE_COLORS[eq.table || ""] || "#6366f1";
  const typeRaw = (eq.type as string) ?? "";
  const label   = typeRaw === "H61" ? "H61" : typeRaw === "H59" ? "H59" : typeRaw ? "S" : "";
  let shape = "";
  const t = eq.table || "";
  if (t === "substation") {
    if (typeRaw === "H61")      shape = `<circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2.5"/>`;
    else if (typeRaw === "H59") shape = `<rect x="3" y="3" width="22" height="22" rx="3" fill="${color}" stroke="white" stroke-width="2.5"/>`;
    else                        shape = `<rect x="2" y="6" width="24" height="16" rx="3" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  } else if (t === "feeder")          shape = `<circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  else if (t === "powertransformer")  shape = `<rect x="4" y="4" width="20" height="20" rx="3" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  else if (t === "busbar")            shape = `<polygon points="14,4 24,14 14,24 4,14" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  else if (t === "switch")            shape = `<polygon points="9,4 19,4 24,9 24,19 19,24 9,24 4,19 4,9" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  else if (t === "pole")              shape = `<polygon points="14,4 24,22 4,22" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  else                                shape = `<circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  const labelEl = label
    ? `<text x="14" y="18" text-anchor="middle" font-size="9" font-weight="700" fill="white" font-family="sans-serif">${label}</text>`
    : `<circle cx="14" cy="14" r="3" fill="white" opacity="0.9"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="32" height="32">${shape}${labelEl}</svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18] });
}

function makePopupHtml(eq: EquipmentRecord): string {
  const color    = TABLE_COLORS[eq.table || ""] || "#6366f1";
  const skipKeys = new Set(["latitude", "longitude", "lattitude", "m_rid"]);
  const rows = Object.entries(eq)
    .filter(([k]) => !k.startsWith("_") && !skipKeys.has(k))
    .slice(0, 10)
    .map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px solid #f0f0f0">
      <span style="color:#888;font-size:10px;white-space:nowrap">${k}</span>
      <span style="font-family:monospace;font-size:10px;text-align:right;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${String(v ?? "—")}</span>
    </div>`).join("");
  return `<div style="font-family:sans-serif;min-width:200px;max-width:280px">
    <div style="font-weight:700;font-size:13px;margin-bottom:4px;padding-bottom:4px;border-bottom:2px solid ${color};color:${color}">${eq.name || eq.m_rid}</div>
    <div style="font-size:10px;background:#f5f5f5;padding:2px 8px;border-radius:4px;display:inline-block;margin-bottom:6px;color:#555">${eq.table || "équipement"} — ${eq.m_rid}</div>
    <div>${rows}</div>
  </div>`;
}

function makeWirePopupHtml(wire: any): string {
  const typeLabel = wire.type === "souterrain" ? "Souterrain" : wire.type === "mixte" ? "Mixte" : "Aérien";
  return `<div style="font-family:sans-serif;min-width:180px;max-width:280px">
    <div style="font-weight:700;font-size:13px;margin-bottom:4px;padding-bottom:4px;border-bottom:2px solid #a855f7;color:#a855f7">Wire (${wire.feeder_name || "Ligne"})</div>
    <div style="font-size:10px;background:#f5f5f5;padding:2px 8px;border-radius:4px;display:inline-block;margin-bottom:6px;color:#555">ID: ${wire.id || "N/A"}</div>
    <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;">
      <div><strong>Type:</strong> ${typeLabel}</div>
      <div><strong>Tronçons:</strong> ${wire.segments?.length ?? 1}</div>
      <div><strong>Début:</strong> ${wire.debut?.type || "N/A"}</div>
      <div><strong>Fin:</strong> ${wire.fin?.type || "N/A"}</div>
    </div>
  </div>`;
}

function makeWaypointPopupHtml(wp: WireWaypoint): string {
  const labels: Record<string, string> = {
    support:   "Support aérien",
    remontee:  "Remontée REAS",
    balise:    "Balise souterraine",
    marquage:  "Marquage souterrain",
    aucune:    "Point souterrain",
    ocr:       "OCR",
    OCR:       "OCR",
    derivation:"Dérivation",
    Derivation:"Dérivation",
  };
  const lc = wp.type.toLowerCase();
  let typeLabel = labels[wp.type] ?? wp.type;
  if (!labels[wp.type]) {
    if (lc.includes("borne") || lc.includes("balise") || lc.includes("signali") || lc.includes("remarq"))
      typeLabel = "Point remarquable";
    else if (lc.includes("marqu")) typeLabel = "Marquage souterrain";
    else if (lc.includes("ocr"))   typeLabel = "OCR";
    else if (lc.includes("deriv")) typeLabel = "Dérivation";
  }
  return `<div style="font-family:sans-serif;font-size:11px;min-width:160px">
    <div style="font-weight:700;color:#22c55e;margin-bottom:4px">${typeLabel}</div>
    <div>📍 ${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}</div>
    ${wp.troncon_index !== undefined ? `<div style="color:#888;font-size:10px;margin-top:2px">Tronçon ${(wp.troncon_index ?? 0) + 1}</div>` : ""}
  </div>`;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function FullscreenMap({
  equipments = [], wires = [],
  onMarkerClick, onWireClick, onWaypointClick,
  feederColor = "#6366f1", wireColor = "#e11d48",
}: FullscreenMapProps) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<any>(null);
  const tileRef       = useRef<any>(null);
  const layerGroup    = useRef<any>(null);

  // ── Callbacks stables via ref — zéro re-render/dezoom ───────────────────────
  const onMarkerClickRef   = useRef(onMarkerClick);
  const onWireClickRef     = useRef(onWireClick);
  const onWaypointClickRef = useRef(onWaypointClick);
  useEffect(() => { onMarkerClickRef.current   = onMarkerClick;   }, [onMarkerClick]);
  useEffect(() => { onWireClickRef.current     = onWireClick;     }, [onWireClick]);
  useEffect(() => { onWaypointClickRef.current = onWaypointClick; }, [onWaypointClick]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLayerOpen,  setIsLayerOpen]  = useState(false);
  const [currentLayer, setCurrentLayer] = useState<LayerType>("satellite");

  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet.min.css"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapInst.current?.invalidateSize(), 150);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    isFullscreen ? document.exitFullscreen() : containerRef.current.requestFullscreen();
  };

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    let alive = true;
    import("leaflet").then((L) => {
      if (!alive || !mapRef.current || mapInst.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false, scrollWheelZoom: true });
      const url = currentLayer === "street"
        ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      tileRef.current    = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
      layerGroup.current = L.layerGroup().addTo(map);
      mapInst.current    = map;
    });
    return () => { alive = false; mapInst.current?.remove(); mapInst.current = null; layerGroup.current = null; };
  }, []);

  const handleLayerChange = (layer: LayerType) => {
    setCurrentLayer(layer); setIsLayerOpen(false);
    if (!mapInst.current) return;
    import("leaflet").then((L) => {
      if (tileRef.current) mapInst.current.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(
        layer === "street"
          ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      ).addTo(mapInst.current);
    });
  };

  useEffect(() => {
    let rafId: number;
    const render = () => {
      if (!mapInst.current || !layerGroup.current) { rafId = requestAnimationFrame(render); return; }
      import("leaflet").then((L) => {
        if (!mapInst.current || !layerGroup.current) return;
        layerGroup.current.clearLayers();
        const allCoords: [number, number][] = [];

        // ── 1. WIRES (en bas) ─────────────────────────────────────────────────
        for (const wire of wires) {

          // ── Résolution coords nulles via les autres wires ──────────────────
          let debutLat: number | null = wire.debut?.latitude  ?? null;
          let debutLng: number | null = wire.debut?.longitude ?? null;
          let finLat:   number | null = wire.fin?.latitude    ?? null;
          let finLng:   number | null = wire.fin?.longitude   ?? null;

          if (debutLat == null || debutLng == null) {
            const resolved = resolveNullDebutCoords(wire, wires);
            if (resolved) { [debutLat, debutLng] = resolved; }
          }
          if (finLat == null || finLng == null) {
            const resolved = resolveNullFinCoords(wire, wires);
            if (resolved) { [finLat, finLng] = resolved; }
          }

          // ── Construction des segments avec coords résolues ─────────────────
          const segments: WireSegment[] =
            wire.segments && wire.segments.length > 0
              ? wire.segments.map((seg: WireSegment, i: number) => {
                  const coords = [...(seg.coordinates ?? [])];
                  // Premier segment : injecter le début si manquant
                  if (i === 0 && debutLat != null && debutLng != null) {
                    const first = coords[0];
                    if (!first || isNaN(first[0]) || isNaN(first[1])) {
                      coords.unshift([debutLng, debutLat]);
                    }
                  }
                  // Dernier segment : injecter la fin si manquante
                  if (i === wire.segments.length - 1 && finLat != null && finLng != null) {
                    const last = coords[coords.length - 1];
                    if (!last || isNaN(last[0]) || isNaN(last[1])) {
                      coords.push([finLng, finLat]);
                    }
                  }
                  return { ...seg, coordinates: coords };
                })
              : [{
                  type: (wire.type === "souterrain" ? "souterrain" : "aerien") as WireSegment["type"],
                  coordinates: [
                    ...(debutLat != null && debutLng != null ? [[debutLng, debutLat] as [number, number]] : []),
                    ...(wire.coordinates ?? []),
                    ...(finLat != null && finLng != null ? [[finLng, finLat] as [number, number]] : []),
                  ],
                  waypoints: wire.waypoints ?? [],
                }];

          // ── Tracé des segments ─────────────────────────────────────────────
          for (const seg of segments) {
            if (!seg.coordinates || seg.coordinates.length < 2) continue;
            const leafletCoords = seg.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
            const style = segmentStyle(seg.type, wireColor);
            const opts: any = { color: style.color, weight: style.weight, opacity: style.opacity, smoothFactor: 1 };
            if (style.dashArray) opts.dashArray = style.dashArray;
            const polyline = L.polyline(leafletCoords, opts);
            polyline.bindPopup(makeWirePopupHtml(wire), { maxWidth: 300 });
            polyline.on("click", (e: any) => { e.originalEvent?.stopPropagation?.(); onWireClickRef.current?.(wire); });
            polyline.addTo(layerGroup.current);
            for (const [lng, lat] of seg.coordinates) allCoords.push([lat, lng]);

            // ── Waypoints du segment ─────────────────────────────────────────
            for (const wp of seg.waypoints ?? []) {
              if (wp.type === "aucune") continue;
              const isClickable =
                (wp.type === "support" || wp.type === "remontee") && !!wire.id;
              const icon   = makeWaypointIcon(L, wp.type, isClickable);
              const marker = L.marker([wp.lat, wp.lng], { icon, zIndexOffset: -100 });

              marker.bindPopup(makeWaypointPopupHtml(wp), { maxWidth: 220 });

              if (isClickable) {
                const _wire_id       = wire.id as number;
                const _troncon_index = (wp.troncon_index ?? 0) + 1;
                const _support_index = (wp.support_index ?? 0) + 1;
                const _type          = wp.type as "support" | "remontee";

                marker.on("click", (e: any) => {
                  e.originalEvent?.stopPropagation?.();
                  marker.openPopup();
                  if (_type === "support") {
                    onWaypointClickRef.current?.({
                      type: "support",
                      wire_id: _wire_id,
                      troncon_index: _troncon_index,
                      support_index: _support_index,
                    });
                  } else {
                    onWaypointClickRef.current?.({
                      type: "remontee",
                      wire_id: _wire_id,
                      troncon_index: _troncon_index,
                    });
                  }
                });
              }

              marker.addTo(layerGroup.current);
            }
          }

          // ── Waypoints de niveau wire (fallback ancienne structure) ──────────
          if (!wire.segments || wire.segments.length === 0) {
            for (const wp of wire.waypoints ?? []) {
              if (wp.type === "aucune") continue;
              const isClickable =
                (wp.type === "support" || wp.type === "remontee") && !!wire.id;
              const icon   = makeWaypointIcon(L, wp.type, isClickable);
              const marker = L.marker([wp.lat, wp.lng], { icon, zIndexOffset: -100 });

              marker.bindPopup(makeWaypointPopupHtml(wp), { maxWidth: 220 });

              if (isClickable) {
                const _wire_id       = wire.id as number;
                const _troncon_index = (wp.troncon_index ?? 0) + 1;
                const _support_index = (wp.support_index ?? 0) + 1;
                const _type          = wp.type as "support" | "remontee";

                marker.on("click", (e: any) => {
                  e.originalEvent?.stopPropagation?.();
                  marker.openPopup();
                  if (_type === "support") {
                    onWaypointClickRef.current?.({
                      type: "support",
                      wire_id: _wire_id,
                      troncon_index: _troncon_index,
                      support_index: _support_index,
                    });
                  } else {
                    onWaypointClickRef.current?.({
                      type: "remontee",
                      wire_id: _wire_id,
                      troncon_index: _troncon_index,
                    });
                  }
                });
              }

              marker.addTo(layerGroup.current);
            }
          }
        }

        // ── 2. ÉQUIPEMENTS (au-dessus des wires) ──────────────────────────────
        for (const eq of (Array.isArray(equipments) ? equipments : []) as EquipmentRecord[]) {
          const c = getCoords(eq);
          if (!c) continue;
          allCoords.push(c);
          const marker = L.marker(c, { icon: makeSVGIcon(eq, L) });
          marker.bindPopup(makePopupHtml(eq), { maxWidth: 300 });
          marker.on("click", () => onMarkerClickRef.current?.(eq));
          marker.addTo(layerGroup.current);
        }

        // ── 3. Centrage ───────────────────────────────────────────────────────
        if (allCoords.length === 0)      mapInst.current.setView([4.06, 9.72], 10);
        else if (allCoords.length === 1) mapInst.current.setView(allCoords[0], 14);
        else mapInst.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 16 });
      });
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
    // ⚠ callbacks intentionnellement absents des deps — lus via refs
  }, [equipments, wires, feederColor, wireColor]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Plein écran */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-10 bg-white rounded-lg shadow-md p-2 hover:bg-gray-50"
      >
        {isFullscreen
          ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        }
      </button>

      {/* Sélecteur de fond de carte */}
      <div className="absolute bottom-3 right-3 z-10">
        <button
          onClick={() => setIsLayerOpen(p => !p)}
          className="bg-white rounded-lg shadow-md px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50"
        >
          <Satellite className="h-3.5 w-3.5" />
          {currentLayer === "street" ? "Carte" : "Satellite"}
          {isLayerOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {isLayerOpen && (
          <div className="absolute bottom-full right-0 mb-1 bg-white rounded-lg shadow-lg overflow-hidden min-w-32.5">
            {(["street", "satellite"] as LayerType[]).map((l) => (
              <button
                key={l}
                onClick={() => handleLayerChange(l)}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50 ${
                  currentLayer === l ? "text-blue-600 font-medium" : "text-black"
                }`}
              >
                {l === "street" ? "Carte (OSM)" : "Satellite"}
                {currentLayer === l && <Check className="h-3 w-3 ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="absolute bottom-3 left-3 z-10">
        <div
          className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md overflow-hidden"
          style={{ minWidth: 185 }}
        >
          <button
            onClick={() => setIsLegendOpen(p => !p)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-xs font-semibold text-gray-700"
          >
            <span>Légende</span>
            {isLegendOpen
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronUp   className="h-3 w-3" />
            }
          </button>

          {isLegendOpen && (
            <div className="px-3 pb-3 space-y-1.5 text-[11px] border-t border-gray-100">

              {/* Postes */}
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#3b82f6" }} />
                <span className="text-gray-700">Poste</span>
              </div>

              {/* Lignes */}
              <div className="border-t border-gray-100 pt-1.5 mt-1 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Lignes</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 rounded shrink-0" style={{ background: wireColor }} />
                  <span className="text-gray-700">Aérien</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="32" height="4" viewBox="0 0 32 4" className="shrink-0">
                    <line x1="0" y1="2" x2="32" y2="2" stroke={wireColor} strokeWidth="3" strokeDasharray="12 7" />
                  </svg>
                  <span className="text-gray-700">Souterrain / REAS</span>
                </div>
              </div>

              {/* Waypoints */}
              <div className="border-t border-gray-100 pt-1.5 mt-1 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Points</p>

                {/* Support — carré vert */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
                    style={{ background: "#22c55e" }}
                  >S</div>
                  <span className="text-gray-700">Support aérien</span>
                </div>

                {/* REAS — carré orange */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
                    style={{ background: "#f59e0b" }}
                  >R</div>
                  <span className="text-gray-700">Remontée REAS</span>
                </div>

{/* Point remarquable — losange cyan (taille 16x16) */}
<div className="flex items-center gap-2">
  <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
    <polygon points="8,1 15,8 8,15 1,8" fill="#06b6d4" stroke="white" strokeWidth="1.5" />
    <text x="8" y="11.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="sans-serif">P</text>
  </svg>
  <span className="text-gray-700">Point remarquable</span>
</div>

{/* OCR — cercle violet (taille 16x16) */}
<div className="flex items-center gap-2">
  <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
    <circle cx="8" cy="8" r="6" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />
    <text x="8" y="11.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="sans-serif">O</text>
  </svg>
  <span className="text-gray-700">OCR</span>
</div>

{/* Dérivation — pentagone orange (taille 16x16) */}
<div className="flex items-center gap-2">
  <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
    <polygon points="8,2 14,6 12,13 4,13 2,6" fill="#f97316" stroke="white" strokeWidth="1.5" />
    <text x="8" y="11.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="sans-serif">D</text>
  </svg>
  <span className="text-gray-700">Dérivation</span>
</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}