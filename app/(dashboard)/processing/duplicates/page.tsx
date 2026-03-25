"use client";

import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskTable } from "@/components/processing/task-table";
import { TaskDetailModal } from "@/components/processing/task-detail-modal";
import { FilterBar } from "@/components/processing/filter-bar";
import { taskService } from "@/lib/api/services/tasks";
import { Task, TaskStatus, TaskPriority } from "@/lib/api/types";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export default function DuplicatesPage() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const response = await taskService.getTasksByType("duplicate");
        if (response.data) {
          setTasks(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        toast.error(t("errors.networkError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [t]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (status !== "all" && task.status !== status) {
        return false;
      }
      if (priority !== "all" && task.priority !== priority) {
        return false;
      }
      return true;
    });
  }, [tasks, search, status, priority]);

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleAction = async (action: "merge" | "keep" | "discard" | "complete") => {
    if (!selectedTask) return;

    try {
      await taskService.completeTask(selectedTask.id);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, status: "completed" as TaskStatus } : t
        )
      );
      toast.success(t("common.success"));
      setIsModalOpen(false);
    } catch {
      toast.error(t("errors.networkError"));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed" || t.status === "validated").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Copy className="h-6 w-6 text-warning-foreground" />
          {t("processing.duplicateDetection")}
        </h1>
        <p className="text-muted-foreground">
          {t("processing.title")} - {stats.total} {t("dashboard.totalTasks").toLowerCase()}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dashboard.totalTasks")}</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("status.pending")}</CardDescription>
            <CardTitle className="text-2xl text-warning-foreground">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("status.inProgress")}</CardDescription>
            <CardTitle className="text-2xl text-info">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("status.completed")}</CardDescription>
            <CardTitle className="text-2xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        onClear={clearFilters}
      />

      {/* Table */}
      <TaskTable
        tasks={filteredTasks}
        isLoading={isLoading}
        onViewTask={handleViewTask}
      />

      {/* Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAction={handleAction}
      />
    </div>
  );
}
