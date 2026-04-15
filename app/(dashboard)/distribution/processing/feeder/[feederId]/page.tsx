"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  Copy, GitCompare, FilePlus, FileX, AlertCircle,
  CheckCircle2, ChevronRight, ChevronDown,
  X, Check, Zap, Building2, Cable, Box, ToggleLeft,
  Layers, Info, MapPin, Save, UserCheck, Filter,
  Play, Timer, User, RefreshCw,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import React from "react";
import { useAuth } from "@/lib/auth/context";
import { useFeederComparison } from "@/hooks/useComparison";
import { FeederComparisonResult, TableName, AnomalyItem, EquipmentDetail } from "@/lib/types/comparison";
import { buildPhotoUrl } from "@/lib/api/services/koboService";
import { PhotoThumb } from "@/app/(dashboard)/map/page";
import {
  useTreatmentStatus,
  useAssignTreatment,
  useStartTreatment,
  useCompleteTreatment,
  useUpdateAttribute,
  useAllUsers,
  useSetPending,
  useSetCollecting,
  useSetPendingValidation
} from "@/hooks/use-treatment-service";

// ─── Leaflet client-only ──────────────────────────────────────────────
const FullscreenMap = dynamic(
  () => import("@/components/distribution/feeder-map"),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full bg-muted/30 rounded-lg flex items-center justify-center animate-pulse"
        style={{ height: "30vh", minHeight: 200 }}
      >
        <span className="text-sm text-muted-foreground">Chargement de la carte…</span>
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────
type AnomalyType = "ok" | "duplicate" | "divergence" | "new" | "missing" | "complex";
type FilterType = AnomalyType | "all";

interface TreatmentState {
  [anomalyId: string]: {
    treated: boolean;
    editedFields: Record<string, string>;
  };
}

// ─── Durée ────────────────────────────────────────────────────────────
const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
};

// ─── KPI Config ───────────────────────────────────────────────────────
const KPI_CONFIG = [
  { type: "all" as const, label: "Tous", icon: Filter, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10", activeBg: "bg-slate-500/15", activeBorder: "border-slate-500/50" },
  { type: "ok" as const, label: "Conformes", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", activeBg: "bg-emerald-500/15", activeBorder: "border-emerald-500/50" },
  { type: "duplicate" as const, label: "Doublons", icon: Copy, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", activeBg: "bg-purple-500/15", activeBorder: "border-purple-500/50" },
  { type: "divergence" as const, label: "Divergences", icon: GitCompare, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", activeBg: "bg-amber-500/15", activeBorder: "border-amber-500/50" },
  { type: "new" as const, label: "Nouveaux", icon: FilePlus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", activeBg: "bg-emerald-500/15", activeBorder: "border-emerald-500/50" },
  { type: "missing" as const, label: "Manquants", icon: FileX, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", activeBg: "bg-orange-500/15", activeBorder: "border-orange-500/50" },
  { type: "complex" as const, label: "Complexes", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", activeBg: "bg-red-500/15", activeBorder: "border-red-500/50" },
] as const;

// ─── Mapping noms frontend → noms tables PostgreSQL ───────────────────
const TABLE_NAME_MAP: Record<string, string> = {
  powertransformer: "power_transformers",
  substation: "substations",
  bus_bar: "busbar",
  bay: "bay",
  switch: "switch",
  wire: "wire",
  feeder: "feeders",
};

// ─── Icônes / labels par table ─────────────────────────────────────────
const TABLE_ICONS: Record<string, React.ElementType> = {
  substation: Building2, powertransformer: Zap, bus_bar: Layers,
  bay: Box, switch: ToggleLeft, wire: Cable, feeder: Zap,
};
const TABLE_LABELS: Record<string, string> = {
  substation: "Substation", powertransformer: "Transformateur", bus_bar: "Bus Bar",
  bay: "Cellule", switch: "Switch", wire: "Câble", feeder: "Départ",
};

// ─── Helpers ──────────────────────────────────────────────────────────
const FL: Record<string, string> = {
  name: "Nom", code: "Code", type: "Type", voltage: "Tension (kV)", active: "Actif",
  created_date: "Créé le", display_scada: "SCADA", apparent_power: "Puissance (kVA)",
  substation_id: "Poste source", feeder_id: "Départ", phase: "Phase",
  localisation: "Localisation", regime: "Régime", section: "Section",
  nature_conducteur: "Conducteur", height: "Hauteur (m)", latitude: "Latitude",
  longitude: "Longitude",
  highest_voltage_level: "U max (kV)", exploitation: "Exploitation",
  zone_type: "Type zone", security_zone_id: "Zone sécu.", second_substation_id: "Poste 2",
  normal_open: "NO", bay_id: "Cellule", nature: "Nature", t1: "T1", t2: "T2",
  busbar_id1: "Bus bar 1", busbar_id2: "Bus bar 2", is_injection: "Injection",
  is_feederhead: "Tête départ", local_name: "Nom local", m_rid: "M-RID",
  w1_voltage: "Tension primaire", w2_voltage: "Tension secondaire",
  substations_m_rid: "Poste source",
};
const fl = (k: string) => FL[k] || k;
const fv = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  return String(v);
};

// ─── Badge anomalie ───────────────────────────────────────────────────
function AnomalyBadge({ type }: { type: AnomalyType }) {
  const cfg = KPI_CONFIG.find((k) => k.type === type)!;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
      <Icon className="h-2.5 w-2.5" />{cfg.label}
    </span>
  );
}

// ─── Dialog assignation ────────────────────────────────────────────────
function AssignDialog({
  isOpen, onClose, onAssign, feederName, processingAgents, isAssigning, currentUser, isReassign = false,
}: {
  isOpen: boolean; onClose: () => void; onAssign: (agentId: string, agentName: string) => void;
  feederName: string; processingAgents: any[]; isAssigning: boolean; currentUser: any | null; isReassign?: boolean;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  const handleAssign = () => {
    if (!selectedAgentId) { toast.warning("Veuillez sélectionner un agent"); return; }
    const selectedAgent = processingAgents.find(agent => agent.id === selectedAgentId);
    if (selectedAgent) onAssign(selectedAgentId, `${selectedAgent.firstName} ${selectedAgent.lastName}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            {isReassign ? "Assigner un autre agent" : "Assigner un agent"}
          </DialogTitle>
          <DialogDescription>
            {isReassign ? "Changez l'agent responsable de ce départ." : "Assignez ce départ à un agent de traitement."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Départ concerné</Label>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-sm">{feederName}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent">Sélectionner un agent</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger id="agent" className="w-full cursor-pointer">
                <SelectValue placeholder="Choisir un agent..." />
              </SelectTrigger>
              <SelectContent>
                {processingAgents.length === 0 ? (
                  <SelectItem value="none" disabled>Aucun agent disponible</SelectItem>
                ) : (
                  processingAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(agent.firstName, agent.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{agent.firstName} {agent.lastName}</span>
                        <div className="ml-2 py-1 px-2 border rounded-md text-xs">{agent.company}</div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" className="flex-1 cursor-pointer" onClick={onClose} disabled={isAssigning}>Annuler</Button>
          <Button onClick={handleAssign} disabled={isAssigning || !selectedAgentId || processingAgents.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-700 cursor-pointer">
            {isAssigning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assignation...</> : <><UserCheck className="h-4 w-4 mr-2" />{isReassign ? "Réassigner" : "Assigner"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── OccurrenceEditCard ───────────────────────────────────────────────
function OccurrenceEditCard({
  occurrence,
  index,
  canEdit,
  onSave,
  feederId,
  equipmentTable,
  user,
  updateAttributeMutation,
}: {
  occurrence: any;
  index: number;
  canEdit: boolean;
  onSave: (mrid: string, updatedData: Record<string, unknown>) => void;
  feederId: string;
  equipmentTable: string;
  user: any;
  updateAttributeMutation: any;
}) {
  const HIDDEN_FIELDS = new Set([
    "qrcode", "precision", "photo", "exploitattion_m_rid", "collected_date",
    "collected_agent_name", "arrondissements_m_rid", "structure_m_rid",
    "second_switch_m_rid", "pole_m_rid", "created_at", "created_date",
  ]);
  const LOCATION_FIELDS = new Set(["latitude", "longitude"]);

  const record = occurrence.full_record || {};
  const mrid = occurrence.m_rid;

  const [editedData, setEditedData] = useState<Record<string, unknown>>({ ...record });
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getPhotoUrl = (photo: any) => {
    if (!photo) return null;
    if (typeof photo === 'string') return buildPhotoUrl(photo);
    if (Array.isArray(photo) && photo.length > 0) return buildPhotoUrl(photo[0]);
    return null;
  };
  const photoUrl = getPhotoUrl(record.photo);

  const editableFields = useMemo(() => {
    return Object.keys(record).filter(k =>
      !HIDDEN_FIELDS.has(k) && !LOCATION_FIELDS.has(k)
    );
  }, [record]);

  const fieldsWithValue = editableFields.filter(k => record[k] !== null && record[k] !== undefined && record[k] !== "");
  const fieldsWithoutValue = editableFields.filter(k => record[k] === null || record[k] === undefined || record[k] === "");

  const handleFieldChange = (field: string, value: unknown) =>
    setEditedData(prev => ({ ...prev, [field]: value }));

  const getFieldInputType = (field: string): "text" | "number" | "select" => {
    if (["active", "is_injection", "is_feederhead", "normal_open", "display_scada"].includes(field)) return "select";
    if (["voltage", "apparent_power", "height", "w1_voltage", "w2_voltage", "highest_voltage_level"].includes(field)) return "number";
    return "text";
  };

  const handleSave = async () => {
    if (!user) { toast.error("Utilisateur non connecté"); return; }
    setIsSaving(true);
    const changedFields = editableFields.filter(field =>
      String(editedData[field]) !== String(record[field])
    );
    if (changedFields.length === 0) { toast.info("Aucune modification"); setIsSaving(false); return; }
    const sqlTableName = TABLE_NAME_MAP[equipmentTable] ?? equipmentTable;
    try {
      await Promise.all(changedFields.map(field =>
        updateAttributeMutation.mutateAsync({
          feeder_id: feederId,
          table_name: sqlTableName,
          record_id: String(mrid),
          attribute_name: field,
          new_value: editedData[field],
          changed_by: user.id,
          changed_by_name: `${user.firstName} ${user.lastName}`,
          comment: `Correction doublon occurrence #${index + 1}`,
        })
      ));
      toast.success(`Occurrence #${index + 1} — ${changedFields.length} champ(s) enregistré(s)`);
      onSave(mrid, editedData);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
    setIsSaving(false);
  };

  const hasChanges = editableFields.some(f => String(editedData[f]) !== String(record[f]));

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden bg-purple-50/30 dark:bg-purple-950/10">
      <div className="px-3 py-2.5 bg-purple-100/50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
            Occurrence #{index + 1}
          </span>
          <span className="text-[10px] font-mono text-purple-600/70 break-all">{mrid}</span>
        </div>
        {hasChanges && (
          <span className="text-[10px] text-amber-600 font-medium">● modifié</span>
        )}
      </div>

      {photoUrl && (
        <div className="px-3 pt-3">
          <PhotoThumb src={photoUrl} alt={`Occurrence ${index + 1}`} />
        </div>
      )}

      {(record.latitude || record.longitude) && (
        <div className="px-3 pt-3">
          <div className="p-2 rounded-lg bg-muted/30 flex items-center gap-2 text-xs">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="font-mono text-muted-foreground">
              {record.latitude ? parseFloat(String(record.latitude)).toFixed(6) : "—"},{" "}
              {record.longitude ? parseFloat(String(record.longitude)).toFixed(6) : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">non modifiable</span>
          </div>
        </div>
      )}

      <div className="p-3 space-y-2">
        {fieldsWithValue.map(field => {
          const inputType = getFieldInputType(field);
          const value = editedData[field];
          const originalValue = record[field];
          const isModified = String(value) !== String(originalValue);

          return (
            <div key={field} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">{fl(field)}</Label>
                {isModified && canEdit && (
                  <span className="text-[10px] text-amber-600">modifié</span>
                )}
              </div>
              {!canEdit ? (
                <div className="p-1.5 rounded bg-muted/20 text-xs font-mono">{fv(value)}</div>
              ) : inputType === "select" ? (
                <Select value={String(value)} onValueChange={v => handleFieldChange(field, v === "true")}>
                  <SelectTrigger className="h-8 text-xs cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true" className="cursor-pointer">Oui / Actif</SelectItem>
                    <SelectItem value="false" className="cursor-pointer">Non / Inactif</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={inputType}
                  value={String(value ?? "")}
                  onChange={e => handleFieldChange(field, inputType === "number" ? parseFloat(e.target.value) : e.target.value)}
                  className={cn("h-8 text-xs", isModified && "border-amber-500 focus-visible:ring-amber-500")}
                />
              )}
              {isModified && canEdit && (
                <p className="text-[10px] text-muted-foreground">Ancienne valeur: {fv(originalValue)}</p>
              )}
            </div>
          );
        })}

        {fieldsWithoutValue.length > 0 && (
          <details className="pt-1">
            <summary
              className="text-[11px] text-purple-600 cursor-pointer hover:text-purple-800 select-none"
              onClick={() => setIsExpanded(p => !p)}
            >
              {isExpanded ? "Masquer" : `+ ${fieldsWithoutValue.length} champ(s) vide(s)`}
            </summary>
            <div className="mt-2 space-y-2">
              {fieldsWithoutValue.map(field => {
                const inputType = getFieldInputType(field);
                const value = editedData[field];
                return (
                  <div key={field} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{fl(field)}</Label>
                    {!canEdit ? (
                      <div className="p-1.5 rounded bg-muted/20 text-xs font-mono text-muted-foreground">—</div>
                    ) : inputType === "select" ? (
                      <Select value={String(value ?? "")} onValueChange={v => handleFieldChange(field, v === "true")}>
                        <SelectTrigger className="h-8 text-xs cursor-pointer"><SelectValue placeholder="Non défini" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true" className="cursor-pointer">Oui / Actif</SelectItem>
                          <SelectItem value="false" className="cursor-pointer">Non / Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={inputType}
                        value={String(value ?? "")}
                        placeholder="—"
                        onChange={e => handleFieldChange(field, inputType === "number" ? parseFloat(e.target.value) : e.target.value)}
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {canEdit && (
        <div className="px-3 pb-3 border-t border-purple-200 dark:border-purple-800 pt-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            size="sm"
            className="w-full cursor-pointer"
          >
            {isSaving
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Enregistrement...</>
              : <><Save className="h-3.5 w-3.5 mr-2" />Enregistrer l'occurrence #{index + 1}</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sheet détail équipement ───────────────────────────────────────────
function EquipmentDetailSheet({
  equipment, isOpen, onClose, onSave, treatment, onFieldChange, isTreatmentActive, isTreatmentAllowed,
  feederId, user, updateAttributeMutation,
}: {
  equipment: EquipmentDetail | null; isOpen: boolean; onClose: () => void;
  onSave: (equipment: EquipmentDetail, updatedData: Record<string, unknown>) => void;
  treatment: TreatmentState; onFieldChange: (anomalyId: string, field: string, val: string) => void;
  isTreatmentActive: boolean; isTreatmentAllowed: boolean | null;
  feederId: string; user: any; updateAttributeMutation: any;
}) {
  const [editedData, setEditedData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  const HIDDEN_FIELDS = new Set([
    "qrcode", "precision", "photo", "exploitattion_m_rid", "collected_date",
    "collected_agent_name", "arrondissements_m_rid", "structure_m_rid",
    "second_switch_m_rid", "pole_m_rid"
  ]);
  const LOCATION_FIELDS = new Set(["latitude", "longitude"]);

  const divergentFieldNames = useMemo(() => {
    const d = equipment?.anomalies.find(a => a.type === "divergence");
    return d?.divergent_fields ? new Set(d.divergent_fields.map(df => df.field)) : new Set<string>();
  }, [equipment]);

  const allFields = useMemo(() => {
    if (!equipment) return [];
    const data = editedData;
    const fieldsWithValue: string[] = [];
    const fieldsWithoutValue: string[] = [];
    const keys = Object.keys(data).filter(k =>
      !HIDDEN_FIELDS.has(k) && !LOCATION_FIELDS.has(k) &&
      k !== "m_rid" && k !== "_anomalyType" && k !== "_table" &&
      k !== "created_date" && k !== "created_at" &&
      k !== "structure_m_rid" && k !== "localisation" && k !== "description" && k !== "observation"
    );
    for (const field of keys) {
      const value = data[field];
      const hasValue = value !== null && value !== undefined && value !== "";
      if (hasValue) fieldsWithValue.push(field);
      else fieldsWithoutValue.push(field);
    }
    const sortByPriority = (fields: string[]) =>
      fields.sort((a, b) => {
        const aP = divergentFieldNames.has(a);
        const bP = divergentFieldNames.has(b);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return a.localeCompare(b);
      });
    return [...sortByPriority(fieldsWithValue), ...sortByPriority(fieldsWithoutValue)];
  }, [equipment, editedData, divergentFieldNames]);

  useEffect(() => {
    if (equipment) setEditedData({ ...equipment.data });
  }, [equipment]);

  if (!equipment) return null;

  const Icon = TABLE_ICONS[equipment.table] || Box;
  const getPhotoUrl = (photo: any) => {
    if (!photo) return null;
    if (typeof photo === 'string') return buildPhotoUrl(photo);
    if (Array.isArray(photo) && photo.length > 0) return buildPhotoUrl(photo[0]);
    return null;
  };
  const displayPhotoUrl = getPhotoUrl(equipment.photo || equipment.data?.photo);
  const canEdit = isTreatmentActive && isTreatmentAllowed;
  const isDuplicateAnomaly = equipment.anomalies.some(a => a.type === "duplicate");
  const duplicateAnomaly = equipment.anomalies.find(a => a.type === "duplicate");

  const getFieldInputType = (field: string): "text" | "number" | "select" => {
    if (["active", "is_injection", "is_feederhead", "normal_open", "display_scada"].includes(field)) return "select";
    if (["voltage", "apparent_power", "height", "w1_voltage", "w2_voltage", "highest_voltage_level"].includes(field)) return "number";
    return "text";
  };

  const handleFieldChange = (field: string, value: string | number | boolean) =>
    setEditedData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    onSave(equipment, editedData);
    setIsSaving(false);
    onClose();
  };

  const sheetWidthClass = isDuplicateAnomaly
    ? "w-screen! sm:w-[92vw]! max-w-none! sm:max-w-[92vw]!"
    : "w-screen! sm:w-[480px]! max-w-none! sm:max-w-[480px]!";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className={cn(sheetWidthClass, "flex flex-col p-0 overflow-hidden")}>
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base">{equipment.name}</SheetTitle>
            </div>
            <SheetDescription className="text-sm">
              {TABLE_LABELS[equipment.table] || equipment.table} • ID: {equipment.mrid}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
            {isDuplicateAnomaly && duplicateAnomaly?.duplicate_occurrences ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-purple-200 dark:border-purple-800">
                  <Copy className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-400">
                    {duplicateAnomaly.duplicate_occurrences.length} occurrences détectées
                  </h3>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 ml-auto">
                    Doublon confirmé
                  </Badge>
                </div>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(duplicateAnomaly.duplicate_occurrences.length, 3)}, minmax(0, 1fr))`
                  }}
                >
                  {duplicateAnomaly.duplicate_occurrences.map((occ, idx) => (
                    <OccurrenceEditCard
                      key={occ.m_rid || idx}
                      occurrence={occ}
                      index={idx}
                      canEdit={!!canEdit}
                      onSave={(mrid, data) => {}}
                      feederId={feederId}
                      equipmentTable={equipment.table}
                      user={user}
                      updateAttributeMutation={updateAttributeMutation}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-2 border-b border-dashed border-border">
                {displayPhotoUrl ? (
                  <div
                    className="relative cursor-pointer w-full h-full"
                    onClick={() => { setFullscreenPhoto(displayPhotoUrl); setIsFullscreen(true); }}
                  >
                    <PhotoThumb src={displayPhotoUrl} alt={equipment.name} />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-muted/50 flex items-center justify-center">
                    <Icon className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            )}

            {!isDuplicateAnomaly && equipment.anomalies.some(a => a.type === "divergence") && canEdit && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Champs en divergence (Référence vs Collecté)
                </Label>
                {equipment.anomalies
                  .filter(a => a.type === "divergence" && a.divergent_fields)
                  .flatMap(a => a.divergent_fields || [])
                  .map((field, idx) => {
                    const anomalyId = equipment.anomalies.find(a => a.type === "divergence")?.id;
                    const editedValue = anomalyId ? treatment[anomalyId]?.editedFields[field.field] : undefined;
                    const currentValue = editedValue !== undefined ? editedValue : fv(field.collected_value);
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{fl(field.field)}</span>
                          <AnomalyBadge type="divergence" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-1">Référence</p>
                            <p className="font-mono p-2 rounded bg-muted/30 line-through text-muted-foreground">{fv(field.reference_value)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Collecté</p>
                            {anomalyId && (
                              <Input value={currentValue} onChange={(e) => onFieldChange(anomalyId, field.field, e.target.value)} className="h-8 text-sm font-mono border-amber-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {!isDuplicateAnomaly && !canEdit && equipment.anomalies.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-sm text-amber-700">Anomalie détectée</span>
                </div>
                {equipment.anomalies.map((anomaly) => (
                  <div key={anomaly.id} className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <AnomalyBadge type={anomaly.type} />
                      <span className="text-muted-foreground text-xs">ID: {anomaly.id}</span>
                    </div>
                    {anomaly.type === "divergence" && anomaly.divergent_fields && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-2">
                        {anomaly.divergent_fields.map((df, idx) => (
                          <div key={idx} className="p-2 rounded bg-muted/20">
                            <div className="font-medium text-xs mb-1">{fl(df.field)}</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-1.5 rounded bg-red-50 dark:bg-red-950/20">
                                <span className="text-red-600 text-[10px] font-medium">RÉFÉRENCE</span>
                                <p className="font-mono">{fv(df.reference_value)}</p>
                              </div>
                              <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/20">
                                <span className="text-amber-600 text-[10px] font-medium">COLLECTÉ</span>
                                <p className="font-mono">{fv(df.collected_value)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isDuplicateAnomaly && equipment.location && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-1" />Localisation GPS
                </Label>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-mono">{equipment.location.lat.toFixed(6)}, {equipment.location.lng.toFixed(6)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">⚠️ La localisation ne peut pas être modifiée</p>
                </div>
              </div>
            )}

            {!isDuplicateAnomaly && (
              <div className="space-y-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Données de l'équipement</Label>
                {allFields.map((field) => {
                  const value = editedData[field];
                  if (value === undefined) return null;
                  const originalValue = equipment.data[field];
                  const isModified = String(value) !== String(originalValue);
                  const inputType = getFieldInputType(field);
                  const isDivergentField = divergentFieldNames.has(field);
                  const isDisabled = !canEdit;
                  return (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span>{fl(field)}</span>
                          {isDivergentField && (
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-200">Divergence</Badge>
                          )}
                        </div>
                        {isModified && canEdit && !isDisabled && (
                          <span className="text-[10px] text-amber-600">modifié</span>
                        )}
                      </Label>
                      {isDisabled ? (
                        <div className="p-2 rounded-md bg-muted/20 text-sm font-mono">{fv(value)}</div>
                      ) : inputType === "select" ? (
                        <Select value={String(value)} onValueChange={(v) => handleFieldChange(field, v === "true")}>
                          <SelectTrigger className="h-9 text-sm cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="cursor-pointer">Oui / Actif</SelectItem>
                            <SelectItem value="false" className="cursor-pointer">Non / Inactif</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={inputType}
                          value={String(value)}
                          onChange={(e) => handleFieldChange(field, inputType === "number" ? parseFloat(e.target.value) : e.target.value)}
                          className={cn("h-9 text-sm", isModified && "border-amber-500 focus-visible:ring-amber-500")}
                        />
                      )}
                      {isModified && originalValue !== undefined && canEdit && !isDisabled && (
                        <p className="text-[10px] text-muted-foreground">Ancienne valeur: {fv(originalValue)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isDuplicateAnomaly && canEdit && (
            <SheetFooter className="px-5 py-4 border-t shrink-0 flex flex-row gap-3">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={onClose}>Annuler</Button>
              <Button className="flex-1 cursor-pointer" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : <><Save className="h-4 w-4 mr-2" />Enregistrer</>}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {isFullscreen && fullscreenPhoto && (
        <Dialog open={isFullscreen} onOpenChange={() => setIsFullscreen(false)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 bg-black/95 border-none">
            <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white cursor-pointer">
              <X className="h-6 w-6" />
            </button>
            <img src={fullscreenPhoto} alt="Photo plein écran" className="w-full h-full object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}


// ─── AnomalyCard ──────────────────────────────────────────────────────
function AnomalyCard({ anomaly, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  anomaly: AnomalyItem;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  const t = treatment[anomaly.id];
  const isTreated = t?.treated ?? false;
  const Icon = TABLE_ICONS[anomaly.table] || Box;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  const equipmentDetail: EquipmentDetail | null = useMemo(() => {
    const collectedData = anomaly.collected_data || {};
    const referenceData = anomaly.reference_data || {};
    const directData = anomaly.data || {};
    let recordData: Record<string, any> = {};
    if (anomaly.type === "missing") recordData = { ...directData, ...referenceData };
    else if (anomaly.type === "new") recordData = { ...directData, ...collectedData };
    else if (anomaly.type === "divergence") recordData = { ...referenceData, ...collectedData };
    else if (anomaly.type === "duplicate") recordData = { ...collectedData };
    else recordData = { ...directData, ...collectedData };
    const photoUrl = collectedData.photo || directData.photo || null;
    return {
      id: anomaly.mrid, mrid: anomaly.mrid, table: anomaly.table,
      name: anomaly.name || recordData.name || String(anomaly.mrid),
      data: { ...recordData, _anomalyType: anomaly.type },
      anomalies: [anomaly], photo: photoUrl,
      location: recordData.latitude && recordData.longitude
        ? { lat: parseFloat(String(recordData.latitude)), lng: parseFloat(String(recordData.longitude)) }
        : undefined,
    };
  }, [anomaly]);

  const getPhotoUrl = (photo: any) => {
    if (!photo) return null;
    if (typeof photo === 'string') return buildPhotoUrl(photo);
    if (Array.isArray(photo) && photo.length > 0) return buildPhotoUrl(photo[0]);
    return null;
  };
  const displayPhotoUrl = getPhotoUrl(equipmentDetail?.photo);

  const displayFields = useMemo(() => {
    const data = equipmentDetail?.data || {};
    if (anomaly.type === "divergence" && anomaly.divergent_fields) {
      return anomaly.divergent_fields.slice(0, 6).map(df => ({ label: fl(df.field), value: fv(df.collected_value), field: df.field }));
    } else if (anomaly.type === "new" || anomaly.type === "missing") {
      const imp = ["name", "type", "voltage", "regime", "exploitation", "zone_type", "section", "nature_conducteur", "phase"];
      const selected = imp.filter(f => data[f] !== undefined).slice(0, 9);
      if (selected.length < 6) selected.push(...Object.keys(data).filter(f => !imp.includes(f) && f !== "_anomalyType" && f !== "photo").slice(0, 6 - selected.length));
      return selected.map(f => ({ label: fl(f), value: fv(data[f]), field: f }));
    } else if (anomaly.type === "duplicate") {
      return [
        { label: "Nom", value: anomaly.name || "—", field: "name" },
        { label: "M-RID", value: anomaly.mrid, field: "m_rid" },
        { label: "Occurrences", value: `${anomaly.duplicate_occurrences?.length || 0}`, field: "count" },
      ];
    }
    return Object.keys(data).filter(k => k !== "m_rid" && k !== "_anomalyType" && k !== "photo").slice(0, 6).map(f => ({ label: fl(f), value: fv(data[f]), field: f }));
  }, [equipmentDetail, anomaly]);

  const handleCardClick = () => {
    if (isClickable && equipmentDetail) onEquipmentClick?.(equipmentDetail);
    else toast.info("Le traitement n'a pas encore commencé pour ce départ");
  };

  return (
    <>
      <div
        className={cn("rounded-xl border transition-all",
          isTreated ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card",
          isClickable ? "cursor-pointer hover:shadow-md" : "cursor-pointer"
        )}
        onClick={handleCardClick}
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-border/40">
          <span className="text-xs font-semibold truncate flex-1">{TABLE_LABELS[anomaly.table] || anomaly.table} — {anomaly.name || anomaly.mrid}</span>
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{anomaly.mrid}</span>
          <AnomalyBadge type={anomaly.type} />
          {isTreated && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" />Traité
            </span>
          )}
        </div>

        <div className="p-3 flex gap-3">
          {displayPhotoUrl ? (
            <div className="w-32 sm:w-48 h-40 sm:h-64 rounded-lg overflow-hidden bg-muted/20 shrink-0 border border-border">
              <img
                src={displayPhotoUrl}
                alt={equipmentDetail?.name || "Photo"}
                className="w-full h-full object-cover cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setFullscreenPhoto(displayPhotoUrl); setIsFullscreen(true); }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200?text=Photo+indisponible'; }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-muted/30">
              <Icon className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {equipmentDetail?.location && (
              <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="font-mono truncate">{equipmentDetail.location.lat.toFixed(5)}, {equipmentDetail.location.lng.toFixed(5)}</span>
              </div>
            )}
            {anomaly.type === "divergence" && anomaly.divergent_fields ? (
              <div className="space-y-2">
                {anomaly.divergent_fields.slice(0, 3).map((df, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                    <div className="p-1.5 rounded bg-red-50 dark:bg-red-950/20">
                      <span className="text-red-600 text-[10px] font-medium">{fl(df.field)} - REF</span>
                      <p className="font-mono truncate">{fv(df.reference_value)}</p>
                    </div>
                    <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/20">
                      <span className="text-amber-600 text-[10px] font-medium">{fl(df.field)} - COL</span>
                      <p className="font-mono truncate">{fv(df.collected_value)}</p>
                    </div>
                  </div>
                ))}
                {anomaly.divergent_fields.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+ {anomaly.divergent_fields.length - 3} autres champs</p>
                )}
              </div>
            ) : anomaly.type === "duplicate" && anomaly.duplicate_occurrences ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-purple-600">⚠️ {anomaly.duplicate_occurrences.length} occurrences trouvées</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {anomaly.duplicate_occurrences.slice(0, 3).map((occ, idx) => (
                    <div key={idx} className="text-[10px] font-mono bg-muted/30 p-1 rounded truncate">{occ.m_rid} - {occ.name}</div>
                  ))}
                  {anomaly.duplicate_occurrences.length > 3 && (
                    <p className="text-[9px] text-muted-foreground">+{anomaly.duplicate_occurrences.length - 3} autres</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {displayFields.map((field) => (
                  <div key={field.field} className="truncate">
                    <span className="text-muted-foreground">{field.label}:</span>
                    <p className="font-mono truncate">{field.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!isTreated && isClickable && canProcess && anomaly.type !== "duplicate" && (
          <div className="flex justify-end pt-2 mt-2 border-t border-border/40">
            <button
              onClick={(e) => { e.stopPropagation(); onMarkTreated(anomaly.id); }}
              className="flex mb-4 mr-4 items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />Marquer traité
            </button>
          </div>
        )}
      </div>

      {isFullscreen && fullscreenPhoto && (
        <Dialog open={isFullscreen} onOpenChange={() => setIsFullscreen(false)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 bg-black/95 border-none">
            <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white cursor-pointer"><X className="h-6 w-6" /></button>
            <img src={fullscreenPhoto} alt="Photo plein écran" className="w-full h-full object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── SwitchItem ────────────────────────────────────────────────────────
function SwitchItem({ switchAnomaly, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  switchAnomaly: AnomalyItem;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  return (
    <AnomalyCard
      anomaly={switchAnomaly}
      treatment={treatment}
      onFieldChange={onFieldChange}
      onMarkTreated={onMarkTreated}
      onEquipmentClick={onEquipmentClick}
      isClickable={isClickable}
      canProcess={canProcess}
    />
  );
}

// ─── BayItem avec SwitchItem utilisé ───────────────────────────────────
function BayItem({ bayAnomaly, switches, filter, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  bayAnomaly: AnomalyItem;
  switches: AnomalyItem[];
  filter: FilterType;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = TABLE_ICONS["bay"] || Box;
  const bayName = bayAnomaly.name || bayAnomaly.mrid;

  const filteredSwitches = useMemo(() => {
    if (filter === "all") return switches;
    return switches.filter(s => s.type === filter);
  }, [switches, filter]);

  if (filter !== "all" && bayAnomaly.type !== filter && filteredSwitches.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden ml-2 sm:ml-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 bg-muted/5 hover:bg-muted/20 transition-colors text-left cursor-pointer"
      >
        {isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <div className="p-0.5 rounded-md bg-muted/50"><Icon className="h-3 w-3 text-primary/70" /></div>
        <span className="font-medium text-xs flex-1 truncate">{bayName}</span>
        <AnomalyBadge type={bayAnomaly.type} />
      </button>

      {isOpen && (
        <div className="pl-6 pr-3 py-2 space-y-2 border-t border-border/30">
          <AnomalyCard
            anomaly={bayAnomaly}
            treatment={treatment}
            onFieldChange={onFieldChange}
            onMarkTreated={onMarkTreated}
            onEquipmentClick={onEquipmentClick}
            isClickable={isClickable}
            canProcess={canProcess}
          />
          {filteredSwitches.length > 0 && (
            <div className="space-y-2 ml-2">
              {filteredSwitches.map(switchAnomaly => (
                <SwitchItem
                  key={switchAnomaly.id}
                  switchAnomaly={switchAnomaly}
                  treatment={treatment}
                  onFieldChange={onFieldChange}
                  onMarkTreated={onMarkTreated}
                  onEquipmentClick={onEquipmentClick}
                  isClickable={isClickable}
                  canProcess={canProcess}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SubstationItem - Version corrigée ────────────────────────────────────
function SubstationItem({ substationAnomaly, bays, transformers, busbars, switchesByBay, filter, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  substationAnomaly: AnomalyItem;
  bays: AnomalyItem[];
  transformers: AnomalyItem[];
  busbars: AnomalyItem[];
  switchesByBay: Map<string, AnomalyItem[]>;
  filter: FilterType;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false); // Fermé par défaut
  const Icon = TABLE_ICONS["substation"] || Building2;
  const substationName = substationAnomaly.name || substationAnomaly.mrid;


  // Filtrer selon le type d'anomalie sélectionné
  const filteredBays = useMemo(() => {
    if (filter === "all") return bays;
    return bays.filter(b => b.type === filter);
  }, [bays, filter]);

  const filteredTransformers = useMemo(() => {
    if (filter === "all") return transformers;
    return transformers.filter(t => t.type === filter);
  }, [transformers, filter]);

  const filteredBusbars = useMemo(() => {
    if (filter === "all") return busbars;
    return busbars.filter(b => b.type === filter);
  }, [busbars, filter]);

  const hasChildren = filteredBays.length > 0 || filteredTransformers.length > 0 || filteredBusbars.length > 0;
  
  // Si filtre actif et aucun enfant correspondant + substation non concernée, on cache
  if (filter !== "all" && substationAnomaly.type !== filter && !hasChildren) return null;

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2.5 bg-muted/10 hover:bg-muted/30 transition-colors text-left cursor-pointer"
      >
        {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <div className="p-1 rounded-md bg-primary/10"><Icon className="h-3.5 w-3.5 text-primary" /></div>
        <span className="font-medium text-sm flex-1 truncate">{substationName}</span>
        {substationAnomaly.data?.type && (
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">
            {substationAnomaly.data.type}
          </span>
        )}
        <AnomalyBadge type={substationAnomaly.type} />
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 border-t border-border/40">
          {/* Toujours afficher la substation elle-même avec sa photo si elle existe */}
          <AnomalyCard
            anomaly={substationAnomaly}
            treatment={treatment}
            onFieldChange={onFieldChange}
            onMarkTreated={onMarkTreated}
            onEquipmentClick={onEquipmentClick}
            isClickable={isClickable}
            canProcess={canProcess}
          />

          {/* Transformateurs - toujours affichés (même les ok) */}
          {filteredTransformers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground pl-2">Transformateurs</div>
              {filteredTransformers.map(transformer => (
                <AnomalyCard key={transformer.id} anomaly={transformer} treatment={treatment} onFieldChange={onFieldChange} onMarkTreated={onMarkTreated} onEquipmentClick={onEquipmentClick} isClickable={isClickable} canProcess={canProcess} />
              ))}
            </div>
          )}

          {/* Bus Bars */}
          {filteredBusbars.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground pl-2">Bus Bars</div>
              {filteredBusbars.map(busbar => (
                <AnomalyCard key={busbar.id} anomaly={busbar} treatment={treatment} onFieldChange={onFieldChange} onMarkTreated={onMarkTreated} onEquipmentClick={onEquipmentClick} isClickable={isClickable} canProcess={canProcess} />
              ))}
            </div>
          )}

          {/* Cellules avec leurs switchs - fermées par défaut */}
          {filteredBays.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground pl-2">Cellules</div>
              <div className="space-y-2">
                {filteredBays.map(bay => {
                  const baySwitches = switchesByBay.get(bay.mrid) || [];
                  return (
                    <BayItem
                      key={bay.id}
                      bayAnomaly={bay}
                      switches={baySwitches}
                      filter={filter}
                      treatment={treatment}
                      onFieldChange={onFieldChange}
                      onMarkTreated={onMarkTreated}
                      onEquipmentClick={onEquipmentClick}
                      isClickable={isClickable}
                      canProcess={canProcess}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SubstationsRootGroup ─────────────────────────────────────────────
function SubstationsRootGroup({ substationsList, switchesByBay, filter, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  substationsList: {
    substation: AnomalyItem;
    bays: AnomalyItem[];
    transformers: AnomalyItem[];
    busbars: AnomalyItem[];
  }[];
  switchesByBay: Map<string, AnomalyItem[]>;
  filter: FilterType;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const substationsWithIssues = substationsList.filter(s => s.substation.type !== "ok").length;
  const totalSubstations = substationsList.length;

  if (substationsList.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left cursor-pointer"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-semibold text-sm flex-1">Postes sources (Substations)</span>
        <div className="flex items-center gap-2">
          {substationsWithIssues > 0 && (
            <span className="text-[10px] text-amber-600">{substationsWithIssues} avec anomalie{substationsWithIssues > 1 ? "s" : ""}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{totalSubstations} poste{totalSubstations > 1 ? "s" : ""}</span>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 border-t border-border/40">
          {substationsList.map((item) => (
            <SubstationItem
              key={item.substation.id}
              substationAnomaly={item.substation}
              bays={item.bays}
              transformers={item.transformers}
              busbars={item.busbars}
              switchesByBay={switchesByBay}
              filter={filter}
              treatment={treatment}
              onFieldChange={onFieldChange}
              onMarkTreated={onMarkTreated}
              onEquipmentClick={onEquipmentClick}
              isClickable={isClickable}
              canProcess={canProcess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WireRootGroup ─────────────────────────────────────────────────────
function WireRootGroup({ wires, filter, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  wires: AnomalyItem[];
  filter: FilterType;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredWires = useMemo(() => {
    if (filter === "all") return wires;
    if (filter === "ok") return wires.filter(w => w.type === "ok");
    return wires.filter(w => w.type === filter);
  }, [wires, filter]);

  const wiresWithIssues = filteredWires.filter(w => w.type !== "ok").length;

  if (filteredWires.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left cursor-pointer"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <Cable className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-semibold text-sm flex-1">Lignes (Wire)</span>
        <div className="flex items-center gap-2">
          {wiresWithIssues > 0 && (
            <span className="text-[10px] text-amber-600">{wiresWithIssues} avec anomalie{wiresWithIssues > 1 ? "s" : ""}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{filteredWires.length} câble{filteredWires.length > 1 ? "s" : ""}</span>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 border-t border-border/40">
          {filteredWires.map(wire => (
            <AnomalyCard
              key={wire.id}
              anomaly={wire}
              treatment={treatment}
              onFieldChange={onFieldChange}
              onMarkTreated={onMarkTreated}
              onEquipmentClick={onEquipmentClick}
              isClickable={isClickable}
              canProcess={canProcess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FeederRootGroup ───────────────────────────────────────────────────
function FeederRootGroup({ feeders, filter, treatment, onFieldChange, onMarkTreated, onEquipmentClick, isClickable, canProcess }: {
  feeders: AnomalyItem[];
  filter: FilterType;
  treatment: TreatmentState;
  onFieldChange: (id: string, field: string, val: string) => void;
  onMarkTreated: (id: string) => void;
  onEquipmentClick?: (equipment: EquipmentDetail) => void;
  isClickable: boolean;
  canProcess: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const filteredFeeders = useMemo(() => {
    if (filter === "all") return feeders;
    if (filter === "ok") return feeders.filter(f => f.type === "ok");
    return feeders.filter(f => f.type === filter);
  }, [feeders, filter]);

  if (filteredFeeders.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left cursor-pointer"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <Zap className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-semibold text-sm flex-1">Départ</span>
        <div className="flex items-center gap-2">
          {filteredFeeders.filter(f => f.type !== "ok").length > 0 && (
            <span className="text-[10px] text-amber-600">{filteredFeeders.filter(f => f.type !== "ok").length} anomalie(s)</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 border-t border-border/40">
          {filteredFeeders.map(feeder => (
            <AnomalyCard
              key={feeder.id}
              anomaly={feeder}
              treatment={treatment}
              onFieldChange={onFieldChange}
              onMarkTreated={onMarkTreated}
              onEquipmentClick={onEquipmentClick}
              isClickable={isClickable}
              canProcess={canProcess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Conversion pour la carte ──────────────────────────────────────────
const convertToMapEquipments = (comparisonResult: FeederComparisonResult | null, currentFilter: FilterType): Record<string, unknown>[] => {
  if (!comparisonResult) return [];
  const mapEquipments: Record<string, unknown>[] = [];
  const tables: TableName[] = ["substation", "wire"];

  const shouldInclude = (type: string) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "ok") return type === "ok";
    return type === currentFilter;
  };

  for (const table of tables) {
    const tableResult = comparisonResult.tables?.[table];
    if (!tableResult) continue;
    for (const ok of tableResult.ok ?? []) {
      if (ok.data?.latitude && ok.data?.longitude && shouldInclude("ok"))
        mapEquipments.push({ ...ok.data, m_rid: ok.mrid, table, _anomalyType: "ok" });
    }
    for (const missing of tableResult.missing ?? []) {
      if (missing.full_record?.latitude && missing.full_record?.longitude && shouldInclude("missing"))
        mapEquipments.push({ ...missing.full_record, m_rid: missing.m_rid, name: missing.name, table, _anomalyType: "missing" });
    }
    for (const newItem of tableResult.new ?? []) {
      if (newItem.full_record?.latitude && newItem.full_record?.longitude && shouldInclude("new"))
        mapEquipments.push({ ...newItem.full_record, m_rid: newItem.m_rid, name: newItem.name, table, _anomalyType: "new" });
    }
    for (const div of tableResult.divergences ?? []) {
      if (div.collected_data?.latitude && div.collected_data?.longitude && shouldInclude("divergence"))
        mapEquipments.push({ ...div.collected_data, m_rid: div.mrid, table, _anomalyType: "divergence" });
    }
    for (const dup of tableResult.duplicates ?? []) {
      for (const occ of dup.occurrences ?? []) {
        if (occ.full_record?.latitude && occ.full_record?.longitude && shouldInclude("duplicate"))
          mapEquipments.push({ ...occ.full_record, m_rid: occ.m_rid, name: occ.name, table, _anomalyType: "duplicate" });
      }
    }
  }
  return mapEquipments;
};

// ─── TimerDisplay ─────────────────────────────────────────────────────
function TimerDisplay({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState<string>("00:00:00");
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const diff = Date.now() - startTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  if (!startTime) return null;
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 w-full">
      <Timer className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-muted-foreground">Temps écoulé:</span>
      <span className="text-base font-bold text-primary font-mono tracking-wide">{elapsed}</span>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────
export default function FeederProcessingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const feederId = params?.feederId as string;
  const feederNameFromUrl = searchParams?.get("name") || feederId;
  const { user } = useAuth();

  const { result: comparisonResult, summary, loading: comparisonLoading, error: comparisonError, refresh } = useFeederComparison(feederId);
  const { data: treatmentStatus, refetch: refetchStatus } = useTreatmentStatus(feederId);
  const { data: usersData, refetch: refetchUsers } = useAllUsers();

  const assignMutation = useAssignTreatment();
  const startMutation = useStartTreatment();
  const setPendingMutation = useSetPending();
  const setCollectingMutation = useSetCollecting();
  const setPendingValidationMutation = useSetPendingValidation();
  const updateAttributeMutation = useUpdateAttribute();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [treatment, setTreatment] = useState<TreatmentState>({});
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const feederStatus = treatmentStatus?.status || "collecting";
  const assignedAgentId = treatmentStatus?.assigned_to;
  const assignedAgentName = treatmentStatus?.assigned_to_name;
  const treatmentStartTimeBackend = treatmentStatus?.started_at ? new Date(treatmentStatus.started_at).getTime() : null;
  const durationSeconds = treatmentStatus?.duration_seconds;

  const isTreatmentActive = feederStatus === "in_progress";
  const isTreatmentAllowed = user?.id === assignedAgentId;
  const feederName = comparisonResult?.feeder_name || feederNameFromUrl;

  const processingAgents = useMemo(() => usersData?.data || [], [usersData]);
  const mapEquipments = useMemo(() => convertToMapEquipments(comparisonResult, activeFilter), [comparisonResult, activeFilter]);

  useEffect(() => {
    if (feederId) { setTreatment({}); refetchUsers(); refetchStatus(); }
  }, [feederId, refetchUsers, refetchStatus]);

  // ─── Conversion anomalies ─────────────────────────────────────────────
  const allAnomalies: AnomalyItem[] = useMemo(() => {
    if (!comparisonResult) return [];
    const anomalies: AnomalyItem[] = [];
    const tables: TableName[] = ["feeder", "substation", "bus_bar", "bay", "switch", "powertransformer", "wire"];
    for (const table of tables) {
      const tableResult = comparisonResult.tables?.[table];
      if (!tableResult) continue;
      for (const ok of tableResult.ok ?? [])
        anomalies.push({ id: `${table}-ok-${ok.mrid}`, type: "ok", table, mrid: ok.mrid, name: ok.data?.name || ok.mrid, data: ok.data });
      for (const missing of tableResult.missing ?? [])
        anomalies.push({ id: `${table}-miss-${missing.m_rid}`, type: "missing", table, mrid: missing.m_rid, name: missing.name, data: missing.full_record });
      for (const div of tableResult.divergences ?? [])
        anomalies.push({ id: `${table}-div-${div.mrid}`, type: "divergence", table, mrid: div.mrid, name: div.name || div.reference_data?.name || div.collected_data?.name || div.mrid, reference_data: div.reference_data, collected_data: div.collected_data, divergent_fields: div.divergent_fields });
      for (const newItem of tableResult.new ?? [])
        anomalies.push({ id: `${table}-new-${newItem.m_rid}`, type: "new", table, mrid: newItem.m_rid, name: newItem.name, data: newItem.full_record });
      for (const dup of tableResult.duplicates ?? []) {
        for (const occ of dup.occurrences ?? [])
          anomalies.push({ id: `${table}-dup-${occ.m_rid}`, type: "duplicate", table, mrid: occ.m_rid, name: occ.name, duplicate_occurrences: dup.occurrences, collected_data: occ.full_record });
      }
    }
    return anomalies;
  }, [comparisonResult]);

  // ─── Regroupement par substation avec les bonnes clés ─────────────────
  const { substationsList, switchesByBay } = useMemo(() => {
    const substations = allAnomalies.filter(a => a.table === "substation");
    const bays = allAnomalies.filter(a => a.table === "bay");
    const transformers = allAnomalies.filter(a => a.table === "powertransformer");
    const busbars = allAnomalies.filter(a => a.table === "bus_bar");
    const switches = allAnomalies.filter(a => a.table === "switch");

    const substationMap = new Map<string, {
      substation: AnomalyItem;
      bays: AnomalyItem[];
      transformers: AnomalyItem[];
      busbars: AnomalyItem[];
    }>();

    for (const substation of substations) {
      substationMap.set(substation.mrid, {
        substation,
        bays: [],
        transformers: [],
        busbars: [],
      });
    }

    // Récupérer substation_id depuis les données (clé: substation_id)
    const getSubstationId = (anomaly: AnomalyItem): string | null => {
      return anomaly.reference_data?.substation_id
        || anomaly.reference_data?.substations_m_rid
        || anomaly.collected_data?.substation_id
        || anomaly.collected_data?.substations_m_rid
        || anomaly.data?.substation_id
        || anomaly.data?.substations_m_rid
        || null;
    };

    for (const bay of bays) {
      const substationId = getSubstationId(bay);
      if (substationId && substationMap.has(substationId)) {
        substationMap.get(substationId)!.bays.push(bay);
      }
    }

    for (const transformer of transformers) {
      const substationId = getSubstationId(transformer);
      if (substationId && substationMap.has(substationId)) {
        substationMap.get(substationId)!.transformers.push(transformer);
      }
    }

    for (const busbar of busbars) {
      const substationId = getSubstationId(busbar);
      if (substationId && substationMap.has(substationId)) {
        substationMap.get(substationId)!.busbars.push(busbar);
      }
    }

    // Regrouper les switchs par bay (clé: bay_id)
    const switchesByBayMap = new Map<string, AnomalyItem[]>();
    for (const switchAnomaly of switches) {
      const bayId = switchAnomaly.reference_data?.bay_id
        || switchAnomaly.collected_data?.bay_id
        || switchAnomaly.data?.bay_id
        || null;
      if (bayId) {
        if (!switchesByBayMap.has(bayId)) switchesByBayMap.set(bayId, []);
        switchesByBayMap.get(bayId)!.push(switchAnomaly);
      }
    }

    return {
      substationsList: Array.from(substationMap.values()),
      switchesByBay: switchesByBayMap,
    };
  }, [allAnomalies]);

  const feeders = useMemo(() => allAnomalies.filter(a => a.table === "feeder"), [allAnomalies]);
  const wires = useMemo(() => allAnomalies.filter(a => a.table === "wire"), [allAnomalies]);

  const counts = useMemo(() => {
    if (summary) return { all: summary.total, ok: summary.ok, duplicate: summary.duplicate, divergence: summary.divergence, new: summary.new, missing: summary.missing, complex: summary.complex };
    return {
      all: allAnomalies.length,
      ok: allAnomalies.filter(a => a.type === "ok").length,
      duplicate: allAnomalies.filter(a => a.type === "duplicate").length,
      divergence: allAnomalies.filter(a => a.type === "divergence").length,
      new: allAnomalies.filter(a => a.type === "new").length,
      missing: allAnomalies.filter(a => a.type === "missing").length,
      complex: allAnomalies.filter(a => a.type === "complex").length,
    };
  }, [summary, allAnomalies]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCompleteCollection = () => {
    if (!user) { toast.error("Utilisateur non connecté"); return; }
    setPendingMutation.mutate({ feeder_id: feederId, completed_by: user.id, completed_by_name: `${user.firstName} ${user.lastName}` }, {
      onSuccess: () => { toast.success("Collecte terminée. En attente de traitement."); refetchStatus(); },
      onError: (error: Error) => toast.error(`Erreur: ${error.message}`)
    });
  };

  const handleBackToCollecting = () => {
    if (!user) { toast.error("Utilisateur non connecté"); return; }
    setCollectingMutation.mutate({ feeder_id: feederId, changed_by: user.id, changed_by_name: `${user.firstName} ${user.lastName}` }, {
      onSuccess: () => { toast.success("Départ remis en cours de collecte"); refetchStatus(); },
      onError: (error: Error) => toast.error(`Erreur: ${error.message}`)
    });
  };

  const handleAssign = async (agentId: string, agentName: string) => {
    setIsAssigning(true);
    assignMutation.mutate({ feeder_id: feederId, agent_id: agentId, agent_name: agentName, assigned_by: user?.id || "", assigned_by_name: `${user?.firstName || ""} ${user?.lastName || ""}` }, {
      onSuccess: () => { toast.success(`Assigné à ${agentName}`); setIsAssignDialogOpen(false); setIsReassignDialogOpen(false); refetchStatus(); },
      onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
      onSettled: () => setIsAssigning(false)
    });
  };

  const handleStartTreatment = () => {
    if (!user) { toast.error("Utilisateur non connecté"); return; }
    startMutation.mutate({ feeder_id: feederId, started_by: user.id, started_by_name: `${user.firstName} ${user.lastName}` }, {
      onSuccess: () => { toast.success("Traitement démarré"); refetchStatus(); },
      onError: (error: Error) => toast.error(`Erreur: ${error.message}`)
    });
  };

  const handleCompleteTreatment = () => {
    if (!user) { toast.error("Utilisateur non connecté"); return; }
    setPendingValidationMutation.mutate({ feeder_id: feederId, completed_by: user.id, completed_by_name: `${user.firstName} ${user.lastName}` }, {
      onSuccess: () => { toast.success("Traitement terminé, en attente de validation"); refetchStatus(); },
      onError: (error: Error) => toast.error(`Erreur: ${error.message}`)
    });
  };

  const handleValidate = () => toast.warning("en cours de développement");
  const handleReject = () => toast.warning("en cours de développement");

  const handleEquipmentSave = (equipment: EquipmentDetail, updatedData: Record<string, unknown>) => {
    if (!user) { toast.error("Utilisateur non connecté"); return; }
    const originalData = equipment.data;
    const changedFields = Object.keys(updatedData).filter(key => originalData[key] !== updatedData[key] && key !== "_anomalyType" && key !== "photo");
    if (changedFields.length === 0) { toast.info("Aucune modification détectée"); return; }
    const sqlTableName = TABLE_NAME_MAP[equipment.table] ?? equipment.table;
    Promise.all(changedFields.map(field =>
      updateAttributeMutation.mutateAsync({ feeder_id: feederId, table_name: sqlTableName, record_id: String(equipment.mrid), attribute_name: field, new_value: updatedData[field], changed_by: user.id, changed_by_name: `${user.firstName} ${user.lastName}`, comment: `Modification depuis l'interface de traitement` })
    )).then(() => { toast.success(`${changedFields.length} champ(s) modifié(s)`); refresh(); }).catch(() => toast.error("Erreur lors de la modification"));
  };

  const handleFieldChange = useCallback((id: string, field: string, val: string) => {
    setTreatment((prev) => ({ ...prev, [id]: { treated: prev[id]?.treated ?? false, editedFields: { ...(prev[id]?.editedFields ?? {}), [field]: val } } }));
  }, []);

  const handleMarkTreated = useCallback((id: string) => {
    setTreatment((prev) => ({ ...prev, [id]: { editedFields: prev[id]?.editedFields ?? {}, treated: true } }));
    toast.success("Anomalie marquée comme traitée");
  }, []);

  const handleEquipmentClick = useCallback((equipment: EquipmentDetail) => {
    setSelectedEquipment(equipment);
    setIsSheetOpen(true);
  }, []);

  const getStatusBadge = () => {
    const map: Record<string, { label: string; className: string }> = {
      collecting: { label: "En cours de collecte", className: "bg-blue-100 text-blue-700 border-blue-200" },
      pending: { label: "En attente de traitement", className: "bg-amber-100 text-amber-700 border-amber-200" },
      assigned: { label: "Assigné", className: "bg-purple-100 text-purple-700 border-purple-200" },
      in_progress: { label: "En cours de traitement", className: "bg-green-100 text-green-700 border-green-200" },
      pending_validation: { label: "En attente de validation", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      validated: { label: "Validé", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      rejected: { label: "Rejeté", className: "bg-red-100 text-red-700 border-red-200" },
    };
    const cfg = map[feederStatus] || { label: feederStatus, className: "bg-gray-100 text-gray-700 border-gray-200" };
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  const renderActionButtons = () => {
    if (feederStatus === "collecting" || feederStatus === "validated" || feederStatus === "rejected") {
      return (
        <Button onClick={handleCompleteCollection} className="gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700" disabled={setPendingMutation.isPending}>
          {setPendingMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : feederStatus === "collecting" ? <Check className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {feederStatus === "collecting" ? "Terminer la collecte" : "Remettre en validation"}
        </Button>
      );
    }
    if (feederStatus === "pending") {
      return (
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Button onClick={handleBackToCollecting} variant="outline" className="gap-2 cursor-pointer w-full" disabled={setCollectingMutation.isPending}>
            {setCollectingMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Remettre en collecte
          </Button>
          <div className="flex items-center gap-2 w-full">
            {!assignedAgentId ? (
              <Button onClick={() => setIsAssignDialogOpen(true)} className="w-full gap-2 bg-purple-600 hover:bg-purple-700 cursor-pointer">
                <UserCheck className="h-4 w-4 mr-2" />Assigner à un agent
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Badge variant="outline" className="justify-center bg-amber-50 text-amber-700 border-amber-200 py-1.5 px-3">
                  Assigné à {assignedAgentName}
                </Badge>
                {(user?.role === 'Admin' || user?.role === 'Chef équipe') && (
                  <Button onClick={() => setIsReassignDialogOpen(true)} variant="outline" className="gap-2 cursor-pointer">
                    <RefreshCw className="h-4 w-4 mr-2" />Réassigner
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (feederStatus === "assigned") {
      return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {user?.id === assignedAgentId && (
            <Button onClick={handleStartTreatment} className="gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer" disabled={startMutation.isPending}>
              {startMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Débuter le traitement
            </Button>
          )}
          <Badge variant="outline" className="justify-center bg-amber-50 text-amber-700 border-amber-200 py-1.5 px-3">
            <User className="h-3 w-3 mr-1.5" />Assigné à {assignedAgentName}
          </Badge>
          {(user?.role === 'Admin' || user?.role === 'Chef équipe') && (
            <Button onClick={() => setIsReassignDialogOpen(true)} variant="outline" className="gap-2 cursor-pointer">
              <RefreshCw className="h-4 w-4 mr-2" />Réassigner
            </Button>
          )}
        </div>
      );
    }
    if (feederStatus === "in_progress" && user?.id === assignedAgentId) {
      return (
        <Button onClick={handleCompleteTreatment} variant="default" className="gap-2 cursor-pointer" disabled={setPendingValidationMutation.isPending}>
          {setPendingValidationMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Terminer le traitement
        </Button>
      );
    }
    if (feederStatus === "pending_validation" && (user?.role === 'Admin' || user?.role === 'Chef équipe' || user?.role === 'Agent validation')) {
      return (
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>Temps: <span className="font-mono font-medium text-foreground">{formatDuration(durationSeconds)}</span></span>
            </div>
            {(user?.role === 'Admin' || user?.role === 'Chef équipe') && (
              <Button onClick={() => setIsReassignDialogOpen(true)} variant="outline" size="sm" className="gap-2 cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5" />Réassigner
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleStartTreatment} className="gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer flex-1" disabled={startMutation.isPending}>
              {startMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Remettre en traitement
            </Button>
            <Button onClick={handleValidate} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
              <CheckCircle2 className="h-4 w-4 mr-2" />Valider
            </Button>
            <Button onClick={handleReject} variant="outline" className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white cursor-pointer">
              <X className="h-4 w-4 mr-2" />Rejeter
            </Button>
          </div>
        </div>
      );
    }
    if (feederStatus === "pending_validation") {
      return (
        <div className="flex items-center gap-3">
          <Badge className="bg-yellow-100 text-yellow-700">En attente de validation</Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Timer className="h-3 w-3" />{formatDuration(durationSeconds)}
          </span>
        </div>
      );
    }
    return null;
  };

  if (comparisonLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des données du feeder...</p>
        </div>
      </div>
    );
  }

  if (comparisonError || !comparisonResult) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Erreur lors du chargement des données</p>
          <Button onClick={refresh} variant="outline" className="mt-4 cursor-pointer">
            <RefreshCw className="h-4 w-4 mr-2" />Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!feederId) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Sélectionnez un départ dans le menu
    </div>
  );

  const isEditAllowed = isTreatmentActive && isTreatmentAllowed;

  return (
    <div className="w-full min-w-0 space-y-4 px-2 sm:px-4 md:px-6 py-4">
      {/* ─── En-tête ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div className="min-w-0">
                  <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-sm px-3 py-1 rounded border hover:bg-muted disabled:opacity-50"
          >
             Actualiser
          </button>
        </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-base sm:text-lg font-bold truncate">{feederName}</h1>
            {getStatusBadge()}
            {durationSeconds && feederStatus === "pending_validation" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                <Timer className="h-3 w-3" /><span>{formatDuration(durationSeconds)}</span>
              </div>
            )}
            {assignedAgentName && feederStatus !== "collecting" && feederStatus !== "pending" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                <User className="h-3 w-3" />
                <span className="hidden sm:inline">Assigné à: </span>
                <span className="font-medium text-foreground">{assignedAgentName}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Traitement · <span className="font-medium text-foreground">{counts.all}</span> anomalie{counts.all > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          {renderActionButtons()}
          {feederStatus === "in_progress" && treatmentStartTimeBackend && (
            <TimerDisplay startTime={treatmentStartTimeBackend} />
          )}
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4 md:grid-cols-7 sm:gap-2">
        {KPI_CONFIG.map((cfg) => {
          const count = counts[cfg.type];
          const isActive = activeFilter === cfg.type;
          const Icon = cfg.icon;
          const treatedN = cfg.type !== "all" && cfg.type !== "ok"
            ? allAnomalies.filter((a) => a.type === cfg.type && treatment[a.id]?.treated).length : 0;
          return (
            <button key={cfg.type} onClick={() => setActiveFilter(isActive ? "all" : cfg.type)} disabled={count === 0}
              className={cn("flex flex-col gap-1.5 p-2 sm:p-3 rounded-xl border text-left transition-all duration-200 active:scale-95 cursor-pointer",
                isActive ? cn(cfg.activeBg, cfg.activeBorder) : "bg-card border-border hover:border-border",
                count === 0 && "opacity-40 cursor-default pointer-events-none"
              )}>
              <div className="flex items-center justify-between">
                <div className={cn("p-1 sm:p-1.5 rounded-lg", cfg.bg)}><Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", cfg.color)} /></div>
                {cfg.type !== "all" && cfg.type !== "ok" && count > 0 && (
                  <span className="text-[9px] text-muted-foreground hidden sm:inline">{treatedN}/{count}</span>
                )}
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold leading-none tabular-nums">{count}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-tight">{cfg.label}</p>
              </div>
              {cfg.type !== "all" && cfg.type !== "ok" && count > 0 && (
                <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(treatedN / count) * 100}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Filtré sur <strong className="text-foreground">{KPI_CONFIG.find((k) => k.type === activeFilter)?.label}</strong></span>
          <button onClick={() => setActiveFilter("all")} className="text-primary hover:underline cursor-pointer">Tout voir</button>
        </div>
      )}

      {/* ─── Carte ──────────────────────────────────────────────────── */}
      <div className="w-full rounded-xl overflow-hidden border border-border" style={{ height: "40vh", minHeight: 250 }}>
        <FullscreenMap equipments={mapEquipments} onMarkerClick={() => {}} feederColor="#6366f1" />
      </div>

      {/* ─── Arborescence à 3 groupes racines ─────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {activeFilter === "all"
            ? `${counts.all} anomalies`
            : activeFilter === "ok"
              ? `${counts.ok} équipements conformes`
              : `${counts[activeFilter]} · ${KPI_CONFIG.find(k => k.type === activeFilter)?.label}`
          }
        </h2>

        {/* Groupe 1: Départ */}
        <FeederRootGroup
          feeders={feeders}
          filter={activeFilter}
          treatment={treatment}
          onFieldChange={handleFieldChange}
          onMarkTreated={handleMarkTreated}
          onEquipmentClick={handleEquipmentClick}
          isClickable={true}
          canProcess={isTreatmentActive && !!isTreatmentAllowed}
        />

        {/* Groupe 2: Substations avec hiérarchie complète */}
        <SubstationsRootGroup
          substationsList={substationsList}
          switchesByBay={switchesByBay}
          filter={activeFilter}
          treatment={treatment}
          onFieldChange={handleFieldChange}
          onMarkTreated={handleMarkTreated}
          onEquipmentClick={handleEquipmentClick}
          isClickable={true}
          canProcess={isTreatmentActive && !!isTreatmentAllowed}
        />

        {/* Groupe 3: Câbles */}
        <WireRootGroup
          wires={wires}
          filter={activeFilter}
          treatment={treatment}
          onFieldChange={handleFieldChange}
          onMarkTreated={handleMarkTreated}
          onEquipmentClick={handleEquipmentClick}
          isClickable={true}
          canProcess={isTreatmentActive && !!isTreatmentAllowed}
        />

        {counts.all === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm">Aucune anomalie trouvée pour ce filtre</p>
          </div>
        )}
      </div>

      {/* ─── Sheet détails ───────────────────────────────────────────── */}
      <EquipmentDetailSheet
        equipment={selectedEquipment}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSave={handleEquipmentSave}
        treatment={treatment}
        onFieldChange={handleFieldChange}
        isTreatmentActive={isTreatmentActive}
        isTreatmentAllowed={isEditAllowed}
        feederId={feederId}
        user={user}
        updateAttributeMutation={updateAttributeMutation}
      />

      {/* ─── Dialogs assignation ────────────────────────────────────── */}
      <AssignDialog isOpen={isAssignDialogOpen} onClose={() => setIsAssignDialogOpen(false)} onAssign={handleAssign} feederName={feederName} processingAgents={processingAgents} isAssigning={isAssigning} currentUser={user} isReassign={false} />
      <AssignDialog isOpen={isReassignDialogOpen} onClose={() => setIsReassignDialogOpen(false)} onAssign={handleAssign} feederName={feederName} processingAgents={processingAgents} isAssigning={isAssigning} currentUser={user} isReassign={true} />
    </div>
  );
}