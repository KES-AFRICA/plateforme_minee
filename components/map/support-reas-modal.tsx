"use client";

import { useState, useCallback } from "react";
import { Loader2, AlertCircle, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { REASDetail, SupportDetail } from "@/lib/types/kobo";
import { fetchREASDetail, fetchSupportDetail } from "@/lib/api/services/koboService";
import { PhotoThumb } from "@/app/(dashboard)/map/page";

// ─── Types locaux ────────────────────────────────────────────────────────────
export interface WaypointClickData {
  type:          "support" | "remontee";
  wire_id:       number;
  troncon_index: number;
  support_index?: number;
  point_index?: number;

}

// ─── Hook support ─────────────────────────────────────────────────────────────
export function useSupportDetail() {
  const [data,    setData]    = useState<SupportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async (wireId: number, tronconIndex: number, supportIndex: number) => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetchSupportDetail(wireId, tronconIndex, supportIndex);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement support");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setData(null); setError(null); }, []);
  return { data, loading, error, fetch, reset };
}

// ─── Hook REAS ────────────────────────────────────────────────────────────────
export function useREASDetail() {
  const [data,    setData]    = useState<REASDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async (wireId: number, tronconIndex: number) => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetchREASDetail(wireId, tronconIndex);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement REAS");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setData(null); setError(null); }, []);
  return { data, loading, error, fetch, reset };
}

// ─── Helpers UI ──────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

const TYPE_SUPPORT_LABEL: Record<string, string> = {
  "1": "Bois",
  "2": "PBA (Béton)",
  "3": "Métallique",
};

const TYPE_SUPPORT_COLOR: Record<string, string> = {
  "1": "bg-amber-100 text-amber-800 border-amber-200",
  "2": "bg-blue-100 text-blue-800 border-blue-200",
  "3": "bg-slate-100 text-slate-800 border-slate-200",
};

// ─── SupportDetailSheet ───────────────────────────────────────────────────────
export function SupportDetailSheet({ isOpen, onClose, loading, error, data }: {
  isOpen:  boolean;
  onClose: () => void;
  loading: boolean;
  error:   string | null;
  data:    SupportDetail | null;
}) {
  const typeLabel = data ? (TYPE_SUPPORT_LABEL[data.poteau.type_support ?? ""] ?? "Inconnu") : "";
  const typeColor = data ? (TYPE_SUPPORT_COLOR[data.poteau.type_support ?? ""] ?? "") : "";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95vw]! sm:w-[50vw]! max-w-none! flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-green-50/50">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-green-500 shrink-0 mt-0.5" />
            <div>
              <SheetTitle className="text-base">
                {data ? `Support #${data.support_index}` : "Support"}
              </SheetTitle>
              <SheetDescription className="mt-0.5">
                {data ? `Wire #${data.wire_id} · Tronçon ${data.troncon_index} · ${data.wire.feeder_name ?? ""}` : "Chargement des détails…"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Chargement…</span>
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
              {/* Contexte wire */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-purple-500" />
                <span className="font-medium text-foreground">{data.wire.feeder_name}</span>
                {data.wire.tension_kv && <span>· {data.wire.tension_kv} kV</span>}
                {data.wire.phase      && <span>· Phase {data.wire.phase}</span>}
                <span className="ml-auto">Tronçon {data.troncon_index} / Support {data.support_index} sur {data.troncon.supports_total}</span>
              </div>

              {/* Photos */}
              {(data.photos.support || data.photos.armement) && (
                <div className={`grid gap-3 ${data.photos.support && data.photos.armement ? "grid-cols-2" : "grid-cols-1"}`}>
                  {data.photos.support  && <div><p className="text-xs text-muted-foreground mb-1">Support</p><PhotoThumb src={data.photos.support}  alt="Photo support" /></div>}
                  {data.photos.armement && <div><p className="text-xs text-muted-foreground mb-1">Armement</p><PhotoThumb src={data.photos.armement} alt="Photo armement" /></div>}
                </div>
              )}

              {/* Position GPS */}
              {data.poteau.position && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono">{data.poteau.position.latitude.toFixed(6)}, {data.poteau.position.longitude.toFixed(6)}</span>
                  {data.poteau.position.altitude   && <span>· Alt {data.poteau.position.altitude.toFixed(1)} m</span>}
                  {data.poteau.position.precision  && <span>· Préc ±{data.poteau.position.precision.toFixed(1)} m</span>}
                </div>
              )}

              {/* Poteau */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Poteau</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</p>
                    <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded border ${typeColor}`}>{typeLabel}</span>
                  </div>
                  <Field label="Hauteur"   value={data.poteau.hauteur} />
                  <Field label="État"      value={data.poteau.etat} />
                </div>

                {data.poteau.pba && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-2">Caractéristiques PBA</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Forme"     value={data.poteau.pba.forme} />
                      <Field label="Structure" value={data.poteau.pba.structure} />
                      <Field label="Effort"    value={data.poteau.pba.effort} />
                    </div>
                  </div>
                )}

                {data.poteau.metallique && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Caractéristiques Métallique</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Forme"     value={data.poteau.metallique.forme} />
                      <Field label="Structure" value={data.poteau.metallique.structure} />
                      <Field label="Effort"    value={data.poteau.metallique.effort} />
                    </div>
                  </div>
                )}

                {data.poteau.bois && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2">Caractéristiques Bois</p>
                    <Field label="Structure" value={data.poteau.bois.structure} />
                  </div>
                )}
              </div>

              {/* Armement */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Armement</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Type"           value={data.armement.type} />
                  <Field label="Nombre"         value={data.armement.nombre} />
                  <Field label="État"           value={data.armement.etat} />
                  <Field label="Atronconnement" value={data.armement.atronconnement} />
                </div>
              </div>

              {/* Câble du tronçon */}
              {data.troncon.cable && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Câble du tronçon</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Nature"  value={data.troncon.cable.nature} />
                    <Field label="Section" value={data.troncon.cable.section} />
                    <Field label="Isolant" value={data.troncon.cable.isolant} />
                  </div>
                </div>
              )}

              {/* Méta */}
              <div className="text-xs text-muted-foreground border-t pt-3 flex flex-wrap gap-4">
                <span>Wire KoBo #{data.meta.kobo_id}</span>
                {data.meta.submitted_by    && <span>Saisi par {data.meta.submitted_by}</span>}
                {data.meta.submission_time && <span>{data.meta.submission_time.slice(0, 10)}</span>}
              </div>
            </>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── REASDetailSheet ──────────────────────────────────────────────────────────
export function REASDetailSheet({ isOpen, onClose, loading, error, data }: {
  isOpen:  boolean;
  onClose: () => void;
  loading: boolean;
  error:   string | null;
  data:    REASDetail | null;
}) {
  const typeLabel = data ? (TYPE_SUPPORT_LABEL[data.support.type_support ?? ""] ?? "Inconnu") : "";
  const typeColor = data ? (TYPE_SUPPORT_COLOR[data.support.type_support ?? ""] ?? "") : "";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[95vw]! sm:w-[50vw]! max-w-none! flex flex-col p-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-amber-500 shrink-0 mt-0.5" />
            <div>
              <SheetTitle className="text-base">
                {data ? `Remontée REAS` : "Remontée"}
              </SheetTitle>
              <SheetDescription className="mt-0.5">
                {data ? `Wire #${data.wire_id} · Tronçon ${data.troncon_index} · ${data.wire.feeder_name ?? ""}` : "Chargement des détails…"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Chargement…</span>
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
              {/* Contexte wire */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-purple-500" />
                <span className="font-medium text-foreground">{data.wire.feeder_name}</span>
                {data.wire.tension_kv && <span>· {data.wire.tension_kv} kV</span>}
                {data.wire.phase      && <span>· Phase {data.wire.phase}</span>}
              </div>

              {/* Photos */}
              {(data.photos.support || data.photos.support_accessoires || data.photos.armement) && (
                <div className={`grid gap-3 ${[data.photos.support, data.photos.support_accessoires, data.photos.armement].filter(Boolean).length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>
                  {data.photos.support             && <div><p className="text-xs text-muted-foreground mb-1">Support REAS</p><PhotoThumb src={data.photos.support}             alt="Photo support REAS" /></div>}
                  {data.photos.support_accessoires && <div><p className="text-xs text-muted-foreground mb-1">Accessoires</p><PhotoThumb src={data.photos.support_accessoires} alt="Photo accessoires" /></div>}
                  {data.photos.armement            && <div><p className="text-xs text-muted-foreground mb-1">Armement</p><PhotoThumb src={data.photos.armement}            alt="Photo armement REAS" /></div>}
                </div>
              )}

              {/* Position GPS */}
              {data.support.position && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono">{data.support.position.latitude.toFixed(6)}, {data.support.position.longitude.toFixed(6)}</span>
                  {data.support.position.altitude  && <span>· Alt {data.support.position.altitude.toFixed(1)} m</span>}
                  {data.support.position.precision && <span>· Préc ±{data.support.position.precision.toFixed(1)} m</span>}
                </div>
              )}

              {/* Support REAS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Support REAS</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Type support</p>
                    <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded border ${typeColor}`}>{typeLabel}</span>
                  </div>
                  <Field label="Barcode"      value={data.support.barcode} />
                  <Field label="Hauteur"      value={data.support.hauteur} />
                  <Field label="État"         value={data.support.etat} />
                  <Field label="État remontée" value={data.support.etat_remontee} />
                  <Field label="Sens"         value={data.support.sens} />
                  <Field label="Type remontée" value={data.support.type_remontee} />
                  <Field label="Accessoires"  value={data.support.accessoires} />
                  {data.support.double && <Field label="Double" value={data.support.double} />}
                </div>

                {data.support.pba && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-2">PBA</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Forme"     value={data.support.pba.forme} />
                      <Field label="Structure" value={data.support.pba.structure} />
                      <Field label="Effort"    value={data.support.pba.effort} />
                    </div>
                  </div>
                )}

                {data.support.metallique && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Métallique</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Forme"     value={data.support.metallique.forme} />
                      <Field label="Structure" value={data.support.metallique.structure} />
                      <Field label="Effort"    value={data.support.metallique.effort} />
                    </div>
                  </div>
                )}
              </div>

              {/* Armement REAS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Armement REAS</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Type"           value={data.armement.type} />
                  <Field label="Nombre"         value={data.armement.nombre} />
                  <Field label="État"           value={data.armement.etat} />
                  <Field label="Atronconnement" value={data.armement.atronconnement} />
                  <Field label="Parafoudre"     value={data.armement.parafoudre} />
                  <Field label="État parafoudre" value={data.armement.etat_parafoudre} />
                  {data.armement.eclateur && (
                    <>
                      <Field label="Éclateur"       value={data.armement.eclateur} />
                      <Field label="État éclateur"  value={data.armement.etat_eclateur} />
                    </>
                  )}
                </div>
              </div>

              {/* Câble REAS */}
              {(data.cable.nature || data.cable.section || data.cable.isolant || data.cable.pose) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-1">Câble de remontée</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Nature"  value={data.cable.nature} />
                    <Field label="Section" value={data.cable.section} />
                    <Field label="Isolant" value={data.cable.isolant} />
                    <Field label="Pose"    value={data.cable.pose} />
                  </div>
                </div>
              )}

              {/* Méta */}
              <div className="text-xs text-muted-foreground border-t pt-3 flex flex-wrap gap-4">
                <span>Wire KoBo #{data.meta.kobo_id}</span>
                {data.meta.submitted_by    && <span>Saisi par {data.meta.submitted_by}</span>}
                {data.meta.submission_time && <span>{data.meta.submission_time.slice(0, 10)}</span>}
              </div>
            </>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}