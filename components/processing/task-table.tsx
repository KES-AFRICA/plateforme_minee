"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, TaskStatus, TaskPriority } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/context";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  MoreHorizontal,
  Eye,
  UserPlus,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
} from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  isLoading?: boolean;
  onViewTask?: (task: Task) => void;
  onAssignTask?: (task: Task) => void;
  onProcessTask?: (task: Task) => void;
  selectedTasks?: string[];
  onSelectTask?: (taskId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
}

const statusVariants: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "default",
  validated: "default",
  rejected: "destructive",
};

const statusColors: Record<TaskStatus, string> = {
  pending: "bg-warning/10 text-warning-foreground border-warning/30",
  in_progress: "bg-info/10 text-info border-info/30",
  completed: "bg-success/10 text-success border-success/30",
  validated: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  high: <ArrowUpCircle className="h-4 w-4 text-destructive" />,
  medium: <ArrowRightCircle className="h-4 w-4 text-warning-foreground" />,
  low: <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />,
};

export function TaskTable({
  tasks,
  isLoading,
  onViewTask,
  onAssignTask,
  onProcessTask,
  selectedTasks = [],
  onSelectTask,
  onSelectAll,
}: TaskTableProps) {
  const { t, language } = useI18n();

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", {
      locale: language === "fr" ? fr : enUS,
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const someSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>{t("processing.priority")}</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("processing.assignTo")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectTask && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  // @ts-expect-error indeterminate is valid
                  indeterminate={someSelected}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="w-12">{t("processing.priority")}</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead>{t("processing.assignTo")}</TableHead>
            <TableHead>{t("common.date")}</TableHead>
            <TableHead className="w-12">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {t("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-muted/50">
                {onSelectTask && (
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={(checked) => onSelectTask(task.id, checked === true)}
                    />
                  </TableCell>
                )}
                <TableCell>{priorityIcons[task.priority]}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[250px]">{task.title}</span>
                    {task.description && (
                      <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {task.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[task.status]}>
                    {t(`status.${task.status.replace("_", "")}` as Parameters<typeof t>[0])}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.assignedToUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(
                            task.assignedToUser.firstName,
                            task.assignedToUser.lastName
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[100px]">
                        {task.assignedToUser.firstName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("status.unassigned")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(task.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t("common.actions")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onViewTask?.(task)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t("common.view")}
                      </DropdownMenuItem>
                      {!task.assignedTo && (
                        <DropdownMenuItem onClick={() => onAssignTask?.(task)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          {t("processing.assignTo")}
                        </DropdownMenuItem>
                      )}
                      {task.status !== "completed" && task.status !== "validated" && (
                        <DropdownMenuItem onClick={() => onProcessTask?.(task)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {t("processing.processTask")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
