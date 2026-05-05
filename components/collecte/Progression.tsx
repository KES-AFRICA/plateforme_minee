"use client";

import { useState } from "react";
import { Target, CheckCircle2, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useCollecteStats } from "@/hooks/use-collecteStats";
import type { DecoupageStats } from "@/lib/types/collecte";
import { pctCol, SpeedGauge } from "./structure";

// ─── Types ────────────────────────────────────────────────────────────────────
type DecoupageRow = {
  exploitation: string;
  taux: number;
  collectes: number;
  attendus: number;
  details: DecoupageStats;
};

function Drawer({
  isOpen,
  onClose,
  exploitation,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  exploitation: string | undefined;
  data: DecoupageRow | null;
}) {
  if (!isOpen || !data) return null;

  const getColor = (taux: number) => {
    if (taux >= 70) return "#10B981";
    if (taux >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const fill = getColor(data.taux);
  const remaining = (data.attendus ?? 0) - (data.collectes ?? 0);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-all duration-300"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{exploitation}</h2>
            <p className="text-sm text-gray-500 mt-1">Détails de la collecte</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Donut */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Collectés", value: data.taux, fill },
                      {
                        name: "Restants",
                        value: 100 - data.taux,
                        fill: "#E5E7EB",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={fill} />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-3xl font-bold text-gray-900">{data.taux}%</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Progression</p>
              <p className="text-2xl font-bold text-gray-900">{data.taux}%</p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.taux}%`, backgroundColor: fill }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">Collectés</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.collectes}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  sur {data.attendus}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">Restants</p>
                <p className="text-2xl font-bold text-amber-600">{remaining}</p>
                <p className="text-xs text-gray-500 mt-1">à collecter</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Informations complémentaires
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut</span>
                  <span className="font-semibold" style={{ color: fill }}>
                    {data.taux >= 70
                      ? "Bon avancement"
                      : data.taux >= 40
                        ? "Avancement modéré"
                        : "Retard significatif"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière mise à jour</span>
                  <span className="font-semibold text-gray-900">
                    Aujourd'hui
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ProgressRow({
  label,
  taux,
  onClick,
  collectes,
  attendus,
}: {
  label: string;
  taux: number;
  collectes: number;
  attendus: number;
  onClick: () => void;
}) {
  const color = taux >= 70 ? "#10B981" : taux >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <button
      onClick={onClick}
      className="w-full text-left group/row rounded-xl border border-gray-100 bg-white px-3 py-2.5 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate">
            {label}
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          {taux}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${taux}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[9px] text-[#9CA3AF] tabular-nums shrink-0 w-14 text-right">
          {collectes} / <strong> {attendus}</strong>
        </span>
      </div>
    </button>
  );
}

export default function CollecteAvancement() {
  const [selected, setSelected] = useState<DecoupageRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, loading } = useCollecteStats();

  const handleOpen = (row: DecoupageRow) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement des données…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const METRIC_KEYS = [
    "postes_collectes",
    "busbars",
    "bays",
    "transformers",
    "switches",
    "wires",
  ] as const satisfies ReadonlyArray<keyof typeof data.global>;

  const totalCollectes = METRIC_KEYS.reduce(
    (s, k) => s + data.global[k].collectes,
    0,
  );
  const totalAttendus = METRIC_KEYS.reduce(
    (s, k) => s + (data.global[k].attendus ?? 0),
    0,
  );
  const globalProgress =
    totalAttendus > 0 ? Math.round((totalCollectes / totalAttendus) * 100) : 0;

  const globalCol = pctCol(globalProgress);

  const decoupageRows: DecoupageRow[] = data.decoupage.map(
    (item: DecoupageStats) => {
      const collectes = METRIC_KEYS.reduce((s, k) => s + item[k].collectes, 0);
      const attendus = METRIC_KEYS.reduce(
        (s, k) => s + (item[k].attendus ?? 0),
        0,
      );
      const taux = attendus > 0 ? Math.round((collectes / attendus) * 100) : 0;
      return {
        exploitation: item.decoupage,
        taux,
        collectes,
        attendus,
        details: item,
      };
    },
  );

  return (
    <>
      <div className="flex flex-col  overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-gray-50/50 border border-gray-200/80 shadow-xl">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className=" relative overflow-hidden border-b border-gray-200/60 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-emerald-600/5" />
          <div className="relative flex items-center justify-between px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  État d'avancement de la collecte
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Target className="h-3 w-3" />
                  Pourcentages de collecte par catégorie
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <CheckCircle2 className="h-3 w-3" />
              {decoupageRows.length} découpages
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className=" flex items-center justify-center px-4 py-4 lg:py-6">
            <div className="flex flex-col items-center ">
              <SpeedGauge
                pct={globalProgress}
                color={globalCol.fill}
                width={400}
              />

              <p className="text-[9px] sm:text-[11px] text-[#9CA3AF] text-center">
                <b className="font-semibold text-[#374151]">{totalCollectes}</b>
                <span> / </span> {totalAttendus}
              </p>
            </div>
          </div>

          {/* Barres de progression — côté droit (légendes) */}
          <div className="px-4 pb-5 sm:px-5 lg:py-4 lg:max-h-[300px] lg:overflow-y-auto">
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 gap-2 ">
              {decoupageRows.map((row) => (
                <ProgressRow
                  key={row.exploitation}
                  label={row.exploitation}
                  taux={row.taux}
                  collectes={row.collectes}
                  attendus={row.attendus}
                  onClick={() => handleOpen(row)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer détail */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleClose}
        exploitation={selected?.exploitation}
        data={selected}
      />
    </>
  );
}
