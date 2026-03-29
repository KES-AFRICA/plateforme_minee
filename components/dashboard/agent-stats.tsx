"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentStats as AgentStatsType } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/context";
import { Users } from "lucide-react";

interface AgentStatsProps {
  stats: AgentStatsType[];
  isLoading?: boolean;
}

const roleLabels: Record<string, string> = {
  processing_agent:  "Agent traitement",
  validation_agent:  "Agent validation",
  team_lead:         "Chef d'équipe",
  admin:             "Admin",
};

export function AgentStats({ stats, isLoading }: AgentStatsProps) {
  const { t } = useI18n();

  const getInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  const getEfficiencyColor = (e: number) =>
    e >= 90 ? "text-emerald-500" : e >= 70 ? "text-amber-500" : "text-destructive";

  const getOccupancyVariant = (r: number): "default" | "secondary" | "destructive" | "outline" =>
    r >= 90 ? "destructive" : r >= 70 ? "default" : "secondary";

  const header = (
    <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
        <Users className="h-4 w-4" />
        Performance des agents
      </CardTitle>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {header}
        <CardContent className="px-4 pb-4 sm:px-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3.5 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        {header}
        <CardContent className="px-4 pb-4 sm:px-6">
          <div className="h-70 flex items-center justify-center text-muted-foreground text-sm sm:h-87.5">
            Aucune donnée pour cette période
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <CardContent className="p-0">
        {/* Hauteur réduite sur mobile */}
        <ScrollArea className="h-70 sm:h-87.5">
          <div className="space-y-3 px-4 pb-4 sm:px-6">
            {stats.map((agent) => (
              <div
                key={agent.userId}
                className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors sm:p-4"
              >
                {/* Ligne du haut : avatar + nom + badge */}
                <div className="flex items-center gap-2.5 mb-2.5 sm:gap-3 sm:mb-3">
                  <Avatar className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(agent.user.firstName, agent.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {agent.user.firstName} {agent.user.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      {roleLabels[agent.user.role] ?? agent.user.role}
                    </p>
                  </div>
                  <Badge variant={getOccupancyVariant(agent.occupancyRate)} className="text-[10px] shrink-0">
                    {agent.occupancyRate}%
                  </Badge>
                </div>

                {/* Barre de progression */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tâches complétées</span>
                    <span className="font-medium">{agent.tasksCompleted}/{agent.tasksAssigned}</span>
                  </div>
                  <Progress
                    value={(agent.tasksCompleted / Math.max(agent.tasksAssigned, 1)) * 100}
                    className="h-1.5"
                  />
                </div>

                {/* Pied : efficacité + temps */}
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/50 sm:mt-3 sm:pt-3">
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    Efficacité :{" "}
                    <span className={`font-medium ${getEfficiencyColor(agent.efficiency)}`}>
                      {agent.efficiency}%
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    Moy. :{" "}
                    <span className="font-medium">{agent.avgProcessingTime}h</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}