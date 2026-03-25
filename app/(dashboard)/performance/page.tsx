"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Target, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"

const agentPerformance = [
  { name: "Jean Dupont", completed: 145, pending: 12, avgTime: 2.3, efficiency: 94 },
  { name: "Marie Kouna", completed: 132, pending: 8, avgTime: 2.1, efficiency: 96 },
  { name: "Paul Ndi", completed: 128, pending: 15, avgTime: 2.8, efficiency: 89 },
  { name: "Sophie Mbarga", completed: 118, pending: 22, avgTime: 3.1, efficiency: 84 },
  { name: "Eric Fotso", completed: 98, pending: 18, avgTime: 3.5, efficiency: 78 },
]

const weeklyTrend = [
  { week: "S1", duplicates: 45, differences: 32, newKobo: 28, missingEneo: 15 },
  { week: "S2", duplicates: 52, differences: 28, newKobo: 35, missingEneo: 12 },
  { week: "S3", duplicates: 38, differences: 41, newKobo: 22, missingEneo: 18 },
  { week: "S4", duplicates: 61, differences: 35, newKobo: 45, missingEneo: 8 },
]

const regionStats = [
  { region: "Centre", tasks: 234, completed: 198, rate: 84.6 },
  { region: "Littoral", tasks: 189, completed: 167, rate: 88.4 },
  { region: "Ouest", tasks: 156, completed: 142, rate: 91.0 },
  { region: "Nord", tasks: 98, completed: 76, rate: 77.6 },
  { region: "Sud", tasks: 87, completed: 81, rate: 93.1 },
]

export default function PerformancePage() {
  const { t } = useI18n()
  const [period, setPeriod] = useState("month")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("performance.title")}</h1>
          <p className="text-muted-foreground">{t("performance.subtitle")}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t("performance.thisWeek")}</SelectItem>
            <SelectItem value="month">{t("performance.thisMonth")}</SelectItem>
            <SelectItem value="quarter">{t("performance.thisQuarter")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("performance.totalProcessed")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <div className="flex items-center text-xs text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12.5% vs période précédente
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("performance.avgProcessingTime")}</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.6 jours</div>
            <div className="flex items-center text-xs text-success">
              <TrendingDown className="mr-1 h-3 w-3" />
              -0.4 jours vs période précédente
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("performance.validationRate")}</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <Progress value={87.3} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("performance.pendingTasks")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">75</div>
            <div className="flex items-center text-xs text-destructive">
              <TrendingUp className="mr-1 h-3 w-3" />
              +8 depuis hier
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("performance.weeklyTrend")}</CardTitle>
            <CardDescription>Évolution des tâches par catégorie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="duplicates" name="Doublons" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="differences" name="Écarts" stroke="hsl(var(--accent))" strokeWidth={2} />
                  <Line type="monotone" dataKey="newKobo" name="Nouveaux Kobo" stroke="hsl(var(--success))" strokeWidth={2} />
                  <Line type="monotone" dataKey="missingEneo" name="Absents ENEO" stroke="hsl(var(--warning))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("performance.byRegion")}</CardTitle>
            <CardDescription>Taux de complétion par région</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis dataKey="region" type="category" width={80} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Taux"]}
                  />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("performance.agentPerformance")}</CardTitle>
          <CardDescription>Classement des agents par productivité</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentPerformance.map((agent, index) => (
              <div
                key={agent.name}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {agent.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {agent.completed} traitées • {agent.pending} en attente
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{agent.avgTime} jours/tâche</p>
                  <Badge
                    variant={agent.efficiency >= 90 ? "default" : agent.efficiency >= 80 ? "secondary" : "destructive"}
                  >
                    {agent.efficiency}% efficacité
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
