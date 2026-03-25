"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Task } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/context";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Copy,
  GitCompare,
  CheckCircle,
  XCircle,
  Merge,
  Trash2,
  Save,
  ArrowRight,
} from "lucide-react";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: "merge" | "keep" | "discard" | "complete") => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning-foreground border-warning/30",
  in_progress: "bg-info/10 text-info border-info/30",
  completed: "bg-success/10 text-success border-success/30",
  validated: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onAction,
}: TaskDetailModalProps) {
  const { t, language } = useI18n();

  if (!task) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy HH:mm", {
      locale: language === "fr" ? fr : enUS,
    });
  };

  const renderDataComparison = () => {
    if (task.type === "duplicate" && task.sourceData && task.targetData) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Copy className="h-4 w-4 text-warning-foreground" />
            <h4 className="font-medium">{t("processing.duplicateDetection")}</h4>
            {task.similarity && (
              <Badge variant="outline">
                {t("processing.similarity")}: {task.similarity}%
              </Badge>
            )}
          </div>
          
          {task.similarity && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("processing.confidence")}</span>
                <span>{task.confidence}%</span>
              </div>
              <Progress value={task.confidence} className="h-2" />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h5 className="text-sm font-medium text-muted-foreground mb-3">
                {t("processing.source")}
              </h5>
              <DataDisplay data={task.sourceData} />
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h5 className="text-sm font-medium text-muted-foreground mb-3">
                {t("processing.target")}
              </h5>
              <DataDisplay data={task.targetData} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onAction?.("merge")} className="gap-2">
              <Merge className="h-4 w-4" />
              {t("processing.merge")}
            </Button>
            <Button variant="secondary" onClick={() => onAction?.("keep")} className="gap-2">
              <Save className="h-4 w-4" />
              {t("processing.keep")}
            </Button>
            <Button variant="destructive" onClick={() => onAction?.("discard")} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {t("processing.discard")}
            </Button>
          </div>
        </div>
      );
    }

    if (task.type === "difference" && task.sourceData && task.targetData) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <GitCompare className="h-4 w-4 text-info" />
            <h4 className="font-medium">{t("processing.differenceDetection")}</h4>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                Kobo
              </h5>
              <DataDisplay data={task.sourceData} />
            </div>
            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <h5 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-3">
                Eneo
              </h5>
              <DataDisplay data={task.targetData} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onAction?.("complete")} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {t("processing.markAsProcessed")}
            </Button>
          </div>
        </div>
      );
    }

    // For new_kobo or missing_eneo
    const data = task.sourceData || task.targetData || task.data;
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 border">
          <h5 className="text-sm font-medium text-muted-foreground mb-3">
            {t("common.data")}
          </h5>
          <DataDisplay data={data} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onAction?.("complete")} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {t("processing.markAsProcessed")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{task.title}</DialogTitle>
            <Badge className={statusColors[task.status]}>
              {t(`status.${task.status.replace("_", "")}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Meta Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">ID</p>
                <p className="font-mono">{task.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="capitalize">{task.type.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("common.date")}</p>
                <p>{formatDate(task.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("processing.priority")}</p>
                <p className="capitalize">{t(`processing.${task.priority}` as Parameters<typeof t>[0])}</p>
              </div>
            </div>

            <Separator />

            {/* Data Comparison */}
            {renderDataComparison()}

            {/* Validation Info */}
            {task.validatedAt && (
              <>
                <Separator />
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {task.status === "validated" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {task.status === "validated"
                      ? t("validation.validatedBy")
                      : t("validation.rejectedBy")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(task.validatedAt)}
                  </p>
                  {task.validationComment && (
                    <p className="text-sm mt-2 p-2 bg-background rounded border">
                      {task.validationComment}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function DataDisplay({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground min-w-[80px] uppercase">
            {key}:
          </span>
          <span className="text-sm font-medium break-all">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
