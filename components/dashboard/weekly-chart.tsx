"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useI18n } from "@/lib/i18n/context";
import { WeeklyTrend } from "@/lib/api/types";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface WeeklyChartProps {
  data: WeeklyTrend[];
  isLoading?: boolean;
}

const chartConfig = {
  completed: { label: "Traités",  color: "var(--color-chart-1)" },
  validated: { label: "Validés",  color: "var(--color-chart-2)" },
  rejected:  { label: "Rejetés", color: "var(--color-destructive)" },
};

export function WeeklyChart({ data, isLoading }: WeeklyChartProps) {
  const { t, language } = useI18n();

  const formatDate = (dateString: string) =>
    format(new Date(dateString), "dd/MM", { locale: language === "fr" ? fr : enUS });

  const formattedData = data.map((item) => ({ ...item, name: formatDate(item.date) }));

  const skeleton = (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <TrendingUp className="h-4 w-4" />
          {t("dashboard.weeklyTrend")}
        </CardTitle>
        <CardDescription>Chargement...</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6">
        <div className="h-50 animate-pulse bg-muted rounded sm:h-75" />
      </CardContent>
    </Card>
  );

  if (isLoading) return skeleton;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4" />
            {t("dashboard.weeklyTrend")}
          </CardTitle>
          <CardDescription>Aucune donnée pour la période</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6">
          <div className="h-50 flex items-center justify-center text-muted-foreground text-sm sm:h-75">
            Aucune activité sur cette période
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCompleted = data.reduce((acc, i) => acc + i.completed, 0);
  const totalValidated = data.reduce((acc, i) => acc + i.validated, 0);
  const validationRate = totalCompleted > 0
    ? Math.round((totalValidated / totalCompleted) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <TrendingUp className="h-4 w-4" />
          {t("dashboard.weeklyTrend")}
        </CardTitle>
        <CardDescription>Taux de validation : {validationRate}%</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6">
        {/* Hauteur réduite sur mobile pour éviter le scroll inutile */}
        <ChartContainer config={chartConfig} className="h-50 w-full sm:h-75">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorValidated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={32}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Traités"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fill="url(#colorCompleted)"
              />
              <Area
                type="monotone"
                dataKey="validated"
                name="Validés"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                fill="url(#colorValidated)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}