"use client";

import { useEffect, useState } from "react";
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
import type { DecoupageStats, Period } from "@/lib/types/collecte";
import { useCollecteStats } from "@/hooks/use-collecteStats";
import KpiCards from "@/components/collecte/KpiCards";
import CollecteAvancement from "@/components/collecte/Progression";
import {
  EquipIcon,
  generateAnomaliesFromData,
  LineChart,
  pctCol,
  SpeedGauge,
} from "@/components/collecte/structure";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#D1DCF0] bg-white shadow-2xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#EEF1F7] px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-sm font-bold text-[#111827]">Filtres</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5EAF2]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-4 py-4 sm:px-5">
          <div>
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Période
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["today", "week", "custom"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="flex flex-col items-center gap-1 rounded-xl border py-2 sm:py-3 text-[10px] font-semibold transition-all"
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
                  <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                  className="rounded-lg border px-2.5 py-1.5 text-[10px] sm:px-3 sm:text-[11px] transition-all"
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
        <div className="flex gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
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
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[90vw] sm:max-w-sm md:max-w-md flex-col border-l border-[#E5EAF2] bg-white shadow-xl transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between border-b border-[#EEF1F7] px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-sm font-bold text-[#111827] truncate">{title}</p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5EAF2]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
      </div>
    </>
  );
}

export default function CollecteDashboardPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDecoupage, setSelectedDecoupage] =
    useState<DecoupageStats | null>(null);

  const METRIC_KEYS = [
    "postes_collectes",
    "busbars",
    "bays",
    "transformers",
    "switches",
    "wires",
  ] as const satisfies ReadonlyArray<keyof DecoupageStats>;

  const drawerTauxGlobal = selectedDecoupage
    ? (() => {
        const col = METRIC_KEYS.reduce(
        (s, k) => s + (selectedDecoupage[k]?.collectes ?? 0),
          0,
        );
        const att = METRIC_KEYS.reduce(
          (s, k) => s + (selectedDecoupage[k]?.attendus ?? 0),
          0,
        );
        return att > 0 ? Math.round((col / att) * 100) : 0;
      })()
    : 0;

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
      ]
    : [];

  const lineSeries = [
    {
      nom: "Tableau BT",
      color: "#185FA5",
      dash: [],
      data: [data?.global.tableau_bt.collectes || 89],
    },
    {
      nom: "Appareillage",
      color: "#BA7517",
      dash: [6, 3],
      data: [data?.global.appareillage.collectes || 47],
    },
    {
      nom: "Support",
      color: "#1D9E75",
      dash: [2, 2],
      data: [data?.global.supports.collectes || 312],
    },
  ];

  const SEMAINE_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const totalCollectes = data?.global.postes_collectes.collectes || 0;
  const totalAttendus = data?.global.postes_collectes.attendus || 1;
  const totalTaux = Math.round(data?.global.postes_collectes.taux ?? 0);

  const totalEquipes = data?.equipes.total_actives || 0;
  const equipesActives = data?.equipes.total_actives || 0;

  const feedersCollectes = data?.feeders.collectes || 0;
  const feedersAttendus = data?.feeders.attendus || 1;
  const feedersEnCours = feedersAttendus - feedersCollectes;
  const feedersTaux = Math.round(data?.feeders.taux ?? 0);

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
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA] p-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-[#185FA5] border-t-transparent"></div>
          <p className="mt-4 text-xs sm:text-sm text-[#6B7280]">
            Chargement des données...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA] p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-4 sm:p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-red-500" />
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-[#111827]">
            Erreur de chargement
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#6B7280]">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-xl bg-[#185FA5] px-4 py-2 text-xs sm:text-sm font-semibold text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full space-y-3 sm:space-y-4 bg-[#F4F6FA] px-3 py-3  lg:px-8 lg:py-7"
      style={{ fontFamily: "'DM Sans',sans-serif" }}
    >
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 border border-blue-100/50 shadow-lg shadow-blue-100/20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-600/5" />
        <div className="absolute -right-20 -top-20 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-indigo-500/5 blur-3xl" />

        <div className="relative px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Logo et titre */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="relative group shrink-0">
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#185FA5] to-[#0C447C] blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative flex h-10 w-10 sm:h-[52px] sm:w-[52px] items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#185FA5] to-[#0C447C] shadow-md">
                  <BarChart3
                    className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                    strokeWidth={1.75}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold leading-tight text-[#0C2340] truncate">
                  Tableau de bord d'inventaire des actifs
                </h1>
                <p className="text-[11px] sm:text-[12px] md:text-[13px] font-medium text-[#185FA5] mt-0.5 truncate">
                  Distribution électrique & Commerciale
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setFilterOpen(true)}
                className="group relative flex-1 sm:flex-initial overflow-hidden rounded-lg sm:rounded-xl border border-[#D1DCF0] bg-white/80 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-[12px] font-semibold text-[#374151] transition-all duration-300 hover:border-[#185FA5] hover:bg-white hover:shadow-md active:translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#185FA5]/0 to-[#185FA5]/0 group-hover:from-[#185FA5]/5 group-hover:to-[#185FA5]/0 transition-all duration-500" />
                <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                  <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:scale-110 transition-transform duration-300" />
                  <span className="tracking-wide hidden sm:inline">
                    Filtres
                  </span>
                  <span className="tracking-wide sm:hidden">Filtrer</span>
                </span>
              </button>

              <button
                onClick={refresh}
                disabled={refreshing}
                className="group relative flex-1 sm:flex-initial overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-r from-[#185FA5] to-[#0C447C] px-3 py-2 sm:px-5 sm:py-2.5 text-[11px] sm:text-[12px] font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-[#185FA5]/30 active:translate-y-0.5 disabled:opacity-60"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                  <RefreshCw
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-all duration-300 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`}
                  />
                  <span className="tracking-wide hidden sm:inline">
                    {refreshing ? "Actualisation…" : "Actualiser"}
                  </span>
                  <span className="tracking-wide sm:hidden">
                    {refreshing ? "..." : "Actu"}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Composant d'avancement */}

      {/* KPI Cards */}
      <div className=" grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CollecteAvancement />{" "}
        </div>

        <KpiCards
          feedersCollectes={feedersCollectes}
          feedersEnCours={feedersEnCours}
          feedersAttendus={feedersAttendus}
          feedersTaux={feedersTaux}
          equipesActives={equipesActives}
          totalEquipes={totalEquipes}
          totalCollectes={totalCollectes}
          totalAttendus={totalAttendus}
          totalTaux={totalTaux}
          onDetailsClick={handleCardClick}
        />
      </div>

      {/* SPEEDOMETERS */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[#E5EAF2] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border-b border-[#EEF1F7] bg-gradient-to-r from-[#EBF3FC] to-[#EAF5F0] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#111827]">
              Détail par équipement
            </p>
            <p className="text-[9px] sm:text-[10px] text-[#6B7280] truncate">
              Taux de collecte — référentiel inclus
            </p>
          </div>
        </div>

        {/* ── Grille : 2 cols mobile → 3 cols lg ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 bg-[#F8FAFE] p-3 sm:p-4 md:p-5">
          {equipementList.map((eq) => {
            const col = pctCol(eq.taux);
            return (
              <div
                key={eq.nom}
                className="flex flex-col items-center gap-1.5 rounded-xl sm:rounded-2xl border border-[#E5EAF2] bg-white p-2 sm:p-3 transition-all hover:border-[#B5D4F4] hover:shadow-md"
              >
                {/* En-tête */}
                <div className="flex items-center gap-1.5 sm:gap-2 self-start w-full">
                  <div
                    className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: col.light, color: col.fill }}
                  >
                    <EquipIcon
                      nom={eq.nom}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    />
                  </div>
                  <span className="text-[9px] sm:text-[11px] font-semibold text-[#374151] truncate flex-1 leading-tight">
                    {eq.nom}
                  </span>
                </div>

                {/* Gauge — agrandie via scale, marge verticale pour compenser */}
                <div className="w-full my-1">
                  <SpeedGauge pct={eq.taux} color={col.fill} width={150} />
                </div>

                {/* Compteur */}
                <p className="text-[9px] sm:text-[11px] text-[#9CA3AF] text-center">
                  <b className="font-semibold text-[#374151]">{eq.collectes}</b>
                  <span> / </span> {eq.attendus}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* LINE CHART */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[#E5EAF2] bg-white">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 border-b border-[#EEF1F7] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF1F7]">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#6B7280]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                Progression de collecte
              </p>
              <p className="text-[9px] sm:text-[10px] text-[#9CA3AF] hidden sm:block">
                Tableau BT · Appareillage · Support
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-0 sm:ml-auto">
            {lineSeries.map((s) => (
              <div key={s.nom} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-sm shrink-0"
                  style={{ background: s.color }}
                />
                <span className="text-[10px] sm:text-[11px] text-[#6B7280] truncate">
                  {s.nom}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-2 sm:px-3 md:px-4 py-3 sm:py-4">
          <LineChart series={lineSeries} labels={SEMAINE_LABELS} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#EEF1F7] border-t border-[#EEF1F7]">
          {lineSeries.map((s) => {
            const last = s.data[s.data.length - 1];
            return (
              <div key={s.nom} className="py-2 sm:py-3 px-3 text-center">
                <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#9CA3AF]">
                  {s.nom}
                </p>
                <p
                  className="mt-0.5 text-lg sm:text-xl md:text-2xl font-bold"
                  style={{ color: s.color }}
                >
                  {last}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ANOMALIES */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[#E5EAF2] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border-b border-[#EEF1F7] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEF3CD]">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#BA7517]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">
                Anomalies de collecte
              </p>
              <p className="text-[9px] sm:text-[10px] text-[#9CA3AF] hidden sm:block">
                Zones à faible taux de collecte
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 ml-0 sm:ml-auto">
            {anomalyDefs.map((a) => {
              const total = anomalies[a.key].reduce((s, e) => s + e.val, 0);
              return total > 0 ? (
                <span
                  key={a.key}
                  className="rounded-full px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 text-[8px] sm:text-[9px] md:text-[10px] font-bold"
                  style={{ background: a.badge, color: a.text }}
                >
                  {a.label}: {total}
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#EEF1F7]">
          {anomalyDefs.map((a) => {
            const entries = anomalies[a.key];
            const maxVal = entries.length
              ? Math.max(...entries.map((e) => e.val))
              : 1;
            return (
              <div key={a.key} className="p-3 sm:p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                  <div
                    className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold"
                    style={{ color: a.text }}
                  >
                    <div
                      className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0"
                      style={{ background: a.dot }}
                    />
                    {a.label}
                  </div>
                  {entries.length > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold"
                      style={{ background: a.badge, color: a.text }}
                    >
                      {entries.reduce((s, e) => s + e.val, 0)}
                    </span>
                  )}
                </div>
                {entries.length === 0 ? (
                  <p className="text-[10px] sm:text-[11px] italic text-[#C4C9D4]">
                    Aucune anomalie détectée
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-2.5">
                    {entries.map((e) => (
                      <div
                        key={e.nom}
                        className="flex items-center gap-2 sm:gap-2.5 border-b border-[#F3F4F6] pb-2 last:border-0 last:pb-0"
                      >
                        <div
                          className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: a.light }}
                        >
                          <AlertCircle
                            className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                            style={{ color: a.dot }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] sm:text-[12px] font-medium capitalize text-[#374151] truncate">
                            {e.nom.replace(/_/g, " ")}
                          </p>
                          <div
                            className="mt-1 h-[2px] sm:h-[3px] rounded-full opacity-40"
                            style={{
                              width: `${Math.round((e.val / maxVal) * 100)}%`,
                              background: a.dot,
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px] sm:text-[13px] font-bold shrink-0"
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
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
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
                  val: `${drawerTauxGlobal}%`,
                  color: "#BA7517",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex-1 rounded-xl border border-[#E5EAF2] bg-[#F8FAFE] p-2 sm:p-3 text-center"
                >
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#9CA3AF]">
                    {item.label}
                  </p>
                  <p
                    className="mt-1 text-lg sm:text-[22px] font-bold break-words"
                    style={{ color: item.color }}
                  >
                    {item.val}
                    {item.attendus !== undefined && item.attendus !== null && (
                      <span className="ml-0.5 text-[10px] sm:text-xs opacity-40">
                        {" "}
                        / {item.attendus}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2 sm:space-y-3">
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#9CA3AF]">
                Détail par équipement
              </p>
              <div className="space-y-2">
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
                  {
                    label: "Cellules",
                    data: selectedDecoupage.bays,
                    icon: Box,
                  },
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
                      className="rounded-xl border border-[#E5EAF2] bg-white p-2 sm:p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <item.icon
                            className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
                            style={{ color: c.fill }}
                          />
                          <span className="text-[10px] sm:text-[11px] font-medium text-[#374151] truncate">
                            {item.label}
                          </span>
                        </div>
                        <span
                          className="text-[10px] sm:text-[11px] font-bold shrink-0"
                          style={{ color: c.fill }}
                        >
                          {taux}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className="flex-1 overflow-hidden rounded-full bg-[#EEF1F7]"
                          style={{ height: 4 }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${taux}%`, background: c.fill }}
                          />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-[#9CA3AF] shrink-0">
                          {item.data.collectes}/{item.data.attendus || 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
