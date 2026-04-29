import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useCollecteStats } from "@/hooks/use-collecteStats";
import type { DecoupageStats } from "@/lib/types/collecte";

// Composant Drawer
const Drawer = ({ isOpen, onClose, exploitation, data }: any) => {
  if (!isOpen) return null;

  // Calculer la couleur basée sur le taux
  const getColor = (taux: number | null) => {
    if (taux === null)
      return { fill: "#9CA3AF", gradient: "from-gray-500 to-gray-400" };
    if (taux >= 70)
      return { fill: "#10B981", gradient: "from-emerald-500 to-teal-500" };
    if (taux >= 40)
      return { fill: "#F59E0B", gradient: "from-amber-500 to-orange-500" };
    return { fill: "#EF4444", gradient: "from-red-500 to-rose-500" };
  };

  const colorInfo = getColor(data?.taux);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-all duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto">
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
          {/* Mini camembert dans le drawer */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Collectés",
                        value: data?.taux || 0,
                        color: colorInfo.fill,
                      },
                      {
                        name: "Restants",
                        value: 100 - (data?.taux || 0),
                        color: "#E5E7EB",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={colorInfo.fill} />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    {data?.taux || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Progression</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.taux || 0}%
              </p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data?.taux || 0}%`,
                    backgroundColor: colorInfo.fill,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">Collectés</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data?.collectes || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  sur {data?.attendus || 0}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">Restants</p>
                <p className="text-2xl font-bold text-amber-600">
                  {(data?.attendus || 0) - (data?.collectes || 0)}
                </p>
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
                  <span
                    className="font-semibold"
                    style={{ color: colorInfo.fill }}
                  >
                    {data?.taux >= 70
                      ? "Bon avancement"
                      : data?.taux >= 40
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
};

// Mini camembert component
const MiniDonut = ({
  taux,
  size = 60,
}: {
  taux: number | null;
  size?: number;
}) => {
  const getColor = (taux: number | null) => {
    if (taux === null) return "#9CA3AF";
    if (taux >= 70) return "#10B981";
    if (taux >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const color = getColor(taux);
  const value = taux || 0;
  const remaining = 100 - value;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { name: "completed", value: value, color },
              { name: "remaining", value: remaining, color: "#E5E7EB" },
            ]}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.35}
            outerRadius={size * 0.45}
            startAngle={90}
            endAngle={450}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#E5E7EB" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
};

export default function CollecteAvancement() {
  const [selectedExploitation, setSelectedExploitation] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { data, loading, refresh } = useCollecteStats();

  const handleCardClick = (exploitation: any) => {
    setSelectedExploitation(exploitation);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedExploitation(null), 300);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données de collecte...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Calcul des métriques globales
  const global = data.global;
  const totalCollectes =
    global.postes_collectes.collectes +
    global.feeders.collectes +
    global.wires.collectes;
  const totalAttendus =
    (global.postes_collectes.attendus || 0) +
    (global.feeders.attendus || 0) +
    (global.wires.attendus || 0);
  const globalProgress =
    totalAttendus > 0 ? (totalCollectes / totalAttendus) * 100 : 0;

  // Données pour le pie chart global
  const pieData = [
    { name: "Collectés", value: globalProgress, color: "#10B981" },
    {
      name: "En cours",
      value: Math.min(100 - globalProgress, 100),
      color: "#3B82F6",
    },
    { name: "Restants", value: 100 - globalProgress, color: "#E5E7EB" },
  ].filter((item) => item.value > 0);

  // Préparer les données pour les mini camemberts par découpage
  const decoupageData = data.decoupage.map((item: DecoupageStats) => ({
    exploitation: item.decoupage,
    taux: item.postes_collectes.taux || 0,
    collectes: item.postes_collectes.collectes,
    attendus: item.postes_collectes.attendus || 0,
    details: item,
  }));

  return (
    <>
      <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-gray-50/50 border border-gray-200/80 shadow-xl hover:shadow-2xl transition-all duration-500">
        {/* Header avec effet glassmorphism */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-emerald-600/5" />
          <div className="relative flex items-center justify-between border-b border-gray-200/60 px-6 py-5 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-base font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  État d'avancement de la collecte
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Target className="h-3 w-3" />
                  Pourcentages de collecte par catégorie
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Section Vue globale avec grand camembert à gauche */}
          <div className="p-6 bg-gradient-to-br from-gray-50/50 to-white border-b border-gray-200/60 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                VUE GLOBALE
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              {/* Grand Pie Chart */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-900">
                      {globalProgress.toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">global</p>
                  </div>
                </div>
                <ResponsiveContainer width={300} height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={130}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl p-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {payload[0].name}
                              </p>
                              <p
                                className="text-2xl font-bold"
                                style={{ color: payload[0].payload.color }}
                              >
                                {(payload[0].value as number)?.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Légende améliorée */}
              <div className="flex flex-wrap justify-center gap-5">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    className="group/legend flex items-center gap-2.5 rounded-full bg-white/80 px-3 py-1.5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full transition-all duration-300 group-hover/legend:scale-110"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700">
                        {item.name}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: item.color }}
                      >
                        {item.value.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section Par exploitation avec mini camemberts */}
          <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                PAR DÉCOUPAGE
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CheckCircle2 className="h-3 w-3" />
                {decoupageData.length} découpages
              </div>
            </div>

            {/* Grille de mini cartes avec mini camemberts */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {decoupageData.map((d, idx) => {
                const getColorClass = (taux: number) => {
                  if (taux >= 70) return "from-emerald-500 to-teal-500";
                  if (taux >= 40) return "from-amber-500 to-orange-500";
                  return "from-red-500 to-rose-500";
                };

                return (
                  <div
                    key={d.exploitation}
                    onClick={() => handleCardClick(d)}
                    className="group/card relative cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="rounded-xl bg-white p-4 transition-all duration-300 border border-gray-100/80 hover:border-gray-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  d.taux >= 70
                                    ? "#10B981"
                                    : d.taux >= 40
                                      ? "#F59E0B"
                                      : "#EF4444",
                              }}
                            />
                            <span className="text-sm font-semibold text-gray-800 line-clamp-1">
                              {d.exploitation}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Collectés</span>
                              <span className="font-medium text-gray-700">
                                {d.collectes}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Objectif</span>
                              <span className="font-medium text-gray-700">
                                {d.attendus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mini camembert */}
                        <div className="ml-3">
                          <MiniDonut taux={d.taux} size={70} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        exploitation={selectedExploitation?.exploitation}
        data={selectedExploitation}
      />
    </>
  );
}

// Ajoutez ces styles CSS dans votre fichier global CSS
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
