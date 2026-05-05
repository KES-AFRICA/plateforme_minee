"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  Zap, Building2, MapPin, Filter, Search, ChevronDown,
  RefreshCw, XCircle, Loader2, AlertCircle, Calendar,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Diamond,
} from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { usePostesMap, useWiresMap, usePosteDetailLazy, useWireDetailLazy } from "@/hooks/useKobo";
import { buildPhotoUrl, fetchPointRemarquableDetail } from "@/lib/api/services/koboService";
import { PosteDetail, WireDetail, Busbar, WireMapItem, PointRemarquableDetail } from "@/lib/types/kobo";
import { DateFilter } from "@/components/dashboard/date-filter";
import { DateRange, DateRangeType, useDateFilter } from "@/hooks/use-date-filter-map";
import React from "react";
import { REASDetailSheet, SupportDetailSheet, useREASDetail, useSupportDetail, WaypointClickData } from "@/components/map/support-reas-modal";

// ── Haversine ────────────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const wireLengthCache = new Map<number, number>();

function calculateWireLength(wire: any): number {
  if (wireLengthCache.has(wire.id)) return wireLengthCache.get(wire.id)!;
  let totalLength = 0;
  for (const segment of wire.segments ?? []) {
    const coords = segment.coordinates ?? [];
    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      totalLength += haversineDistance(lat1, lng1, lat2, lng2);
    }
  }
  wireLengthCache.set(wire.id, totalLength);
  return totalLength;
}

function clearWireLengthCache() { wireLengthCache.clear(); }

// ── Leaflet SSR guard ─────────────────────────────────────────────────────────
const FullscreenMap = dynamic(
  () => import("@/components/map/fullscreen-map"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/30 flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement de la carte…</span>
        </div>
      </div>
    ),
  }
);

// ── Constantes ────────────────────────────────────────────────────────────────
const EXPLOITATIONS = [
  { id: "DLAO", label: "Douala Ouest"  },
  { id: "DLAE", label: "Douala Est"    },
  { id: "YDE",  label: "Yaoundé Est"   },
  { id: "YDO",  label: "Yaoundé Ouest" },
  { id: "GAR",  label: "Garoua"        },
  { id: "BER",  label: "Bertoua"       },
  { id: "BAM",  label: "Bamenda"       },
];
const TYPES_POSTE   = [{ id: "H61", label: "H61 (Aérien)" }, { id: "H59", label: "H59 (Cabine)" }];
const REGIMES_POSTE = [{ id: "publique", label: "Publique" }, { id: "privee", label: "Privée" }, { id: "mixte", label: "Mixte" }];

// ── Helpers UI ────────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ── PhotoModal ────────────────────────────────────────────────────────────────
export function PhotoModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [mounted, setMounted]       = useState(false);
  const [scale, setScale]           = useState(1);
  const [position, setPosition]     = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const imageRef     = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }, [handleKeyDown]);

  const handleZoomIn  = () => setScale(p => Math.min(p + 0.5, 4));
  const handleZoomOut = () => setScale(p => { const n = Math.max(p - 0.5, 0.5); if (n === 0.5) setPosition({ x: 0, y: 0 }); return n; });
  const handleReset   = () => { setScale(1); setPosition({ x: 0, y: 0 }); };
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { if (scale > 1) { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); } };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if (isDragging && scale > 1) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp   = () => setIsDragging(false);
  const handleWheel     = (e: React.WheelEvent<HTMLDivElement>) => { if (e.ctrlKey) { e.preventDefault(); e.deltaY < 0 ? handleZoomIn() : handleZoomOut(); } };

  if (!mounted) return null;
  return createPortal(
    <div ref={containerRef} className="fixed inset-0 bg-black/95 flex items-center justify-center" style={{ zIndex: 9999 }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel}>
      <div className="absolute top-4 right-4 flex items-center gap-2" style={{ zIndex: 10001, pointerEvents: "auto" }} onClick={e => e.stopPropagation()}>
        <button onClick={handleZoomOut} className="text-white bg-black/50 rounded-full p-2 hover:text-gray-300"><ZoomOut className="h-6 w-6" /></button>
        <button onClick={handleZoomIn}  className="text-white bg-black/50 rounded-full p-2 hover:text-gray-300"><ZoomIn  className="h-6 w-6" /></button>
        <button onClick={handleReset}   className="text-white bg-black/50 rounded-full p-2 text-xs font-medium min-w-9 hover:text-gray-300">1:1</button>
        <button onClick={onClose}       className="text-white bg-black/50 rounded-full p-2 hover:text-gray-300"><XCircle className="h-8 w-8" /></button>
      </div>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onMouseDown={handleMouseDown} style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}>
        <img ref={imageRef} src={src} alt={alt} className="transition-transform duration-200 select-none"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, maxWidth: scale === 1 ? "90%" : "none", maxHeight: scale === 1 ? "90%" : "none" }}
          onClick={e => e.stopPropagation()} draggable={false} />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 10001, pointerEvents: "auto" }} onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); onClose(); }} className="text-white bg-black/50 rounded-lg px-4 py-2 text-sm">Fermer (Échap)</button>
        {scale > 1 && <div className="text-white bg-black/50 rounded-lg px-3 py-2 text-sm">{Math.round(scale * 100)}% · Glisser</div>}
      </div>
    </div>,
    document.body
  );
}

// ── PhotoThumb ────────────────────────────────────────────────────────────────
export function PhotoThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const url = buildPhotoUrl(src);
  if (!url) return null;
  return (
    <>
      <div className="relative w-full h-72 rounded-lg overflow-hidden border bg-gray-500/20 cursor-pointer hover:opacity-90 transition-opacity" onClick={e => { e.stopPropagation(); setIsFullscreen(true); }}>
        <div className="absolute inset-0 z-10 overflow-hidden">
          <div className="absolute inset-0 animate-pulse bg-gray-500/10" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)", animation: "shimmer 1.6s ease-in-out infinite" }} />
        </div>
        <img src={url} alt={alt} className="w-full h-full object-cover transition-opacity z-20 relative" style={{ opacity: isLoading ? 0 : 1 }}
          onLoadStart={() => setIsLoading(true)} onLoad={() => setIsLoading(false)} loading="lazy" />
      </div>
      {isFullscreen && <PhotoModal src={url} alt={alt} onClose={() => setIsFullscreen(false)} />}
    </>
  );
}

// ── PhotoThumbSm (petite vignette pour points remarquables) ───────────────────
function PhotoThumbSm({ src, alt, size = "h-48" }: { src: string | null | undefined; alt: string; size?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const url = buildPhotoUrl(src);
  if (!url) return null;
  return (
    <>
      <div
        className={`relative w-full ${size} rounded-lg overflow-hidden border bg-gray-500/20 cursor-pointer hover:opacity-90 transition-opacity hover:ring-2 hover:ring-cyan-400`}
        onClick={e => { e.stopPropagation(); setIsFullscreen(true); }}
      >
        <img src={url} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 flex items-end p-1.5 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <span className="text-white text-[10px] font-medium">Agrandir</span>
        </div>
      </div>
      {isFullscreen && <PhotoModal src={url} alt={alt} onClose={() => setIsFullscreen(false)} />}
    </>
  );
}

// ── Hook Point Remarquable ─────────────────────────────────────────────────────
interface PointRemarquableClickData {
  wire_id:       number;
  troncon_index: number;
  point_index:   number;
}

function usePointRemarquableDetail() {
  const [data, setData]       = useState<PointRemarquableDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async (wireId: number, tronconIndex: number, pointIndex: number) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await fetchPointRemarquableDetail(wireId, tronconIndex, pointIndex);
      setData(result);
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setData(null); setError(null); setLoading(false); }, []);

  return { data, loading, error, fetch, reset };
}

// ── PointRemarquableDetailSheet ────────────────────────────────────────────────
function PointRemarquableDetailSheet({
  isOpen, onClose, loading, error, data,
}: {
  isOpen:  boolean;
  onClose: () => void;
  loading: boolean;
  error:   string | null;
  data:    PointRemarquableDetail | null;
}) {
  const pt = data?.point_remarquable;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-[95vw]! sm:w-[480px]! max-w-none! flex flex-col p-0 overflow-hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-gradient-to-r from-cyan-50 to-white">
          <div className="flex items-center gap-2.5">
            {/* Losange cyan comme sur la carte */}
            <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
              <polygon points="11,2 20,11 11,20 2,11" fill="#06b6d4" stroke="white" strokeWidth="1.5"/>
              <text x="11" y="14.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="white" fontFamily="sans-serif">P</text>
            </svg>
            <div>
              <SheetTitle className="text-base leading-tight">
                {pt?.type ?? "Point remarquable"}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {data
                  ? `Wire #${data.wire_id} · Tronçon ${data.troncon_index} · Point ${data.point_index}/${data.points_total}`
                  : "Chargement…"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Corps ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
              <span className="text-sm">Chargement…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* ── Photo principale ── */}
              {(data.photos.original || data.photos.medium) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Photo</p>
                  <PhotoThumbSm
                    src={data.photos.original ?? data.photos.medium}
                    alt={pt?.type ?? "Point remarquable"}
                    size="h-56"
                  />
                  {/* Vignettes tailles supplémentaires */}
                  {(data.photos.large || data.photos.small) && (
                    <div className="flex gap-2">
                      {data.photos.large && (
                        <PhotoThumbSm src={data.photos.large} alt="Large" size="h-24" />
                      )}
                      {data.photos.small && (
                        <PhotoThumbSm src={data.photos.small} alt="Miniature" size="h-24" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Informations du point ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                  Caractéristiques
                </p>
                <div className="grid grid-cols-2 gap-3 bg-cyan-50/60 border border-cyan-100 rounded-lg p-3">
                  <Field label="Type"     value={pt?.type} />
                  <Field label="ID point" value={pt?.id_point} />
                  <Field label="État"     value={pt?.etat} />
                  <div className="col-span-2">
                    {pt?.etat && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          pt.etat.toLowerCase().includes("bon") ? "bg-green-500" :
                          pt.etat.toLowerCase().includes("mauv") ? "bg-red-500" : "bg-amber-400"
                        }`} />
                        <span className="text-xs text-muted-foreground">{pt.etat}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Position GPS ── */}
              {pt?.position && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                    Localisation GPS
                  </p>
                  <div className="bg-muted/20 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Latitude</p>
                        <p className="text-sm font-mono font-semibold">
                          {pt.position.latitude?.toFixed(7) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Longitude</p>
                        <p className="text-sm font-mono font-semibold">
                          {pt.position.longitude?.toFixed(7) ?? "—"}
                        </p>
                      </div>
                      {pt.position.altitude != null && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Altitude</p>
                          <p className="text-sm font-mono">{pt.position.altitude.toFixed(1)} m</p>
                        </div>
                      )}
                      {pt.position.precision != null && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Précision</p>
                          <p className="text-sm font-mono">± {pt.position.precision.toFixed(1)} m</p>
                        </div>
                      )}
                    </div>
                    {/* Lien Google Maps */}
                    {pt.position.latitude && pt.position.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${pt.position.latitude},${pt.position.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 hover:underline mt-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Voir sur Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* ── Câble du tronçon (contexte) ── */}
              {data.troncon.cable && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                    Câble du tronçon souterrain
                  </p>
                  <div className="grid grid-cols-2 gap-3 bg-muted/10 border rounded-lg p-3">
                    <Field label="Nature"     value={data.troncon.cable.nature} />
                    <Field label="Section"    value={data.troncon.cable.section} />
                    <Field label="Isolant"    value={data.troncon.cable.isolant} />
                    <Field label="Pose"       value={data.troncon.cable.pose} />
                    <Field label="Profondeur" value={data.troncon.cable.profondeur ? `${data.troncon.cable.profondeur} cm` : null} />
                  </div>
                </div>
              )}

              {/* ── Contexte wire ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                  Contexte
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Feeder"    value={data.wire.feeder_name ?? data.wire.feeder_id} />
                  <Field label="Tension"   value={data.wire.tension_kv ? `${data.wire.tension_kv} kV` : null} />
                  <Field label="Phase"     value={data.wire.phase} />
                  <Field label="Tronçon"   value={`#${data.troncon_index} (souterrain)`} />
                  <Field label="Point"     value={`${data.point_index} / ${data.points_total}`} />
                  <Field label="Wire ID"   value={String(data.wire_id)} />
                </div>
              </div>

              {/* ── Métadonnées ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                  Métadonnées
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Field label="Saisi par"    value={data.meta.submitted_by} />
                  <Field label="Date saisie"  value={data.meta.submission_time} />
                  <Field label="Kobo ID"      value={String(data.meta.kobo_id)} />
                  {data.attachment && (
                    <Field label="Fichier photo" value={data.attachment.basename} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <SheetFooter className="px-5 py-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── DetailSheet (Poste) ───────────────────────────────────────────────────────
function DetailSheet({
  substationId, isOpen, onClose, poste, loading, error,
}: {
  substationId: string | null;
  isOpen:       boolean;
  onClose:      () => void;
  poste:        PosteDetail | null;
  loading:      boolean;
  error:        string | null;
}) {
  const [isGenieCivilPhotosOpen, setIsGenieCivilPhotosOpen] = React.useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95vw]! sm:w-[90vw]! max-w-none! flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <SheetTitle className="text-base">
              {poste?.substation_name ?? poste?.substation_id ?? substationId ?? "Poste"}
            </SheetTitle>
          </div>
          <SheetDescription>
            {poste
              ? `${poste.type ?? ""} · ${poste.feeder_name ?? poste.feeder ?? ""} · ${poste.exploitation ?? ""}`
              : "Chargement des détails…"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /><span>Chargement…</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /><p className="text-sm">{error}</p>
            </div>
          )}
          {poste && !loading && (
            <>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="sm:w-1/3"><PhotoThumb src={poste.photos.photo_poste} alt="Photo du poste" /></div>
                <div className="sm:w-2/3 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Substation ID"   value={poste.substation_id} />
                    <Field label="Substation name" value={poste.substation_name} />
                    <Field label="Feeder name"     value={poste.feeder_name} />
                    <Field label="Type"            value={poste.type} />
                    <Field label="Type H61"        value={poste.type_poste_H61} />
                    <Field label="Exploitation"    value={poste.exploitation} />
                    <Field label="Régime"          value={poste.regime} />
                    <Field label="Régime poste"    value={poste.regime_poste} />
                    <Field label="Zone"            value={poste.zone_type} />
                    <Field label="ID2"             value={poste.ID2} />
                    <Field label="Accès"           value={poste.statut_acces} />
                    <Field label="Terre neutre BT" value={poste.terre_neutre_bt} />
                    <Field label="Terre masse"     value={poste.terre_masse} />
                    {poste.latitude && poste.longitude && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">GPS</p>
                        <p className="text-sm font-mono">{poste.latitude.toFixed(6)}, {poste.longitude.toFixed(6)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {((poste.appareillage.parafoudre || poste.appareillage.etat_parafoudre || poste.appareillage.tableau_bt ||
                poste.appareillage.detecteur_defaut || poste.appareillage.coupe_circuit || poste.appareillage.disjoncteur_hp ||
                poste.appareillage.pmr || poste.appareillage.photo_appareillage) ||
                (poste.support.hauteur || poste.support.etat || poste.support.type_support ||
                poste.armement.type || poste.armement.etat || poste.armement.atronconnement)) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Appareillage HTA & Support / Armement</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2"><div className="w-1 h-5 bg-blue-500 rounded-full" /><p className="text-sm font-medium">Appareillage HTA</p></div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="sm:w-1/2"><PhotoThumb src={poste.appareillage.photo_appareillage} alt="Appareillage" /></div>
                          <div className="sm:w-1/2">
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="Parafoudre"       value={poste.appareillage.parafoudre} />
                              <Field label="État parafoudre"  value={poste.appareillage.etat_parafoudre} />
                              <Field label="Tableau BT"       value={poste.appareillage.tableau_bt} />
                              <Field label="Détecteur défaut" value={poste.appareillage.detecteur_defaut} />
                              <Field label="Coupe-circuit"    value={poste.appareillage.coupe_circuit} />
                              <Field label="Disjoncteur HP"   value={poste.appareillage.disjoncteur_hp} />
                              <Field label="PMR"              value={poste.appareillage.pmr} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2"><div className="w-1 h-5 bg-green-500 rounded-full" /><p className="text-sm font-bold">Support & Armement</p></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-muted/20 rounded-lg p-3">
                            <p className="text-xs font-bold mb-2">Support</p>
                            <div className="space-y-1">
                              <Field label="Hauteur" value={poste.support.hauteur ? `${poste.support.hauteur} m` : null} />
                              <Field label="État"    value={poste.support.etat} />
                              <Field label="Type"    value={poste.support.type_support} />
                            </div>
                          </div>
                          <div className="bg-muted/20 rounded-lg p-3">
                            <p className="text-xs font-bold mb-2">Armement</p>
                            <div className="space-y-1">
                              <Field label="Type"           value={poste.armement.type} />
                              <Field label="État"           value={poste.armement.etat} />
                              <Field label="Atronconnement" value={poste.armement.atronconnement} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {poste.genie_civil && (() => {
                const hasGenieData = !!(poste.genie_civil?.superficie_batie || poste.genie_civil?.voies?.type ||
                  poste.genie_civil?.batiment?.toiture || poste.genie_civil?.equipements_local?.interrupteurs ||
                  Object.keys(poste.genie_civil?.photos || {}).length > 0);
                return hasGenieData;
              })() && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Génie civil</h3>
                  {poste.genie_civil.superficie_batie && <Field label="Superficie bâtie" value={`${poste.genie_civil.superficie_batie} m²`} />}
                  {(poste.genie_civil.voies.type || poste.genie_civil.voies.largeur) && (
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Voies d'accès</p>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <Field label="Type"        value={poste.genie_civil.voies.type} />
                        <Field label="Largeur"     value={poste.genie_civil.voies.largeur ? `${poste.genie_civil.voies.largeur} m` : null} />
                        <Field label="Longueur"    value={poste.genie_civil.voies.longueur ? `${poste.genie_civil.voies.longueur} m` : null} />
                        <Field label="Surface"     value={poste.genie_civil.voies.surface ? `${poste.genie_civil.voies.surface} m²` : null} />
                        <Field label="Observation" value={poste.genie_civil.voies.observation} />
                      </div>
                    </div>
                  )}
                  {(poste.genie_civil.batiment.toiture || poste.genie_civil.batiment.peinture_exterieur) && (
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-bold mb-2">Bâtiment</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                        <Field label="Toiture"              value={poste.genie_civil.batiment.toiture} />
                        <Field label="Peinture extérieure"  value={poste.genie_civil.batiment.peinture_exterieur} />
                        <Field label="État peinture ext"    value={poste.genie_civil.batiment.etat_peinture_ext} />
                        <Field label="Portes"               value={poste.genie_civil.batiment.portes} />
                        <Field label="Structure murs"       value={poste.genie_civil.batiment.structure_murs} />
                        <Field label="État murs"            value={poste.genie_civil.batiment.etat_murs} />
                        <Field label="Clôture"              value={poste.genie_civil.batiment.cloture} />
                        <Field label="Ouvrage drainage"     value={poste.genie_civil.batiment.ouvrage_drainage} />
                      </div>
                    </div>
                  )}
                  {Object.keys(poste.genie_civil.photos).length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <button onClick={() => setIsGenieCivilPhotosOpen(!isGenieCivilPhotosOpen)}
                        className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">📷 Photos du génie civil</span>
                          <Badge variant="secondary" className="text-xs">{Object.keys(poste.genie_civil.photos).length}</Badge>
                        </div>
                        <svg className={`h-4 w-4 transition-transform duration-200 ${isGenieCivilPhotosOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isGenieCivilPhotosOpen && (
                        <div className="p-3 border-t">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(poste.genie_civil.photos).map(([key, path]) => (
                              <PhotoThumb key={key} src={path} alt={key} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {poste.busbars && poste.busbars.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Jeux de barres ({poste.busbars.length})</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {poste.busbars.map((busbar: Busbar) => (
                      <div key={busbar.id} className="border rounded-lg p-2 bg-muted/10">
                        <p className="text-sm font-semibold text-blue-600">{busbar.name || busbar.id}</p>
                        <div className="flex gap-4 text-xs mt-1">
                          <span><strong>ID:</strong> {busbar.id}</span>
                          {busbar.voltage_level && <span><strong>Tension:</strong> {busbar.voltage_level} kV</span>}
                          {busbar.phase && <span><strong>Phase:</strong> {busbar.phase}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {poste.cellules.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Cellules ({poste.cellules.length})</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {poste.cellules.map((c, i) => (
                      <div key={i} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">{c.nom_cellule ?? c.bay_id}</p>
                          <Badge variant="outline">{c.type_bay}</Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="sm:w-1/3"><PhotoThumb src={c.photo_bay} alt={`Cellule ${c.bay_id}`} /></div>
                          <div className="sm:w-2/3">
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="Fabricant"    value={c.fabricant} />
                              <Field label="Modèle"       value={c.modele} />
                              <Field label="Commande"     value={c.commande} />
                              <Field label="État visuel"  value={c.etat_visuel} />
                              <Field label="Signalisation" value={c.signalisation} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {poste.transformateurs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Transformateurs ({poste.transformateurs.length})</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {poste.transformateurs.map((t, i) => (
                      <div key={i} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">{t.nom ?? `Transfo ${i + 1}`}</p>
                          <Badge variant={t.actif === "TRUE" ? "default" : "secondary"}>{t.actif === "TRUE" ? "Actif" : "Inactif"}</Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="sm:w-1/3"><PhotoThumb src={t.photo_transfo} alt={`Transformateur ${t.nom}`} /></div>
                          <div className="sm:w-2/3">
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="Puissance"          value={t.puissance_kva ? `${t.puissance_kva} kVA` : null} />
                              <Field label="Tension primaire"   value={t.tension_primaire_kv ? `${t.tension_primaire_kv} kV` : null} />
                              <Field label="Tension secondaire" value={t.tension_secondaire_kv ? `${t.tension_secondaire_kv} kV` : null} />
                              <Field label="Marque"             value={t.marque} />
                              <Field label="Type"               value={t.type} />
                              <Field label="État visuel"        value={t.etat_visuel} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {poste.bt_boards.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Tableaux BT ({poste.bt_boards.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {poste.bt_boards.map((bt, i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <PhotoThumb src={bt.photo} alt={`Tableau BT ${i + 1}`} />
                        <div className="mt-2 space-y-1">
                          <Field label="Type"     value={bt.type} />
                          <Field label="Capacité" value={bt.capacity} />
                          <Field label="Actif"    value={bt.actif} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(poste.meta.kobo_id || poste.meta.submitted_by) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Métadonnées</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="ID Kobo"      value={String(poste.meta.kobo_id ?? "")} />
                    <Field label="UUID"         value={poste.meta.uuid} />
                    <Field label="Saisi par"    value={poste.meta.submitted_by} />
                    <Field label="Date saisie"  value={poste.meta.submission_time} />
                    <Field label="Version"      value={poste.meta.version} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <SheetFooter className="px-5 py-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── WireDetailSheet ───────────────────────────────────────────────────────────
function WireDetailSheet({
  wireId, isOpen, onClose, wire, loading, error,
}: {
  wireId:  number | null;
  isOpen:  boolean;
  onClose: () => void;
  wire:    WireDetail | null;
  loading: boolean;
  error:   string | null;
}) {
  const wireLength = useMemo(() => {
    if (wire?.length_km) return wire.length_km;
    if (wire) return calculateWireLength(wire);
    return null;
  }, [wire]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95vw]! sm:w-[90vw]! max-w-none! flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            <SheetTitle className="text-base">Ligne {wire?.feeder?.name ?? `#${wireId}`}</SheetTitle>
          </div>
          <SheetDescription>
            {wire
              ? `${wire.stats.troncons_count} tronçon(s) · ${wire.type === "aerien" ? "Aérienne" : wire.type === "souterrain" ? "Souterraine" : "Mixte"}`
              : "Chargement des détails…"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /><span>Chargement…</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /><p className="text-sm">{error}</p>
            </div>
          )}
          {wire && !loading && (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Informations générales</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="ID Kobo" value={String(wire.id)} />
                  <Field label="Feeder"  value={wire.feeder.name} />
                  <Field label="Tension" value={wire.feeder.tension_kv ? `${wire.feeder.tension_kv} kV` : null} />
                  <Field label="Phase"   value={wire.feeder.phase} />
                  {wireLength !== null && (
                    <div className="col-span-2 md:col-span-1">
                      <div className="bg-cyan-50 rounded-lg p-2 text-center border border-cyan-200">
                        <p className="text-[10px] text-cyan-600 uppercase tracking-wide font-semibold">Longueur totale</p>
                        <p className="text-lg font-bold text-cyan-700">{wireLength.toFixed(2)} km</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Point de départ</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={wire.debut.type === "poste" ? "default" : "secondary"}>{wire.debut.type || "N/A"}</Badge>
                      {wire.debut.code && <span className="text-sm font-mono">{wire.debut.code}</span>}
                    </div>
                    {wire.debut.coordinates.latitude && wire.debut.coordinates.longitude && (
                      <p className="text-xs text-muted-foreground mb-3">📍 {wire.debut.coordinates.latitude.toFixed(6)}, {wire.debut.coordinates.longitude.toFixed(6)}</p>
                    )}
                    {wire.debut.type === "poste" && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
                        <Field label="Substation"   value={wire.debut.details.substation_name as string} />
                        <Field label="Feeder"       value={wire.debut.details.feeder_name as string} />
                        <Field label="Type poste"   value={wire.debut.details.type_poste as string} />
                        <Field label="Exploitation" value={wire.debut.details.exploitation as string} />
                        <Field label="Régime"       value={wire.debut.details.regime as string} />
                        <Field label="Zone"         value={wire.debut.details.zone_type as string} />
                        <Field label="Bay"          value={wire.debut.details.bay_name as string || wire.debut.details.bay as string} />
                        <Field label="Tension"      value={wire.debut.details.tension_kv ? `${wire.debut.details.tension_kv} kV` : null} />
                      </div>
                    )}
                    {wire.debut.photo && (
                      <div className="mt-3"><PhotoThumb src={wire.debut.photo} alt="Photo début" /></div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Point d'arrivée</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={wire.fin.type === "poste" ? "default" : "secondary"}>{wire.fin.type || "N/A"}</Badge>
                      {(wire.fin.details.code as string) && <span className="text-sm font-mono">{wire.fin.details.code as string}</span>}
                    </div>
                    {wire.fin.coordinates.latitude && wire.fin.coordinates.longitude && (
                      <p className="text-xs text-muted-foreground mb-3">📍 {wire.fin.coordinates.latitude.toFixed(6)}, {wire.fin.coordinates.longitude.toFixed(6)}</p>
                    )}
                    {wire.fin.type === "poste" && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
                        <Field label="Substation"   value={wire.fin.details.substation_name as string} />
                        <Field label="Type poste"   value={wire.fin.details.type_poste as string} />
                        <Field label="Exploitation" value={wire.fin.details.exploitation as string} />
                        <Field label="Régime"       value={wire.fin.details.regime as string} />
                        <Field label="Zone"         value={wire.fin.details.zone_type as string} />
                        <Field label="Bay"          value={wire.fin.details.bay_name as string || wire.fin.details.bay as string} />
                        <Field label="Tension"      value={wire.fin.details.tension_kv ? `${wire.fin.details.tension_kv} kV` : null} />
                      </div>
                    )}
                    {wire.fin.photos && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {wire.fin.photos.photo && <PhotoThumb src={wire.fin.photos.photo} alt="Photo arrivée" />}
                        {wire.fin.photos.photo_armement && <PhotoThumb src={wire.fin.photos.photo_armement} alt="Armement arrivée" />}
                      </div>
                    )}

                    {/* Détails DERIVATION */}
{wire.fin.type === "derivation" && (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
    <Field label="Code" value={wire.fin.details.code} />
    <Field label="Hauteur" value={wire.fin.details.hauteur ? `${wire.fin.details.hauteur} m` : null} />
    <Field label="État" value={wire.fin.details.etat} />
    <Field label="Type support" value={wire.fin.details.type_support} />
    <Field label="Type armement" value={wire.fin.details.type_armement} />
    <Field label="État armement" value={wire.fin.details.etat_armement} />
    <Field label="Fusible" value={wire.fin.details.avec_fusible ? "Avec fusible" : "Sans fusible"} />
  </div>
)}

{/* Détails OCR_FIN */}
{wire.fin.type === "OCR" && (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
    <Field label="Code" value={wire.fin.details.code} />
    <Field label="OCR" value={wire.fin.details.ocr_value} />
    <Field label="État visuel" value={wire.fin.details.etat_visuel} />
    <Field label="État OCR" value={wire.fin.details.etat} />
    <Field label="Hauteur" value={wire.fin.details.hauteur} />
    <Field label="Type support" value={wire.fin.details.type_support} />
    <Field label="Type armement" value={wire.fin.details.type_armement} />
    <Field label="État armement" value={wire.fin.details.etat_armement} />
  </div>
)}
                  </div>
                </div>
              </div>

              {wire.troncons.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Tronçons ({wire.troncons.length})</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {wire.troncons.map((troncon, idx) => (
                      <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold">Tronçon #{troncon.index}</p>
                          <Badge variant={troncon.type === "aerien" ? "default" : troncon.type === "souterrain" ? "secondary" : "outline"}>
                            {troncon.type === "aerien" ? "Aérien" : troncon.type === "souterrain" ? "Souterrain" : "Remontée"}
                          </Badge>
                        </div>
                        {troncon.aerien && (
                          <div className="space-y-3">
                            {troncon.aerien.cable && (
                              <div className="bg-muted/20 rounded-lg p-3">
                                <p className="text-xs font-semibold mb-2">Câble</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  <Field label="Nature"  value={troncon.aerien.cable.nature} />
                                  <Field label="Section" value={troncon.aerien.cable.section} />
                                  <Field label="Isolant" value={troncon.aerien.cable.isolant} />
                                </div>
                              </div>
                            )}
                            {troncon.supports && troncon.supports.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-2">{troncon.supports.length} support(s)</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {troncon.supports.map((sup, si) => (
                                    <div key={si} className="border rounded-lg p-3 bg-muted/10">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">Support #{sup.index}</span>
                                        {sup.hauteur && <Badge variant="outline">{sup.hauteur}</Badge>}
                                      </div>
                                      {sup.position && <p className="text-[10px] text-muted-foreground mb-2">📍 {sup.position.latitude.toFixed(5)}, {sup.position.longitude.toFixed(5)}</p>}
                                      <div className="flex flex-row gap-2">
                                        {sup.photo && <PhotoThumb src={sup.photo} alt={`Support ${sup.index}`} />}
                                      {sup.armement?.photo && <PhotoThumb src={sup.armement.photo} alt="Armement" />}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {troncon.souterrain && (
                          <div className="space-y-3">
                            {troncon.souterrain.cable && (
                              <div className="bg-muted/20 rounded-lg p-3">
                                <p className="text-xs font-semibold mb-2">Câble</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  <Field label="Nature"     value={troncon.souterrain.cable.nature} />
                                  <Field label="Section"    value={troncon.souterrain.cable.section} />
                                  <Field label="Isolant"    value={troncon.souterrain.cable.isolant} />
                                  <Field label="Pose"       value={troncon.souterrain.cable.pose} />
                                  <Field label="Profondeur" value={troncon.souterrain.cable.profondeur} />
                                </div>
                              </div>
                            )}
                            {/* Points remarquables listés dans le tronçon (sans photos détail ici) */}
                            {troncon.souterrain.points_remarquables && troncon.souterrain.points_remarquables.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                                  <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,6 6,11 1,6" fill="#06b6d4"/></svg>
                                  {troncon.souterrain.points_remarquables.length} point(s) remarquable(s)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {troncon.souterrain.points_remarquables.map((pt: any, pi: number) => (
                                    <div key={pi} className="border border-cyan-200 rounded-lg p-2 bg-cyan-50/50 text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-cyan-700">Point #{pt.index}</span>
                                        {pt.etat && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                            pt.etat.toLowerCase().includes("bon") ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                          }`}>{pt.etat}</span>
                                        )}
                                      </div>
                                      <p className="text-muted-foreground">{pt.type}</p>
                                      {pt.position && (
                                        <p className="font-mono text-[10px]">📍 {pt.position.latitude?.toFixed(5)}, {pt.position.longitude?.toFixed(5)}</p>
                                      )}
                                      {(pt.photo || pt.photo_medium) && (
                                        <PhotoThumbSm
                                          src={pt.photo ?? pt.photo_medium}
                                          alt={`Point remarquable #${pt.index}`}
                                          size="h-64"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {troncon.remontee && (
                          <div className="space-y-3">
                            <div className="bg-muted/20 rounded-lg p-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <Field label="Barcode" value={troncon.remontee.support?.barcode} />
                                <Field label="Sens"    value={troncon.remontee.support?.sens} />
                                <Field label="Hauteur" value={troncon.remontee.support?.hauteur} />
                                <Field label="Type"    value={troncon.remontee.support?.type_remontee} />
                                <Field label="État"    value={troncon.remontee.support?.etat_remontee} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {troncon.remontee.support?.photo    && <PhotoThumb src={troncon.remontee.support.photo}    alt="Support REAS" />}
                              {troncon.remontee.armement?.photo   && <PhotoThumb src={troncon.remontee.armement.photo}   alt="Armement REAS" />}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Statistiques</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold">{wire.stats.troncons_count}</p><p className="text-[10px] text-muted-foreground uppercase">Tronçons</p></div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold">{wire.stats.supports_count}</p><p className="text-[10px] text-muted-foreground uppercase">Supports</p></div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold">{wire.stats.total_waypoints}</p><p className="text-[10px] text-muted-foreground uppercase">Points GPS</p></div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold">{wire.stats.total_photos}</p><p className="text-[10px] text-muted-foreground uppercase">Photos</p></div>
                  {wire.stats.points_remarquables_count > 0 && (
                    <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 text-center col-span-2">
                      <p className="text-2xl font-bold text-cyan-700">{wire.stats.points_remarquables_count}</p>
                      <p className="text-[10px] text-cyan-500 uppercase">Points remarquables</p>
                    </div>
                  )}
                </div>
              </div>

              {(wire.meta.submitted_by || wire.meta.submission_time) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Métadonnées</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Saisi par"   value={wire.meta.submitted_by} />
                    <Field label="Date saisie" value={wire.meta.submission_time} />
                    <Field label="Version"     value={wire.meta.version} />
                    <Field label="Statut"      value={wire.meta.status} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <SheetFooter className="px-5 py-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function MapPage() {
  const { postes, count, loading: loadingMap, error: errorMap, refresh }    = usePostesMap();
  const { wires, count: wiresCount, loading: loadingWires, refresh: refreshWires } = useWiresMap();
  const { poste, loading: loadingDetail, error: errorDetail, fetch: fetchDetail, reset: resetDetail }           = usePosteDetailLazy();
  const { wire,  loading: loadingWireDetail, error: errorWireDetail, fetch: fetchWireDetail, reset: resetWireDetail } = useWireDetailLazy();

  const [selectedSubstation, setSelectedSubstation] = useState<string | null>(null);
  const [selectedWireId,     setSelectedWireId]     = useState<number | null>(null);
  const [isSheetOpen,        setIsSheetOpen]        = useState(false);
  const [isWireSheetOpen,    setIsWireSheetOpen]    = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedType,         setSelectedType]         = useState("all");
  const [selectedExploitation, setSelectedExploitation] = useState("all");
  const [selectedRegime,       setSelectedRegime]       = useState("all");
  const [searchQuery,          setSearchQuery]          = useState("");

  const supportHook = useSupportDetail();
  const reasHook    = useREASDetail();
  const ptRemarquableHook = usePointRemarquableDetail();

  const [isSupportModalOpen,        setIsSupportModalOpen]        = useState(false);
  const [isREASModalOpen,           setIsREASModalOpen]           = useState(false);
  const [isPtRemarquableModalOpen,  setIsPtRemarquableModalOpen]  = useState(false);

  const { dateRangeType, dateRange, setDateRangeType, setCustomRange } = useDateFilter();

  // ── Filtrage postes ───────────────────────────────────────────────────────
  const filteredPostes = useMemo(() => postes.filter((p) => {
    if (selectedType         !== "all" && p.type         !== selectedType)         return false;
    if (selectedExploitation !== "all" && p.exploitation !== selectedExploitation) return false;
    if (selectedRegime       !== "all" && p.regime_poste !== selectedRegime)       return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.substation_name?.toLowerCase().includes(q) && !p.substation?.toLowerCase().includes(q) &&
          !p.feeder?.toLowerCase().includes(q) && !p.feeder_name?.toLowerCase().includes(q) && !p.exploitation?.toLowerCase().includes(q))
        return false;
    }
    if (dateRangeType !== "all" && p.submission_time) {
      const d = new Date(p.submission_time); const start = new Date(dateRange.start); const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999);
      if (d < start || d > end) return false;
    }
    return true;
  }), [postes, selectedType, selectedExploitation, selectedRegime, searchQuery, dateRangeType, dateRange]);

  // ── Filtrage wires ────────────────────────────────────────────────────────
  const filteredWires = useMemo(() => wires.filter((w) => {
    if (dateRangeType !== "all" && w.submission_time) {
      const d = new Date(w.submission_time); const start = new Date(dateRange.start); const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999);
      if (d < start || d > end) return false;
    }
    return true;
  }), [wires, dateRangeType, dateRange]);

  // ── Longueurs ──────────────────────────────────────────────────────────────
  const { totalLengthAll, totalLengthFiltered } = useMemo(() => {
    let allLength = 0; let filteredLength = 0;
    for (const w of wires)         allLength      += calculateWireLength(w);
    for (const w of filteredWires) filteredLength += calculateWireLength(w);
    return { totalLengthAll: allLength, totalLengthFiltered: filteredLength };
  }, [wires, filteredWires]);

  // ── KPIs wires ────────────────────────────────────────────────────────────
  const wireKpis = useMemo(() => {
    let troncons = 0, supports = 0, remontees = 0, ptRemarquables = 0, aerien = 0, souterrain = 0, mixte = 0;
    for (const w of filteredWires) {
      const segs = w.segments ?? []; troncons += segs.length;
      let hasAerien = false, hasSout = false, hasRem = false;
      for (const seg of segs) {
        if (seg.type === "aerien")     { hasAerien = true; supports       += (seg.waypoints ?? []).filter((wp: any) => wp.type === "support").length; }
        else if (seg.type === "remontee")   { hasRem    = true; remontees      += 1; }
        else if (seg.type === "souterrain") { hasSout   = true; ptRemarquables += (seg.waypoints ?? []).filter((wp: any) => wp.type !== "aucune" && wp.type !== "souterrain").length; }
      }
      if (hasSout && (hasAerien || hasRem)) mixte++;
      else if (hasSout) souterrain++;
      else              aerien++;
    }
    return { troncons, supports, remontees, ptRemarquables, aerien, souterrain, mixte };
  }, [filteredWires]);

  // ── Map data ──────────────────────────────────────────────────────────────
  const mapPoints = useMemo(() => filteredPostes.map((p) => ({
    m_rid: p.substation ?? p.kobo_id ?? "", name: p.substation_name ?? "—",
    latitude: p.latitude, longitude: p.longitude,
    table: "substation", type: p.type,
    exploitation: p.exploitation, regime_poste: p.regime_poste,
    _substation_id: p.substation,
  })), [filteredPostes]);

  // ── Waypoint click — gère support, REAS et points remarquables ─────────────
  const handleWaypointClick = useCallback((data: WaypointClickData) => {
    if (data.type === "support") {
      setIsSupportModalOpen(true);
      supportHook.fetch(data.wire_id, data.troncon_index, data.support_index!);
    } else if (data.type === "remontee") {
      setIsREASModalOpen(true);
      reasHook.fetch(data.wire_id, data.troncon_index);
    } else if (data.type === "point_remarquable") {
      setIsPtRemarquableModalOpen(true);
      ptRemarquableHook.fetch(data.wire_id, data.troncon_index, data.point_index!);
    }
  }, [supportHook, reasHook, ptRemarquableHook]);

  const mapWires = useMemo(() => filteredWires.map((w) => ({
    id:                  w.id,
    segments:            w.segments?.map((seg: any) => ({
      ...seg,
      waypoints: seg.waypoints?.map((wp: any) => ({ ...wp, wire_id: w.id })),
    })),
    coordinates:         w.coordinates,
    waypoints:           w.waypoints?.map((wp: any) => ({ ...wp, wire_id: w.id })),
    feeder_name:         w.feeder_name,
    tension_kv:          w.tension_kv,
    type:                w.type || "aerien",
    has_complete_coords: w.has_complete_coords,
    debut:               w.debut,
    fin:                 w.fin,
    debut_type:          w.debut?.type,
    fin_type:            w.fin?.type,
  })), [filteredWires]);

  const handleMarkerClick = useCallback((eq: Record<string, unknown>) => {
    const id = eq._substation_id as string | undefined;
    if (!id) return;
    setSelectedSubstation(id); setIsSheetOpen(true); fetchDetail(id);
  }, [fetchDetail]);

  const handleWireClick = useCallback((wd: Record<string, unknown>) => {
    const id = wd.id as number | undefined;
    if (!id) return;
    setSelectedWireId(id); setIsWireSheetOpen(true); fetchWireDetail(id);
  }, [fetchWireDetail]);

  const handleCloseSheet     = useCallback(() => { setIsSheetOpen(false);     resetDetail();     setSelectedSubstation(null); }, [resetDetail]);
  const handleCloseWireSheet = useCallback(() => { setIsWireSheetOpen(false); resetWireDetail(); setSelectedWireId(null); },   [resetWireDetail]);

  const handleRefresh = useCallback(() => { refresh(); refreshWires(); clearWireLengthCache(); }, [refresh, refreshWires]);

  const resetFilters  = () => { setSelectedType("all"); setSelectedExploitation("all"); setSelectedRegime("all"); setSearchQuery(""); setDateRangeType("all"); };
  const hasActiveFilters = selectedType !== "all" || selectedExploitation !== "all" || selectedRegime !== "all" || searchQuery !== "" || dateRangeType !== "all";

  return (
    <div className="h-[85vh] w-full flex overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div className={cn("relative flex shrink-0 transition-all duration-300 ease-in-out", sidebarOpen ? "w-80" : "w-1")}>
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)}
            className="absolute -left-2 top-1/2 rounded-md inset-0 w-12 h-32 flex items-center justify-center bg-background border-r transition-colors cursor-pointer z-10"
            title="Ouvrir les filtres">
            <div>
              <ChevronRight className="h-4 w-4" />
              <div className="h-2" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground select-none"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Filtres</span>
            </div>
          </button>
        )}

        <div className={cn("absolute inset-0 flex flex-col bg-background border-r overflow-hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>

          {/* Header sidebar */}
          <div className="shrink-0 flex items-center justify-between px-3 py-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Filtres & KPIs</span>
              {hasActiveFilters && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">!</Badge>}
            </div>
            <button onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 hover:bg-blue-600 transition-colors cursor-pointer bg-blue-500 text-white" title="Fermer">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Corps sidebar */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

            {/* KPIs postes */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Postes</p>
              {loadingMap
                ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Chargement…</div>
                : errorMap
                  ? <div className="flex items-center gap-2 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{errorMap}</div>
                  : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-blue-700">{filteredPostes.length}</p>
                        <p className="text-[10px] text-blue-500 uppercase">Filtrés</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                      </div>
                    </div>
                  )
              }
            </div>

            {/* KPIs lignes */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lignes</p>
              {loadingWires
                ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Chargement…</div>
                : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-purple-700">{filteredWires.length}</p>
                        <p className="text-[10px] text-purple-500 uppercase">Filtrées</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold">{wiresCount}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                      </div>
                    </div>
                    {wiresCount > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2 text-center">
                          <p className="text-base font-bold text-cyan-700">{totalLengthFiltered.toFixed(2)} km</p>
                          <p className="text-[10px] text-cyan-500 uppercase">Longueur filtrée</p>
                        </div>
                        <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2 text-center">
                          <p className="text-base font-bold text-cyan-700">{totalLengthAll.toFixed(2)} km</p>
                          <p className="text-[10px] text-cyan-500 uppercase">Longueur totale</p>
                        </div>
                      </div>
                    )}
                    {filteredWires.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/20 rounded-lg p-2 text-center">
                          <p className="text-base font-bold">{wireKpis.troncons}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Tronçons</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-center">
                          <p className="text-base font-bold text-green-700">{wireKpis.supports}</p>
                          <p className="text-[10px] text-green-500 uppercase">Supports</p>
                        </div>
                        {wireKpis.remontees > 0 && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-amber-700">{wireKpis.remontees}</p>
                            <p className="text-[10px] text-amber-500 uppercase">Remontées</p>
                          </div>
                        )}
                        {wireKpis.ptRemarquables > 0 && (
                          <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-cyan-700">{wireKpis.ptRemarquables}</p>
                            <p className="text-[10px] text-cyan-500 uppercase">Pts remarq.</p>
                          </div>
                        )}
                        <div className="col-span-2 flex justify-center gap-3 text-[10px] text-muted-foreground pt-1">
                          {wireKpis.aerien     > 0 && <span>{wireKpis.aerien} aériens</span>}
                          {wireKpis.souterrain > 0 && <span>{wireKpis.souterrain} souterr.</span>}
                          {wireKpis.mixte      > 0 && <span>{wireKpis.mixte} mixtes</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            </div>

            <div className="border-t" />

            {/* Filtres */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtres postes</p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Search className="h-3 w-3" />Recherche</Label>
                <Input placeholder="Substation, feeder…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 text-xs w-full" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type de poste</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {TYPES_POSTE.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Exploitation</Label>
                <Select value={selectedExploitation} onValueChange={setSelectedExploitation}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Toutes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {EXPLOITATIONS.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Régime poste</Label>
                <Select value={selectedRegime} onValueChange={setSelectedRegime}>
                  <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {REGIMES_POSTE.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Période (postes & lignes)</Label>
                <DateFilter
                  dateRangeType={dateRangeType}
                  dateRange={dateRange}
                  onRangeTypeChange={(type: DateRangeType) => setDateRangeType(type)}
                  onCustomRangeChange={(range: DateRange) => setCustomRange(range)}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtres actifs</p>
                <div className="flex flex-wrap gap-1">
                  {selectedType         !== "all" && <Badge variant="secondary" className="text-[10px] gap-1 h-5">{TYPES_POSTE.find(t => t.id === selectedType)?.label}<XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSelectedType("all")} /></Badge>}
                  {selectedExploitation !== "all" && <Badge variant="secondary" className="text-[10px] gap-1 h-5">{EXPLOITATIONS.find(e => e.id === selectedExploitation)?.label}<XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSelectedExploitation("all")} /></Badge>}
                  {selectedRegime       !== "all" && <Badge variant="secondary" className="text-[10px] gap-1 h-5">{REGIMES_POSTE.find(r => r.id === selectedRegime)?.label}<XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSelectedRegime("all")} /></Badge>}
                  {searchQuery && <Badge variant="secondary" className="text-[10px] gap-1 h-5">« {searchQuery} »<XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSearchQuery("")} /></Badge>}
                  {dateRangeType !== "all" && (
                    <Badge variant="secondary" className="text-[10px] gap-1 h-5">
                      {dateRangeType === "today" ? "Aujourd'hui" : dateRangeType === "week" ? "Cette semaine" : dateRangeType === "month" ? "Ce mois" : "Personnalisé"}
                      <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setDateRangeType("all")} />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer sidebar */}
          <div className="shrink-0 border-t px-3 py-2 flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={resetFilters}><RefreshCw className="h-3 w-3" />Réinitialiser</Button>
            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleRefresh}><RefreshCw className="h-3 w-3" />Actualiser</Button>
          </div>
        </div>
      </div>

      {/* ── Carte ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 relative">
        {errorMap && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm font-medium">{errorMap}</p>
              <Button size="sm" onClick={refresh}>Réessayer</Button>
            </div>
          </div>
        )}
        <FullscreenMap
          equipments={mapPoints}
          wires={mapWires}
          onMarkerClick={handleMarkerClick}
          onWireClick={handleWireClick}
          onWaypointClick={handleWaypointClick}
        />
      </div>

      {/* ── Panneaux de détail ───────────────────────────────────────────────── */}
      <DetailSheet
        substationId={selectedSubstation}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        poste={poste}
        loading={loadingDetail}
        error={errorDetail}
      />
      <WireDetailSheet
        wireId={selectedWireId}
        isOpen={isWireSheetOpen}
        onClose={handleCloseWireSheet}
        wire={wire}
        loading={loadingWireDetail}
        error={errorWireDetail}
      />
      <SupportDetailSheet
        isOpen={isSupportModalOpen}
        onClose={() => { setIsSupportModalOpen(false); supportHook.reset(); }}
        loading={supportHook.loading}
        error={supportHook.error}
        data={supportHook.data}
      />
      <REASDetailSheet
        isOpen={isREASModalOpen}
        onClose={() => { setIsREASModalOpen(false); reasHook.reset(); }}
        loading={reasHook.loading}
        error={reasHook.error}
        data={reasHook.data}
      />
      {/* ── Point remarquable ── */}
      <PointRemarquableDetailSheet
        isOpen={isPtRemarquableModalOpen}
        onClose={() => { setIsPtRemarquableModalOpen(false); ptRemarquableHook.reset(); }}
        loading={ptRemarquableHook.loading}
        error={ptRemarquableHook.error}
        data={ptRemarquableHook.data}
      />
    </div>
  );
}