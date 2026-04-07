"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Database,
  GitBranch,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Power,
  Shield,
  Box,
  Cable,
  Building2,
  LayoutGrid,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api/client";

// Types
interface GlobalStats {
  equipes: { collectes: number; attendus: number | null; taux: number | null };
  departs: { collectes: number; attendus: number; taux: number };
  commerciaux: { collectes: number; attendus: number | null; taux: number | null };
}

interface DecoupageItem {
  exploitation: string;
  collectes: number;
  attendus: number;
  taux: number;
}

interface EquipementItem {
  nom: string;
  collectes: number;
  attendus: number;
  taux: number | null;
}

interface ErreursStats {
  manquants: Record<string, number>;
  nouveaux: Record<string, number>;
  doublons: Record<string, number>;
}

export default function CollecteDashboardPage() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [decoupage, setDecoupage] = useState<DecoupageItem[]>([]);
  const [equipements, setEquipements] = useState<EquipementItem[]>([]);
  const [erreurs, setErreurs] = useState<ErreursStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [globalRes, decoupageRes, equipRes, erreursRes] = await Promise.all([
          api.get<GlobalStats>("/kobo/dashboard/collecte/global"),
          api.get<{ decoupage: DecoupageItem[] }>("/kobo/dashboard/collecte/decoupage"),
          api.get<{ equipements: EquipementItem[] }>("/kobo/dashboard/collecte/equipements"),
          api.get<ErreursStats>("/kobo/dashboard/collecte/erreurs"),
        ]);
        setGlobalStats(globalRes);
        setDecoupage(decoupageRes.decoupage);
        setEquipements(equipRes.equipements);
        setErreurs(erreursRes);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="w-full min-w-0 space-y-6 md:px-4 md:py-4 sm:px-6">
      {/* En-tête avec gradient et filtre à droite */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Tableau de bord – Collecte terrain
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              État d’avancement de la collecte des équipements électriques
            </p>
          </div>
          {/* Filtres non fonctionnels à droite */}
          <div className="flex gap-2">
            <select className="border rounded-md px-3 py-1.5 text-sm bg-background shadow-sm">
              <option>Aujourd'hui</option>
              <option>Cette semaine</option>
              <option>Ce mois</option>
              <option>Personnalisé</option>
            </select>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Cartes KPI avec couleurs personnalisées */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          title="Équipes de collecte"
          value={globalStats?.equipes.collectes ?? 0}
          icon={Users}
          gradient="from-blue-500 to-indigo-600"
          bgGradient="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
        />
        <KpiCard
          title="Départs collectés"
          value={`${globalStats?.departs.collectes ?? 0} / ${globalStats?.departs.attendus ?? 0}`}
          taux={globalStats?.departs.taux ?? 0}
          icon={Zap}
          gradient="from-amber-500 to-orange-600"
          bgGradient="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
        />
        <KpiCard
          title="Clients commerciaux"
          value={globalStats?.commerciaux.collectes ?? 0}
          icon={Building2}
          gradient="from-emerald-500 to-teal-600"
          bgGradient="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30"
        />
      </div>

      {/* Découpage par exploitation – affiché seulement si des données existent */}
      {decoupage.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-primary" />
              Découpage par exploitation
            </CardTitle>
            <CardDescription>Départs collectés / attendus par zone ENEO</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Exploitation</TableHead>
                    <TableHead className="text-right">Collectés</TableHead>
                    <TableHead className="text-right">Attendus</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decoupage.map((item) => (
                    <TableRow key={item.exploitation} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{item.exploitation}</TableCell>
                      <TableCell className="text-right">{item.collectes}</TableCell>
                      <TableCell className="text-right">{item.attendus}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium">{item.taux}%</span>
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${item.taux}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Détail par équipement */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Détail par équipement
          </CardTitle>
          <CardDescription>Collecte / référence par type d'équipement</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipements.map((eq) => {
              const Icon = getEquipmentIcon(eq.nom);
              return (
                <div
                  key={eq.nom}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{eq.nom}</span>
                    </div>
                    {eq.taux !== null && (
                      <Badge
                        variant={eq.taux === 100 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {eq.taux}%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Collectés :</span>
                    <span className="font-semibold">{eq.collectes}</span>
                  </div>
                  {eq.attendus > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Attendus :</span>
                        <span className="font-semibold">{eq.attendus}</span>
                      </div>
                      {eq.taux !== null && (
                        <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${eq.taux}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Anomalies – sans le message de divergences */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Anomalies de collecte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <AnomalyCard title="Manquants" data={erreurs?.manquants} variant="destructive" />
            <AnomalyCard title="Nouveaux" data={erreurs?.nouveaux} variant="success" />
            <AnomalyCard title="Doublons" data={erreurs?.doublons} variant="warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Composants stylisés
function KpiCard({ title, value, taux, icon: Icon, gradient, bgGradient }: any) {
  return (
    <Card className={`group overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl ${bgGradient}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          {taux !== undefined && (
            <Badge variant={taux === 100 ? "default" : "secondary"} className="text-xs">
              {taux}% complet
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
        </div>
        {taux !== undefined && (
          <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${taux}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnomalyCard({
  title,
  data,
  variant,
}: {
  title: string;
  data?: Record<string, number>;
  variant: "destructive" | "success" | "warning";
}) {
  if (!data) return null;
  const entries = Object.entries(data).filter(([_, v]) => v > 0);
  if (entries.length === 0) return null;

  const colorClass =
    variant === "destructive"
      ? "text-destructive"
      : variant === "success"
      ? "text-emerald-600"
      : "text-amber-600";
  const iconBg =
    variant === "destructive"
      ? "bg-destructive/10"
      : variant === "success"
      ? "bg-emerald-100 dark:bg-emerald-950/30"
      : "bg-amber-100 dark:bg-amber-950/30";

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 text-sm font-medium ${colorClass}`}>
        <div className={`p-1.5 rounded-lg ${iconBg}`}>
          <AlertCircle className="h-3.5 w-3.5" />
        </div>
        {title}
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between py-1.5 text-sm border-b border-border last:border-0">
            <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
            <Badge variant="outline" className={colorClass}>
              {value}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEquipmentIcon(nom: string) {
  const map: Record<string, any> = {
    "Poste source": Building2,
    H59: Building2,
    H61: Building2,
    "Jeu de barre": LayoutGrid,
    Cellules: Box,
    Transformateur: Power,
    "Tableau BT": Shield,
    Wire: Cable,
    Support: TrendingUp,
  };
  return map[nom] || Activity;
}

function DashboardSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6 md:px-4 md:py-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="p-4 rounded-full bg-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <p className="text-muted-foreground mt-4">{message}</p>
    </div>
  );
}