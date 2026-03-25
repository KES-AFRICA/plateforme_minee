"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { AgentStats } from "@/components/dashboard/agent-stats";
import { TaskDistribution } from "@/components/dashboard/task-distribution";
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, trendRes, activityRes, agentRes] = await Promise.all([
          taskService.getDashboardStats(),
          taskService.getWeeklyTrend(),
          taskService.getRecentActivity(10),
          userService.getAgentStats(),
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

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("dashboard.welcome")}, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">
          {t("dashboard.overview")} - {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.pending")}
          value={isLoading ? "-" : stats?.pending.toLocaleString() || "0"}
          description={t("dashboard.todayStats")}
          icon={Clock}
          variant="warning"
          trend={{ value: 12, isPositive: false }}
        />
        <StatCard
          title={t("dashboard.inProgress")}
          value={isLoading ? "-" : stats?.inProgress.toLocaleString() || "0"}
          description={t("dashboard.todayStats")}
          icon={Loader2}
          variant="primary"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title={t("dashboard.completed")}
          value={isLoading ? "-" : stats?.completed.toLocaleString() || "0"}
          description={t("dashboard.todayStats")}
          icon={CheckCircle2}
          variant="success"
          trend={{ value: 24, isPositive: true }}
        />
        <StatCard
          title={t("dashboard.rejected")}
          value={isLoading ? "-" : stats?.rejected.toLocaleString() || "0"}
          description={t("dashboard.todayStats")}
          icon={XCircle}
          variant="destructive"
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Rate Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={t("dashboard.processingRate")}
          value={isLoading ? "-" : `${stats?.processingRate || 0}%`}
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title={t("dashboard.validationRate")}
          value={isLoading ? "-" : `${stats?.validationRate || 0}%`}
          icon={CheckCircle2}
          variant="default"
        />
        <StatCard
          title={t("dashboard.avgProcessingTime")}
          value={isLoading ? "-" : `${stats?.avgProcessingTime || 0}h`}
          icon={AlertCircle}
          variant="default"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyChart data={weeklyTrend} isLoading={isLoading} />
        {stats && <TaskDistribution stats={stats} isLoading={isLoading} />}
      </div>

      {/* Agent Stats and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AgentStats stats={agentStats} isLoading={isLoading} />
        <ActivityFeed activities={activities} isLoading={isLoading} />
      </div>
    </div>
  );
}
