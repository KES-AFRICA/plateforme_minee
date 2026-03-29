"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { AgentStats } from "@/components/dashboard/agent-stats";
import { TaskDistribution } from "@/components/dashboard/task-distribution";
import { DateFilter } from "@/components/dashboard/date-filter";
import { useDateFilter, DateRangeType, DateRange } from "@/hooks/use-date-filter";
import { taskService } from "@/lib/api/services/tasks";
import { userService } from "@/lib/api/services/users";
import {
  DashboardStats,
  WeeklyTrend,
  ActivityItem,
  AgentStats as AgentStatsType,
} from "@/lib/api/types";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Loader2,
  XCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStatsType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    dateRangeType,
    dateRange,
    setDateRangeType,
    setCustomRange,
    formatDateRange,
  } = useDateFilter();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, trendRes, activityRes, agentRes] = await Promise.all([
        taskService.getDashboardStats(dateRange.start, dateRange.end),
        taskService.getWeeklyTrend(dateRange.start, dateRange.end),
        taskService.getRecentActivity(10, dateRange.start, dateRange.end),
        userService.getAgentStats(dateRange.start, dateRange.end),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (trendRes.data) setWeeklyTrend(trendRes.data);
      if (activityRes.data) setActivities(activityRes.data);
      if (agentRes.data) setAgentStats(agentRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const totalProcessed = stats?.totalTasks || 0;
  const totalCompleted = stats?.completed || 0;

  return (
    <div className="w-full min-w-0 space-y-4 md:px-4 md:py-4 sm:px-6 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">
            Bonjour, {user?.firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tableau de bord · {formatDateRange()}
          </p>
        </div>
        {/* DateFilter passe en pleine largeur sur mobile */}
        <div className="w-full sm:w-auto shrink-0">
          <DateFilter
            dateRangeType={dateRangeType}
            dateRange={dateRange}
            onRangeTypeChange={(type: DateRangeType) => setDateRangeType(type)}
            onCustomRangeChange={(range: DateRange) => setCustomRange(range)}
          />
        </div>
      </div>

      {/* ── Stat cards — statuts ──
          Mobile  : 2 colonnes
          md      : 3 colonnes
          xl      : 5 colonnes
      */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 sm:gap-4">
        <StatCard
          title="En attente"
          value={isLoading ? "-" : stats?.pending.toLocaleString() || "0"}
          description="En attente"
          icon={Clock}
          variant="default"
          total={totalProcessed}
        />
        <StatCard
          title="En cours"
          value={isLoading ? "-" : stats?.inProgress.toLocaleString() || "0"}
          description="En cours"
          icon={Loader2}
          variant="warning"
          total={totalProcessed}
        />
        {/* Sur mobile cette carte prend toute la largeur pour garder l'équilibre (2+1) */}
        <StatCard
          className="col-span-2 md:col-span-1"
          title="Traités"
          value={isLoading ? "-" : stats?.completed.toLocaleString() || "0"}
          description="Terminé"
          icon={CheckCircle2}
          variant="primary"
          total={totalProcessed}
        />
        <StatCard
          title="Validés"
          value={isLoading ? "-" : stats?.validated.toLocaleString() || "0"}
          description="Validés"
          icon={CheckCircle2}
          variant="success"
          total={totalCompleted}
        />
        <StatCard
          title="Rejetés"
          value={isLoading ? "-" : stats?.rejected.toLocaleString() || "0"}
          description="Rejetés"
          icon={XCircle}
          variant="destructive"
          total={totalCompleted}
        />
      </div>

      {/* ── Taux ──
          Mobile : 1 colonne
          sm     : 3 colonnes
      */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Taux de traitement"
          value={isLoading ? "-" : `${stats?.processingRate.toFixed(1) || 0}%`}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Taux de validation"
          value={isLoading ? "-" : `${stats?.validationRate.toFixed(1) || 0}%`}
          icon={CheckCircle2}
          variant="default"
        />
        <StatCard
          title="Temps moyen"
          value={isLoading ? "-" : `${stats?.avgProcessingTime || 0}h`}
          icon={AlertCircle}
          variant="default"
        />
      </div>

      {/* ── Charts ──
          Mobile : 1 colonne (empilé)
          lg     : 2 colonnes
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <WeeklyChart data={weeklyTrend} isLoading={isLoading} />
        {stats && <TaskDistribution stats={stats} isLoading={isLoading} />}
      </div>

      {/* ── Agents & Activités ──
          Mobile : 1 colonne (empilé)
          lg     : 2 colonnes
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <AgentStats stats={agentStats} isLoading={isLoading} />
        <ActivityFeed activities={activities} isLoading={isLoading} />
      </div>
    </div>
  );
}