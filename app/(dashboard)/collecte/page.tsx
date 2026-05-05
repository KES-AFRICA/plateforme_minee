"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Box,
  Building2,
  CalendarDays,
  Filter,
  LayoutGrid,
  Power,
  RefreshCw,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Period } from "@/components/collecte/interface";
import { DecoupageStats } from "@/lib/types/collecte";
import { useCollecteStats } from "@/hooks/use-collecteStats";
import { EquipIcon, generateAnomaliesFromData, LineChart, pctCol, SpeedGauge } from "@/components/collecte/structure";
import CollecteAvancement from "@/components/collecte/Progression";
import KpiCards from "@/components/collecte/KpiCards";

function FilterDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<Period>("today");
  const [selected, setSelected] = useState<string[]>([]);
  const exploitations = ["DRC", "DRD", "DRSM", "DRSOM", "DRY"];

  const toggle = (e: string) =>
    setSelected((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#D1DCF0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EEF1F7] px-5 py-4">
          <p className="text-sm font-bold text-[#111827]">Filtres</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5EAF2]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-4">
          <div>
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Période
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["today", "week", "custom"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="flex flex-col items-center gap-1 rounded-xl border py-3 text-[10px] font-semibold transition-all"
                  style={
                    period === p
                      ? {
                          background: "#EBF3FC",
                          borderColor: "#185FA5",
                          color: "#185FA5",
                        }
                      : {
                          background: "#F8FAFE",
                          borderColor: "#E5EAF2",
                          color: "#6B7280",
                        }
                  }
                >
                  <CalendarDays className="h-4 w-4" />
                  {p === "today"
                    ? "Aujourd'hui"
                    : p === "week"
                      ? "Cette semaine"
                      : "Personnalisé"}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="mt-2 space-y-2">
                <input
                  type="date"
                  className="w-full rounded-lg border border-[#D1DCF0] px-3 py-2 text-[11px] text-[#374151] outline-none focus:border-[#185FA5]"
                />
                <input
                  type="date"
                  className="w-full rounded-lg border border-[#D1DCF0] px-3 py-2 text-[11px] text-[#374151] outline-none focus:border-[#185FA5]"
                />
              </div>
            )}
          </div>
          <div>
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Direction régionale
            </p>
            <div className="flex flex-wrap gap-2">
              {exploitations.map((ex) => (
                <button
                  key={ex}
                  onClick={() => toggle(ex)}
                  className="rounded-lg border px-3 py-1.5 text-[11px] transition-all"
                  style={
                    selected.includes(ex)
                      ? {
                          background: "#EBF3FC",
                          borderColor: "#185FA5",
                          color: "#185FA5",
                          fontWeight: 600,
                        }
                      : {
                          background: "#F8FAFE",
                          borderColor: "#E5EAF2",
                          color: "#6B7280",
                          fontWeight: 500,
                        }
                  }
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => {
              setPeriod("today");
              setSelected([]);
            }}
            className="flex-1 rounded-xl border border-[#E5EAF2] bg-white py-2.5 text-[11px] font-semibold text-[#6B7280] transition hover:bg-[#F3F4F6]"
          >
            Réinitialiser
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#185FA5] py-2.5 text-[11px] font-bold text-white transition hover:bg-[#0C447C]"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xs flex-col border-l border-[#E5EAF2] bg-white shadow-xl transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between border-b border-[#EEF1F7] px-5 py-4">
          <p className="text-sm font-bold text-[#111827]">{title}</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5EAF2]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </>
  );
}

export default function CollecteDashboardPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDecoupage, setSelectedDecoupage] =
    useState<DecoupageStats | null>(null);

  // Utilisation du hook pour les données dynamiques
  const { data, loading, refreshing, error, lastUpdated, refresh } =
    useCollecteStats();

  // Transformation des données pour l'affichage
  const equipementList = data
    ? [
        {
          nom: "Postes source",
          collectes: data.global.postes_source.collectes,
          attendus: data.global.postes_source.attendus || 0,
          taux: data.global.postes_source.taux || 0,
        },
        {
          nom: "H59",
          collectes: data.global.h59.collectes,
          attendus: data.global.h59.attendus || 0,
          taux: data.global.h59.taux || 0,
        },
        {
          nom: "H61",
          collectes: data.global.h61.collectes,
          attendus: data.global.h61.attendus || 0,
          taux: data.global.h61.taux || 0,
        },
        {
          nom: "Jeu de barres",
          collectes: data.global.busbars.collectes,
          attendus: data.global.busbars.attendus || 0,
          taux: data.global.busbars.taux || 0,
        },
        {
          nom: "Cellules",
          collectes: data.global.bays.collectes,
          attendus: data.global.bays.attendus || 0,
          taux: data.global.bays.taux || 0,
        },
        {
          nom: "Transformateurs",
          collectes: data.global.transformers.collectes,
          attendus: data.global.transformers.attendus || 0,
          taux: data.global.transformers.taux || 0,
        },
        {
          nom: "Appareillage",
          collectes: data.global.appareillage.collectes,
          attendus: 0,
          taux: 0,
        },
        {
          nom: "Tableau BT",
          collectes: data.global.tableau_bt.collectes,
          attendus: 0,
          taux: 0,
        },
        {
          nom: "Support",
          collectes: data.global.supports.collectes,
          attendus: 0,
          taux: 0,
        },
      ]
    : [];

  // Données pour le graphique linéaire (exemple - à adapter selon vos données réelles)
  const lineSeries = [
    {
      nom: "Tableau BT",
      color: "#185FA5",
      dash: [],
      data: [
        12,
        18,
        25,
        30,
        42,
        55,
        68,
        75,
        data?.global.tableau_bt.collectes || 89,
      ],
    },
    {
      nom: "Appareillage",
      color: "#BA7517",
      dash: [6, 3],
      data: [
        5,
        8,
        14,
        19,
        24,
        30,
        37,
        40,
        data?.global.appareillage.collectes || 47,
      ],
    },
    {
      nom: "Support",
      color: "#1D9E75",
      dash: [2, 2],
      data: [
        40,
        65,
        90,
        130,
        175,
        210,
        255,
        285,
        data?.global.supports.collectes || 312,
      ],
    },
  ];

  const SEMAINE_LABELS = [
    "Lun",
    "Mar",
    "Mer",
    "Jeu",
    "Ven",
    "Sam",
    "Dim",
    "Lun",
    "Mar",
  ];

  // Calcul des statistiques globales
  const totalCollectes = data?.global.postes_collectes.collectes || 0;
  const totalAttendus = data?.global.postes_collectes.attendus || 1;
  const totalTaux = data?.global.postes_collectes.taux || 0;

  const totalEquipes = data?.equipes.liste.length || 0;
  const equipesActives = data?.equipes.total_actives || 0;

  const feedersCollectes = data?.feeders.collectes || 0;
  const feedersAttendus = data?.feeders.attendus || 1;
  const feedersTaux = data?.feeders.taux || 0;
  const derniereSoumission = data?.equipes.liste.reduce((latest, eq) => {
    const lastDate = new Date(eq.derniere_soumission);
    return lastDate > latest ? lastDate : latest;
  }, new Date(0));

  // Anomalies générées à partir des données
  const anomalies = data?.decoupage
    ? generateAnomaliesFromData(data.decoupage)
    : { manquants: [], nouveaux: [], doublons: [] };

  const anomalyDefs = [
    {
      key: "manquants" as const,
      label: "Manquants",
      dot: "#E24B4A",
      light: "#FCEBEB",
      text: "#A32D2D",
      badge: "#F7C1C1",
    },
    {
      key: "nouveaux" as const,
      label: "Nouveaux",
      dot: "#1D9E75",
      light: "#EAF5F0",
      text: "#0F6E56",
      badge: "#9FE1CB",
    },
    {
      key: "doublons" as const,
      label: "Doublons",
      dot: "#BA7517",
      light: "#FEF6E7",
      text: "#633806",
      badge: "#FAC775",
    },
  ];

  const handleCardClick = (decoupageItem: DecoupageStats) => {
    setSelectedDecoupage(decoupageItem);
    setDrawerOpen(true);
  };

  // État de chargement
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#185FA5] border-t-transparent"></div>
          <p className="mt-4 text-sm text-[#6B7280]">
            Chargement des données...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA]">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-semibold text-[#111827]">
            Erreur de chargement
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-xl bg-[#185FA5] px-4 py-2 text-sm font-semibold text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full space-y-4 bg-[#F4F6FA] px-4 py-5 md:px-8 md:py-7"
      style={{ fontFamily: "'DM Sans',sans-serif" }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 border border-blue-100/50 shadow-lg shadow-blue-100/20">
        {/* Effet de fond animé */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-600/5" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />

        <div className="relative px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo et titre */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#185FA5] to-[#0C447C] blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#185FA5] to-[#0C447C] shadow-md">
                  <BarChart3
                    className="h-6 w-6 text-white"
                    strokeWidth={1.75}
                  />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight text-[#0C2340]">
                  Tableau de bord d'inventaire des actifs
                </h1>
                <p className="text-[13px] font-medium text-[#185FA5] mt-0.5">
                  Distribution électrique & Commerciale
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setFilterOpen(true)}
                className="group relative overflow-hidden rounded-xl border border-[#D1DCF0] bg-white/80 backdrop-blur-sm px-4 py-2.5 text-[12px] font-semibold text-[#374151] transition-all duration-300 hover:border-[#185FA5] hover:bg-white hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#185FA5]/0 to-[#185FA5]/0 group-hover:from-[#185FA5]/5 group-hover:to-[#185FA5]/0 transition-all duration-500" />
                <span className="relative flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-300" />
                  <span className="tracking-wide">Filtres</span>
                </span>
              </button>

              <button
                onClick={refresh}
                disabled={refreshing}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#185FA5] to-[#0C447C] px-5 py-2.5 text-[12px] font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-[#185FA5]/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative flex items-center gap-2">
                  <RefreshCw
                    className={`h-3.5 w-3.5 transition-all duration-300 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`}
                  />
                  <span className="tracking-wide">
                    {refreshing ? "Actualisation…" : "Actualiser"}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

   
      <CollecteAvancement />

      
       

      <KpiCards
        feedersCollectes={feedersCollectes}
        feedersAttendus={feedersAttendus}
        feedersTaux={feedersTaux}
        equipesActives={equipesActives}
        totalEquipes={totalEquipes}
        totalCollectes={totalCollectes}
        totalAttendus={totalAttendus}
        totalTaux={totalTaux}
        derniereSoumission={""}
      />

      {/* SPEEDOMETERS */}
      <div className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white">
        <div className="flex items-center gap-3 border-b border-[#EEF1F7] bg-gradient-to-r from-[#EBF3FC] to-[#EAF5F0] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#185FA5]">
            <LayoutGrid className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              Détail par équipement
            </p>
            <p className="text-[10px] text-[#6B7280]">
              Taux de collecte — référentiel inclus
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 bg-[#F8FAFE] p-5 sm:grid-cols-2 lg:grid-cols-3">
          {equipementList.map((eq) => {
            const col = pctCol(eq.taux);
            return (
              <div
                key={eq.nom}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E5EAF2] bg-white p-4 transition-all hover:border-[#B5D4F4] hover:shadow-md"
              >
                <div className="flex items-center gap-2 self-start">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: col.light, color: col.fill }}
                  >
                    <EquipIcon nom={eq.nom} className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#374151]">
                    {eq.nom}
                  </span>
                </div>
                <SpeedGauge pct={eq.taux} color={col.fill} />
                <p className="text-[11px] text-[#9CA3AF]">
                  <b className="font-semibold text-[#374151]">{eq.collectes}</b>{" "}
                  / {eq.attendus}
                  <span className="ml-2 font-bold" style={{ color: col.fill }}>
                    {eq.taux}%
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* LINE CHART */}
      <div className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#EEF1F7] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF1F7]">
              <TrendingUp className="h-4 w-4 text-[#6B7280]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                Progression de collecte
              </p>
              <p className="text-[10px] text-[#9CA3AF]">
                Tableau BT · Appareillage · Support
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {lineSeries.map((s) => (
              <div key={s.nom} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="text-[11px] text-[#6B7280]">{s.nom}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-4">
          <LineChart series={lineSeries} labels={SEMAINE_LABELS} />
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#EEF1F7] border-t border-[#EEF1F7]">
          {lineSeries.map((s) => {
            const last = s.data[s.data.length - 1];
            const prev = s.data[s.data.length - 2];
            const delta = last - prev;
            return (
              <div key={s.nom} className="py-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF]">
                  {s.nom}
                </p>
                <p
                  className="mt-0.5 text-xl font-bold"
                  style={{ color: s.color }}
                >
                  {last}
                </p>
                <p className="text-[10px] font-medium text-[#1D9E75]">
                  {delta >= 0 ? `+${delta}` : delta} aujourd&apos;hui
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ANOMALIES */}
      <div className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-white">
        <div className="flex items-center gap-3 border-b border-[#EEF1F7] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3CD]">
            <AlertCircle className="h-4 w-4 text-[#BA7517]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              Anomalies de collecte
            </p>
            <p className="text-[10px] text-[#9CA3AF]">
              Zones à faible taux de collecte
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {anomalyDefs.map((a) => {
              const total = anomalies[a.key].reduce((s, e) => s + e.val, 0);
              return total > 0 ? (
                <span
                  key={a.key}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: a.badge, color: a.text }}
                >
                  {a.label}: {total}
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-[#EEF1F7] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {anomalyDefs.map((a) => {
            const entries = anomalies[a.key];
            const maxVal = entries.length
              ? Math.max(...entries.map((e) => e.val))
              : 1;
            return (
              <div key={a.key} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 text-[11px] font-bold"
                    style={{ color: a.text }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: a.dot }}
                    />
                    {a.label}
                  </div>
                  {entries.length > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: a.badge, color: a.text }}
                    >
                      {entries.reduce((s, e) => s + e.val, 0)}
                    </span>
                  )}
                </div>
                {entries.length === 0 ? (
                  <p className="text-[11px] italic text-[#C4C9D4]">
                    Aucune anomalie détectée
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {entries.map((e) => (
                      <div
                        key={e.nom}
                        className="flex items-center gap-2.5 border-b border-[#F3F4F6] pb-2.5 last:border-0 last:pb-0"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: a.light }}
                        >
                          <AlertCircle
                            className="h-3.5 w-3.5"
                            style={{ color: a.dot }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium capitalize text-[#374151]">
                            {e.nom.replace(/_/g, " ")}
                          </p>
                          <div
                            className="mt-1 h-[3px] rounded-full opacity-40"
                            style={{
                              width: `${Math.round((e.val / maxVal) * 100)}%`,
                              background: a.dot,
                            }}
                          />
                        </div>
                        <span
                          className="text-[13px] font-bold"
                          style={{ color: a.text }}
                        >
                          {e.val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER DIALOG */}
      <FilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} />

      {/* DETAIL DRAWER */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Détail - ${selectedDecoupage?.decoupage || "Direction régionale"}`}
      >
        {selectedDecoupage && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {[
                {
                  label: "Postes collectés",
                  val: selectedDecoupage.postes_collectes.collectes,
                  attendus: selectedDecoupage.postes_collectes.attendus,
                  color: "#1D9E75",
                },
                {
                  label: "Feeder collectés",
                  val: selectedDecoupage.feeders.collectes,
                  attendus: selectedDecoupage.feeders.attendus,
                  color: "#185FA5",
                },
                {
                  label: "Taux global",
                  val: `${selectedDecoupage.postes_collectes.taux || 0}%`,
                  color: "#BA7517",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex-1 rounded-xl border border-[#E5EAF2] bg-[#F8FAFE] p-3 text-center"
                >
                  <p className="text-[9px] uppercase tracking-widest text-[#9CA3AF]">
                    {item.label}
                  </p>
                  <p
                    className="mt-1 text-[22px] font-bold"
                    style={{ color: item.color }}
                  >
                    {item.val}
                    {item.attendus !== undefined && item.attendus !== null && (
                      <span className="ml-1 text-xs opacity-40">
                        {" "}
                        / {item.attendus}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[#9CA3AF]">
                Détail par équipement
              </p>
              {[
                {
                  label: "Postes source",
                  data: selectedDecoupage.postes_source,
                  icon: Building2,
                },
                { label: "H59", data: selectedDecoupage.h59, icon: Zap },
                { label: "H61", data: selectedDecoupage.h61, icon: Zap },
                {
                  label: "Jeu de barres",
                  data: selectedDecoupage.busbars,
                  icon: LayoutGrid,
                },
                { label: "Cellules", data: selectedDecoupage.bays, icon: Box },
                {
                  label: "Transformateurs",
                  data: selectedDecoupage.transformers,
                  icon: Power,
                },
              ].map((item) => {
                if (!item.data) return null;
                const taux = item.data.taux || 0;
                const c = pctCol(taux);
                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#E5EAF2] bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon
                          className="h-3.5 w-3.5"
                          style={{ color: c.fill }}
                        />
                        <span className="text-[11px] font-medium text-[#374151]">
                          {item.label}
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: c.fill }}
                      >
                        {taux}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="flex-1 overflow-hidden rounded-full bg-[#EEF1F7]"
                        style={{ height: 5 }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${taux}%`, background: c.fill }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {item.data.collectes}/{item.data.attendus || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}