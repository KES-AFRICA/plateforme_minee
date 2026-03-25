"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/context";
import { TaskStatus, TaskPriority } from "@/lib/api/types";
import { Search, X, Filter } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: TaskStatus | "all";
  onStatusChange: (value: TaskStatus | "all") => void;
  priority: TaskPriority | "all";
  onPriorityChange: (value: TaskPriority | "all") => void;
  onClear: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  onClear,
}: FilterBarProps) {
  const { t } = useI18n();

  const hasFilters = search || status !== "all" || priority !== "all";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="pending">{t("status.pending")}</SelectItem>
            <SelectItem value="in_progress">{t("status.inProgress")}</SelectItem>
            <SelectItem value="completed">{t("status.completed")}</SelectItem>
            <SelectItem value="validated">{t("status.validated")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("processing.priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="high">{t("processing.high")}</SelectItem>
            <SelectItem value="medium">{t("processing.medium")}</SelectItem>
            <SelectItem value="low">{t("processing.low")}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="h-4 w-4" />
            <span className="sr-only">{t("common.reset")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
