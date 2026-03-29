"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityItem } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/context";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { CheckCircle, XCircle, PlusCircle, UserPlus, Activity } from "lucide-react";

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const activityIcons: Record<ActivityItem["type"], React.ReactNode> = {
  task_created:   <PlusCircle  className="h-3.5 w-3.5 text-info" />,
  task_completed: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  task_validated: <CheckCircle className="h-3.5 w-3.5 text-primary" />,
  task_rejected:  <XCircle     className="h-3.5 w-3.5 text-destructive" />,
  user_created:   <UserPlus    className="h-3.5 w-3.5 text-muted-foreground" />,
};

const activityBadgeVariants: Record<ActivityItem["type"], "default" | "secondary" | "destructive" | "outline"> = {
  task_created:   "outline",
  task_completed: "secondary",
  task_validated: "default",
  task_rejected:  "destructive",
  user_created:   "outline",
};

const activityLabels: Record<ActivityItem["type"], string> = {
  task_created:   "Création",
  task_completed: "Complété",
  task_validated: "Validé",
  task_rejected:  "Rejeté",
  user_created:   "Utilisateur",
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const { t, language } = useI18n();

  const formatDate = (dateString: string) =>
    formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === "fr" ? fr : enUS,
    });

  const getInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  const header = (
    <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
        <Activity className="h-4 w-4" />
        Activités récentes
      </CardTitle>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {header}
        <CardContent className="px-4 pb-4 sm:px-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3.5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        {header}
        <CardContent className="px-4 pb-4 sm:px-6">
          <div className="h-70 flex items-center justify-center text-muted-foreground text-sm sm:h-87.5">
            Aucune activité pour cette période
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <CardContent className="p-0">
        <ScrollArea className="h-70 sm:h-87.5">
          <div className="space-y-1 px-4 pb-4 sm:px-6">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors sm:gap-3 sm:p-3"
              >
                {/* Avatar ou icône */}
                {activity.user ? (
                  <Avatar className="h-7 w-7 shrink-0 sm:h-8 sm:w-8">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(activity.user.firstName, activity.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted shrink-0 sm:h-8 sm:w-8">
                    {activityIcons[activity.type]}
                  </div>
                )}

                {/* Contenu — min-w-0 essentiel pour que truncate fonctionne */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium truncate sm:text-sm">
                      {activity.user
                        ? `${activity.user.firstName} ${activity.user.lastName}`
                        : "Système"}
                    </p>
                    <Badge
                      variant={activityBadgeVariants[activity.type]}
                      className="text-[9px] h-4 px-1.5 sm:text-[10px] sm:h-5"
                    >
                      {activityLabels[activity.type]}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate sm:text-sm">
                    {activity.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 sm:text-xs sm:mt-1">
                    {formatDate(activity.timestamp)}
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