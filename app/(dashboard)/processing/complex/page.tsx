"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskTable } from "@/components/processing/task-table";
import { FilterBar } from "@/components/processing/filter-bar";
import { RegionalStats } from "@/components/processing/regional-stats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTasks } from "@/lib/api/mock-data";
import { Task, TaskStatus, TaskPriority } from "@/lib/api/types";

export default function ComplexCasesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [isLoading, setIsLoading] = useState(false);

  // Filter tasks based on criteria
  const filteredTasks = mockTasks.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description?.toLowerCase() ?? "").includes(search.toLowerCase());

    const matchStatus = status === "all" || task.status === status;
    const matchPriority = priority === "all" || task.priority === priority;

    return matchSearch && matchStatus && matchPriority;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
  };

  // Handle view task
  const handleViewTask = (task: Task) => {
    console.log("Selected task:", task);
  };

  // Handle assign task
  const handleAssignTask = (task: Task) => {
    console.log("Assign task:", task);
  };

  // Handle process task
  const handleProcessTask = (task: Task) => {
    console.log("Process task:", task);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cas Complexes</h1>
        <p className="text-muted-foreground mt-1">
          Cas nécessitant une expertise particulière et une validation approfondie
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">248</div>
            <p className="text-xs text-muted-foreground mt-1">cas identifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">52</div>
            <p className="text-xs text-muted-foreground mt-1">prêts à traiter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">35</div>
            <p className="text-xs text-muted-foreground mt-1">en traitement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Complétés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">161</div>
            <p className="text-xs text-muted-foreground mt-1">65%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList>
          <TabsTrigger value="stats">Statistiques Régionales</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
        </TabsList>

        {/* Regional Stats */}
        <TabsContent value="stats" className="space-y-4">
          <RegionalStats />
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Cas Complexes</CardTitle>
              <CardDescription>
                Filtrez et gérez les cas nécessitant expertise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
                priority={priority}
                onPriorityChange={setPriority}
                onClear={clearFilters}
              />
              <TaskTable
                tasks={filteredTasks}
                isLoading={isLoading}
                onViewTask={handleViewTask}
                onAssignTask={handleAssignTask}
                onProcessTask={handleProcessTask}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}