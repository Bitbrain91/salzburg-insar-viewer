import { ArrowUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { areaLabelFromId } from "../../lib/runName";
import {
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui";
import {
  initialRunFilters,
  isRunFilterActive,
  type RunFilterState,
  type RunSortOrder,
} from "./runFilters";

type RunListFiltersProps = {
  filters: RunFilterState;
  onFiltersChange: (filters: RunFilterState) => void;
  sortOrder: RunSortOrder;
  onSortOrderChange: (order: RunSortOrder) => void;
  options: { areas: string[]; sensors: string[]; tracks: string[] };
};

const sortLabels: Record<RunSortOrder, string> = {
  newest: "Neueste zuerst",
  oldest: "Älteste zuerst",
  area: "Gebiet A–Z",
};

/** Suchfeld + kompakte Filter-Chips für die schmale linke Spalte. */
export function RunListFilters({
  filters,
  onFiltersChange,
  sortOrder,
  onSortOrderChange,
  options,
}: RunListFiltersProps) {
  const set = (patch: Partial<RunFilterState>) =>
    onFiltersChange({ ...filters, ...patch });
  const anyActive = isRunFilterActive(filters);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
          placeholder="Suchen (Name, Gebiet, ID)"
          className="h-8 pl-8 pr-8 text-xs"
          aria-label="Auswertungen durchsuchen"
        />
        {filters.search !== "" && (
          <button
            type="button"
            aria-label="Suche leeren"
            onClick={() => set({ search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {options.areas.length > 1 && (
          <ChipSelect
            value={filters.areaId}
            onValueChange={(value) => set({ areaId: value })}
            allLabel="Gebiet"
            items={options.areas.map((id) => ({ value: id, label: areaLabelFromId(id) }))}
          />
        )}
        {options.sensors.length > 1 && (
          <ChipSelect
            value={filters.sensor}
            onValueChange={(value) => set({ sensor: value })}
            allLabel="Sensor"
            items={options.sensors.map((sensor) => ({ value: sensor, label: sensor }))}
          />
        )}
        {options.tracks.length > 0 && (
          <ChipSelect
            value={filters.track}
            onValueChange={(value) => set({ track: value })}
            allLabel="Track"
            items={[
              ...options.tracks.map((track) => ({ value: track, label: `T${track}` })),
            ]}
          />
        )}
        <ChipSelect
          value={filters.status}
          onValueChange={(value) =>
            set({ status: value as RunFilterState["status"] })
          }
          allLabel="Status"
          items={[
            { value: "active", label: "Läuft" },
            { value: "succeeded", label: "Fertig" },
            { value: "failed", label: "Fehlgeschlagen" },
          ]}
        />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Sortierung: ${sortLabels[sortOrder]}`}
              title={`Sortierung: ${sortLabels[sortOrder]}`}
              className="inline-grid h-7 w-7 place-items-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1.5">
            <div className="grid gap-0.5">
              {(Object.keys(sortLabels) as RunSortOrder[]).map((order) => (
                <button
                  key={order}
                  type="button"
                  onClick={() => onSortOrderChange(order)}
                  className={cn(
                    "rounded-sm px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted",
                    order === sortOrder ? "text-primary" : "text-foreground"
                  )}
                >
                  {sortLabels[order]}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {anyActive && (
          <button
            type="button"
            onClick={() => onFiltersChange(initialRunFilters)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}

function ChipSelect({
  value,
  onValueChange,
  allLabel,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  allLabel: string;
  items: Array<{ value: string; label: string }>;
}) {
  const active = value !== "all";
  const activeLabel = items.find((item) => item.value === value)?.label;
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={allLabel}
        className={cn(
          "h-7 w-auto gap-1 rounded-full border px-2.5 py-0 text-[11px] font-medium",
          active
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-secondary text-muted-foreground"
        )}
      >
        <SelectValue>{active ? activeLabel : allLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alle ({allLabel})</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
