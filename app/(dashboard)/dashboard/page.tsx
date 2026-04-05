"use client";

// ─── Imports identiques à l'original ─────────────────────────────────────────
// Aucun import supplémentaire n'a été ajouté. Aucun import n'a été retiré.
// Le dark mode est géré par Tailwind via la classe `dark` sur <html>,
// exactement comme dans le reste de l'application.
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import { useDateFilter, DateRangeType, DateRange } from "@/hooks/use-date-filter";
import { dashboardStatsService, FeederStats, EquipmentTypeStats } from "@/lib/api/services/dashboardStatsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateFilter } from "@/components/dashboard/date-filter";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Zap,
  Building2,
  Cable,
  Box,
  ToggleLeft,
  Layers,
  TreePine,
  Network,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Copy,
  GitCompare,
  FilePlus,
  FileX,
  HardDrive,
  Clock,
} from "lucide-react";

// ─── Maps identiques à l'original ────────────────────────────────────────────
// Conservées telles quelles : le reste de la page les consomme.
const typeIcons: Record<string, any> = {
  substation: Building2,
  powertransformer: Zap,
  busbar: Layers,
  bay: Box,
  switch: ToggleLeft,
  wire: Cable,
  pole: TreePine,
  node: Network,
};

const anomalyIcons = {
  duplicate: Copy,
  divergence: GitCompare,
  new: FilePlus,
  missing: FileX,
  complex: AlertCircle,
};

// ─── Palette de couleurs par type d'équipement ────────────────────────────────
// Couleurs stables pour Recharts (qui ne lit pas les classes Tailwind).
// Chaque type reçoit une couleur sémantique cohérente entre light et dark.
const equipColors: Record<string, string> = {
  substation:       "#3b82f6", // blue-500
  powertransformer: "#8b5cf6", // violet-500
  busbar:           "#f59e0b", // amber-500
  bay:              "#10b981", // emerald-500
  switch:           "#ef4444", // red-500
  wire:             "#6b7280", // gray-500
  pole:             "#d97706", // amber-600
  node:             "#6366f1", // indigo-500
};

// ─── Badge — remplace le composant inline de l'original ──────────────────────
// Même API que dans le fichier source. On enrichit juste le rendu visuel
// tout en restant 100 % Tailwind pour que le dark mode fonctionne.
function Badge({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums tracking-wide transition-colors";

  const variants: Record<string, string> = {
    // Vert : progress 100 %
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    // Ambre : en cours
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    // Rouge : critique
    destructive:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    // Neutre
    secondary:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span className={`${base} ${variants[variant ?? "secondary"]} ${className ?? ""}`}>
      {children}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
// Structure identique à l'original :
//   • même wrapper racine (w-full min-w-0 space-y-8 px-4 py-4 sm:px-6)
//   • même découpage en sections : header / 3 KPI / 2 taux / 5 anomalies /
//     graphiques / tabs (départs + équipements)
//   • même état local, même effet, même chargement de données
//   • dark mode via classes `dark:` Tailwind — aucune injection de style
export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { dateRangeType, dateRange, setDateRangeType, setCustomRange, formatDateRange } =
    useDateFilter();

  const [globalStats,    setGlobalStats]    = useState<any>(null);
  const [feeders,        setFeeders]        = useState<FeederStats[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeStats[]>([]);
  const [dailyProgress,  setDailyProgress]  = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentTypeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement identique à l'original — aucune logique métier modifiée
  const loadData = async (start: Date, end: Date) => {
    setIsLoading(true);
    try {
      setGlobalStats(dashboardStatsService.getGlobalStats());
      setFeeders(dashboardStatsService.getFeedersStats());
      setEquipmentTypes(dashboardStatsService.getEquipmentTypeStats());
      setDailyProgress(dashboardStatsService.getDailyProgress(start, end));
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateRange.start, dateRange.end);
  }, [dateRange]);

  // ── Loading state ────────────────────────────────────────────────────────
  // Même condition que l'original, design rafraîchi
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
        </div>
      </div>
    );
  }

  // ── Données donut ────────────────────────────────────────────────────────
  // Même logique de filtrage que l'original, couleurs centralisées
  const equipmentCollectedData = equipmentTypes
    .filter((type) => type.collected > 0)
    .map((type) => ({
      name:  type.label,
      value: type.collected,
      color: equipColors[type.type] ?? "#6b7280",
    }));

  // ────────────────────────────────────────────────────────────────────────
  // RENDER — structure 1:1 avec l'original
  // Seules les classes Tailwind changent pour le nouveau design.
  // L'arbre JSX (sections, niveaux d'imbrication, composants UI) est conservé.
  // ────────────────────────────────────────────────────────────────────────
  return (
    // Wrapper racine identique à l'original
    <div className="w-full min-w-0 space-y-8 px-4 py-4 sm:px-6">

      {/* ── En-tête avec filtre de date ─────────────────────────────────────
          Structure originale conservée : flex col → row sur sm,
          DateFilter aligné à droite. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bienvenue,{" "}
            <span className="font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </span>{" "}
            · {formatDateRange()}
          </p>
        </div>
        <div className="w-full sm:w-auto shrink-0">
          <DateFilter
            dateRangeType={dateRangeType}
            dateRange={dateRange}
            onRangeTypeChange={(type: DateRangeType) => setDateRangeType(type)}
            onCustomRangeChange={(range: DateRange) => setCustomRange(range)}
          />
        </div>
      </div>

      {/* ── 3 cartes KPI principales ────────────────────────────────────────
          Grille 1→3 colonnes identique. Chaque Card est un composant UI
          du projet. Le fond dégradé passe en dark via dark: variants. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Attendus */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-gradient-to-br from-blue-50 to-blue-100/60
                         dark:from-blue-950/40 dark:to-blue-900/20
                         dark:border dark:border-blue-900/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest
                               text-blue-600 dark:text-blue-400">
                  Équipements attendus
                </p>
                <p className="text-3xl font-bold tabular-nums
                               text-blue-900 dark:text-blue-100">
                  {globalStats?.totalExpected.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-blue-500/70 dark:text-blue-400/50">
                  Données de référence
                </p>
              </div>
              {/* Icône dans un cercle teinté */}
              <div className="rounded-xl p-2.5
                              bg-blue-500/10 dark:bg-blue-400/10">
                <HardDrive className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collectés */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-gradient-to-br from-emerald-50 to-emerald-100/60
                         dark:from-emerald-950/40 dark:to-emerald-900/20
                         dark:border dark:border-emerald-900/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest
                               text-emerald-600 dark:text-emerald-400">
                  Collectés
                </p>
                <p className="text-3xl font-bold tabular-nums
                               text-emerald-900 dark:text-emerald-100">
                  {globalStats?.totalCollected.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-emerald-500/70 dark:text-emerald-400/50">
                  Données du terrain
                </p>
              </div>
              <div className="rounded-xl p-2.5
                              bg-emerald-500/10 dark:bg-emerald-400/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manquants */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-gradient-to-br from-orange-50 to-orange-100/60
                         dark:from-orange-950/40 dark:to-orange-900/20
                         dark:border dark:border-orange-900/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest
                               text-orange-600 dark:text-orange-400">
                  Manquants
                </p>
                <p className="text-3xl font-bold tabular-nums
                               text-orange-900 dark:text-orange-100">
                  {globalStats?.totalRemaining.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-orange-500/70 dark:text-orange-400/50">
                  Pas encore collectés
                </p>
              </div>
              <div className="rounded-xl p-2.5
                              bg-orange-500/10 dark:bg-orange-400/10">
                <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2 cartes taux ────────────────────────────────────────────────────
          Grille 1→2 colonnes identique à l'original. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Taux de collecte */}
        <Card className="border border-border/50 shadow-sm
                         bg-card dark:bg-card/60">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Taux de collecte
                </p>
                <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {globalStats?.processingRate.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/50">
                <TrendingUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            {/* Composant Progress du projet — inchangé */}
            <Progress
              value={globalStats?.processingRate ?? 0}
              className="h-1.5 bg-blue-100 dark:bg-blue-950/60 [&>div]:bg-blue-500 dark:[&>div]:bg-blue-400"
            />
          </CardContent>
        </Card>

        {/* Taux de validation */}
        <Card className="border border-border/50 shadow-sm
                         bg-card dark:bg-card/60">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Taux de validation
                </p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {globalStats?.validationRate.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <Progress
              value={globalStats?.validationRate ?? 0}
              className="h-1.5 bg-emerald-100 dark:bg-emerald-950/60 [&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── 5 indicateurs d'anomalies ────────────────────────────────────────
          Grille 2→3→5 colonnes identique à l'original.
          Fond inline style conservé mais enrichi des dark variants. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">

        {/* Doublons */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-violet-50 dark:bg-violet-950/30
                         dark:border dark:border-violet-900/30">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="rounded-lg p-1.5 bg-violet-100 dark:bg-violet-900/40">
                <Copy className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider
                               text-violet-600 dark:text-violet-400">
                Doublons
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-violet-800 dark:text-violet-200">
              {globalStats?.anomalies.duplicate ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* Divergences */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-amber-50 dark:bg-amber-950/30
                         dark:border dark:border-amber-900/30">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="rounded-lg p-1.5 bg-amber-100 dark:bg-amber-900/40">
                <GitCompare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider
                               text-amber-600 dark:text-amber-400">
                Divergences
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">
              {globalStats?.anomalies.divergence ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* Nouveaux */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-emerald-50 dark:bg-emerald-950/30
                         dark:border dark:border-emerald-900/30">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="rounded-lg p-1.5 bg-emerald-100 dark:bg-emerald-900/40">
                <FilePlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider
                               text-emerald-600 dark:text-emerald-400">
                Nouveaux
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
              {globalStats?.anomalies.new ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* Manquants anomalies */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-orange-50 dark:bg-orange-950/30
                         dark:border dark:border-orange-900/30">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="rounded-lg p-1.5 bg-orange-100 dark:bg-orange-900/40">
                <FileX className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider
                               text-orange-600 dark:text-orange-400">
                Manquants
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-200">
              {globalStats?.anomalies.missing ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* Complexes */}
        <Card className="border-0 shadow-sm overflow-hidden
                         bg-red-50 dark:bg-red-950/30
                         dark:border dark:border-red-900/30">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="rounded-lg p-1.5 bg-red-100 dark:bg-red-900/40">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider
                               text-red-600 dark:text-red-400">
                Complexes
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-800 dark:text-red-200">
              {globalStats?.anomalies.complex ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Graphiques ───────────────────────────────────────────────────────
          Grille 3+2 colonnes identique à l'original (lg:grid-cols-5). */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Évolution quotidienne — prend 3/5 */}
        <div className="lg:col-span-3">
          <Card className="h-full border border-border/50 shadow-sm bg-card">
            <CardHeader className="pb-0 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Évolution quotidienne des collectes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyProgress} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                    }}
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    stroke="#3b82f6"
                    name="Collectés"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="anomalies"
                    stroke="#f59e0b"
                    name="Anomalies"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Donut — prend 2/5 */}
        <div className="lg:col-span-2">
          <Card className="h-full border border-border/50 shadow-sm bg-card">
            <CardHeader className="pb-0 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Équipements collectés par type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={equipmentCollectedData}
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={({ percent }) =>
                      percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                    }
                    style={{ fontSize: 10 }}
                  >
                    {equipmentCollectedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: any, name: any) => [
                      value.toLocaleString(),
                      name,
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Tabs : départs + équipements ─────────────────────────────────────
          Composant Tabs du projet, structure identique à l'original.
          Seul le design des cartes internes change. */}
      <Tabs defaultValue="feeders" className="space-y-4">
        <TabsList className="bg-muted/50 dark:bg-muted/30 p-1 rounded-lg">
          <TabsTrigger
            value="feeders"
            className="text-sm rounded-md data-[state=active]:bg-background
                       data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Par départ
          </TabsTrigger>
          <TabsTrigger
            value="equipment"
            className="text-sm rounded-md data-[state=active]:bg-background
                       data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Par type d'équipement
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet départs ────────────────────────────────────────────── */}
        <TabsContent value="feeders" className="space-y-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {feeders.map((feeder) => {
              // Calcul du progress : identique à l'original
              const progress = feeder.expected
                ? Math.round((feeder.collected / feeder.expected) * 100)
                : 0;

              const badgeVariant =
                progress === 100 ? "success"
                : progress >= 60  ? "secondary"
                : "warning";

              return (
                <Card
                  key={feeder.id}
                  className="overflow-hidden border border-border/50 shadow-sm
                             bg-card hover:border-border hover:shadow-md
                             transition-all duration-200"
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                          {feeder.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {feeder.code}
                        </p>
                      </div>
                      <Badge variant={badgeVariant}>{progress}%</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 px-4 pb-4">
                    {/* Métriques attendus / collectés / restants */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Attendus
                        </p>
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          {feeder.expected.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Collectés
                        </p>
                        <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {feeder.collected.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Restants
                        </p>
                        <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {feeder.remaining.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar du projet */}
                    <Progress value={progress} className="h-1.5" />

                    {/* Chips anomalies — même logique que l'original */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Object.entries(feeder.anomalies).map(([type, count]) => {
                        if (count === 0) return null;
                        const Icon = anomalyIcons[type as keyof typeof anomalyIcons];
                        return (
                          <div
                            key={type}
                            className="flex items-center gap-1 text-[10px]
                                       bg-muted/60 dark:bg-muted/30
                                       px-2 py-1 rounded-full
                                       text-muted-foreground"
                          >
                            {Icon && <Icon className="h-2.5 w-2.5" />}
                            <span>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Onglet équipements ────────────────────────────────────────── */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {equipmentTypes.map((type) => {
              const Icon     = typeIcons[type.type] ?? HardDrive;
              const progress = type.expected
                ? Math.round((type.collected / type.expected) * 100)
                : 0;
              const color    = equipColors[type.type] ?? "#6b7280";

              return (
                <Card
                  key={type.type}
                  className="border border-border/50 shadow-sm bg-card
                             hover:border-border hover:shadow-md hover:-translate-y-px
                             transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedEquipment(type)}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center gap-2.5">
                      {/* Icône colorée par type */}
                      <div
                        className="rounded-lg p-1.5 flex-shrink-0"
                        style={{ background: `${color}18` }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color }}
                          strokeWidth={1.5}
                        />
                      </div>
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {type.label}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 px-4 pb-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Attendus : <span className="font-semibold text-foreground">{type.expected.toLocaleString()}</span></span>
                      <span>Collectés : <span className="font-semibold" style={{ color }}>{type.collected.toLocaleString()}</span></span>
                    </div>

                    <Progress
                      value={progress}
                      className="h-1.5"
                      // Note : la couleur de la barre suit le type via style inline
                      // si ton composant Progress l'accepte, sinon laisser la couleur primaire
                    />

                    {/* Chips anomalies */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Object.entries(type.anomalies).map(([anomType, count]) => {
                        if (count === 0) return null;
                        const AnomIcon = anomalyIcons[anomType as keyof typeof anomalyIcons];
                        return (
                          <div
                            key={anomType}
                            className="flex items-center gap-1 text-[10px]
                                       bg-muted/60 dark:bg-muted/30
                                       px-2 py-1 rounded-full
                                       text-muted-foreground"
                          >
                            {AnomIcon && <AnomIcon className="h-2.5 w-2.5" />}
                            <span>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Panneau de détail — conditionnel, identique à l'original */}
          {selectedEquipment && (
            <Card className="border border-border shadow-sm bg-card
                             border-l-4 dark:border-l-4 mt-2"
                  style={{ borderLeftColor: equipColors[selectedEquipment.type] ?? "#6b7280" }}>
              <CardHeader className="pt-4 px-5 pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {/* Icône du type sélectionné */}
                    {(() => {
                      const Icon  = typeIcons[selectedEquipment.type] ?? HardDrive;
                      const color = equipColors[selectedEquipment.type] ?? "#6b7280";
                      return (
                        <div className="rounded-lg p-1.5" style={{ background: `${color}18` }}>
                          <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
                        </div>
                      );
                    })()}
                    <span className="font-semibold">Détails — {selectedEquipment.label}</span>
                  </span>
                  <button
                    onClick={() => setSelectedEquipment(null)}
                    className="text-xs text-muted-foreground hover:text-foreground
                               transition-colors px-2 py-1 rounded-md
                               hover:bg-muted/50"
                  >
                    Fermer ✕
                  </button>
                </CardTitle>
              </CardHeader>

              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Synthèse */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Synthèse
                    </p>
                    {[
                      { label: "Attendus",         value: selectedEquipment.expected.toLocaleString(),  color: "text-foreground" },
                      { label: "Collectés",         value: selectedEquipment.collected.toLocaleString(), color: "text-emerald-600 dark:text-emerald-400" },
                      { label: "Taux de collecte",  value: `${selectedEquipment.expected ? ((selectedEquipment.collected / selectedEquipment.expected) * 100).toFixed(1) : 0}%`, color: "text-foreground" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
                      </div>
                    ))}
                    <Progress
                      value={
                        selectedEquipment.expected
                          ? (selectedEquipment.collected / selectedEquipment.expected) * 100
                          : 0
                      }
                      className="h-1.5 mt-1"
                    />
                  </div>

                  {/* Anomalies */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                      Anomalies détectées
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedEquipment.anomalies).map(([type, count]) => {
                        if (count === 0) return null;
                        const Icon = anomalyIcons[type as keyof typeof anomalyIcons];
                        const cfg  = {
                          duplicate:  { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
                          divergence: { color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30"   },
                          new:        { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                          missing:    { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
                          complex:    { color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-950/30"       },
                        }[type as keyof typeof anomalyIcons] ?? { color: "text-muted-foreground", bg: "bg-muted/40" };

                        return (
                          <div
                            key={type}
                            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${cfg.bg}`}
                          >
                            {Icon && <Icon className={`h-3 w-3 flex-shrink-0 ${cfg.color}`} />}
                            <span className="capitalize text-muted-foreground">{type}</span>
                            <span className={`ml-auto font-semibold tabular-nums ${cfg.color}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div> // fin du wrapper racine — identique à l'original
  );
}