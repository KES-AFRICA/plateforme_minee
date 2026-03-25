"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useI18n } from "@/lib/i18n/context";
import { DashboardStats } from "@/lib/api/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { PieChartIcon } from "lucide-react";

interface TaskDistributionProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

export function TaskDistribution({ stats, isLoading }: TaskDistributionProps) {
  const { t } = useI18n();

  const data = [
    { name: t("status.pending"), value: stats.pending, color: "var(--color-warning)" },
    { name: t("status.inProgress"), value: stats.inProgress, color: "var(--color-info)" },
    { name: t("status.completed"), value: stats.completed - stats.validated, color: "var(--color-chart-1)" },
    { name: t("status.validated"), value: stats.validated, color: "var(--color-success)" },
    { name: t("status.rejected"), value: stats.rejected, color: "var(--color-destructive)" },
  ].filter(item => item.value > 0);

  const chartConfig = data.reduce((acc, item) => ({
    ...acc,
    [item.name]: { label: item.name, color: item.color },
  }), {});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            {t("dashboard.progressOverview")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          {t("dashboard.progressOverview")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="text-center mt-4">
          <p className="text-3xl font-bold">{stats.totalTasks.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.totalTasks")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
