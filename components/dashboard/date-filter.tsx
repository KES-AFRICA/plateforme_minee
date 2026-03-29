"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DateRangeType, DateRange } from "@/hooks/use-date-filter";

interface DateFilterProps {
  dateRangeType: DateRangeType;
  dateRange: DateRange;
  onRangeTypeChange: (type: DateRangeType) => void;
  onCustomRangeChange: (range: DateRange) => void;
  className?: string;
}

const rangeOptions: { value: DateRangeType; label: string }[] = [
  { value: "today",  label: "Aujourd'hui" },
  { value: "week",   label: "Semaine" },
  { value: "month",  label: "Mois" },
  { value: "custom", label: "Personnalisé" },
];

export function DateFilter({
  dateRangeType,
  dateRange,
  onRangeTypeChange,
  onCustomRangeChange,
  className,
}: DateFilterProps) {
  return (
    <div className={cn("flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto", className)}>

      {/* Boutons de période — scrollable horizontalement sur petit écran */}
      <div className="w-full overflow-x-auto sm:overflow-visible">
        <div className="flex min-w-max rounded-lg border border-border bg-background sm:min-w-0">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none first:rounded-l-lg last:rounded-r-lg px-3 text-xs sm:px-4 sm:text-sm whitespace-nowrap flex-1 sm:flex-none",
                dateRangeType === option.value && "bg-primary/10 text-primary"
              )}
              onClick={() => onRangeTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sélecteur de dates personnalisées */}
      {dateRangeType === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs sm:w-auto sm:text-sm"
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {format(dateRange.start, "dd/MM/yyyy", { locale: fr })}
                {" – "}
                {format(dateRange.end, "dd/MM/yyyy", { locale: fr })}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-auto" />
            </Button>
          </PopoverTrigger>
          {/* Sur mobile : 1 mois affiché, sur desktop : 2 mois */}
          <PopoverContent className="w-auto p-0" align="end">
            <div className="block sm:hidden">
              <Calendar
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onCustomRangeChange({ start: range.from, end: range.to });
                  }
                }}
                locale={fr}
                numberOfMonths={1}
              />
            </div>
            <div className="hidden sm:block">
              <Calendar
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onCustomRangeChange({ start: range.from, end: range.to });
                  }
                }}
                locale={fr}
                numberOfMonths={2}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}