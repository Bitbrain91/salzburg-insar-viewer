import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import {
  formatAttributeLabel,
  getAttributeMetadata,
  type AttributeContext,
  type AttributeMetadata,
} from "../../lib/attributeMetadata";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export { Button, buttonVariants } from "./button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
export {
  Tabs as ShadTabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./tabs";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./select";
export { Switch } from "./switch";
export { Slider } from "./slider";
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "./popover";
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./collapsible";
export {
  Accordion as RadixAccordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";
export { ScrollArea, ScrollBar } from "./scroll-area";
export { Separator } from "./separator";
export { Badge, badgeVariants } from "./badge";
export { Input } from "./input";
export { Label } from "./label";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";

/* ---------------- SegmentedTabs (legacy API) ---------------- */

export type SegmentedTabOption<T extends string = string> = {
  id: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
  count?: number;
};

export type SegmentedTabsProps<T extends string = string> = {
  options: Array<SegmentedTabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
  /** "row" lays tabs in a single line; "grid" wraps to a 2-column grid (good for >2 tabs in a narrow column). */
  layout?: "row" | "grid";
};

export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  style,
  compact = false,
  layout = "row",
}: SegmentedTabsProps<T>) {
  const isGrid = layout === "grid";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "w-full items-stretch gap-1 rounded-lg border border-border bg-muted p-1",
        isGrid ? "grid grid-cols-2" : "inline-flex",
        compact && !isGrid ? "min-h-8" : !isGrid ? "min-h-10" : null,
        className
      )}
      style={style}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 truncate rounded-md px-2 font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
              isGrid ? "min-w-0" : "flex-1 px-3",
              compact ? "h-7 text-xs" : "h-8 text-sm",
              selected
                ? "bg-popover text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="truncate">{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  selected ? "opacity-90" : "opacity-70"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const Tabs = SegmentedTabs;

/* ---------------- CollapsibleSection ---------------- */

export type CollapsibleSectionProps = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  aside,
  className,
  bodyClassName,
  id,
}: CollapsibleSectionProps) {
  const generatedId = useId();
  const bodyId = id ?? generatedId;
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("group/collapsible space-y-2", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <CollapsibleTrigger
          id={`${bodyId}-trigger`}
          className="group/trigger flex flex-1 items-center gap-2 text-left text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          <span className="min-w-0 truncate">{title}</span>
        </CollapsibleTrigger>
        {aside && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            {aside}
          </span>
        )}
      </div>
      <CollapsibleContent
        id={bodyId}
        className={cn(
          "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          bodyClassName
        )}
      >
        <div className="space-y-2 pl-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const Accordion = CollapsibleSection;

/* ---------------- Help popover ---------------- */

export type HelpContent = Pick<
  AttributeMetadata,
  "label" | "description" | "unit" | "source"
>;

export type HelpPopoverProps = {
  metadata: HelpContent;
  id?: string;
  style?: CSSProperties;
};

export function HelpPopover({ metadata }: HelpPopoverProps) {
  return (
    <div className="space-y-2 text-xs leading-relaxed">
      <div className="text-sm font-semibold text-foreground">{metadata.label}</div>
      {metadata.description && (
        <p className="text-muted-foreground">{metadata.description}</p>
      )}
      {(metadata.unit || metadata.source) && (
        <div className="grid gap-1 border-t border-border pt-2 text-muted-foreground">
          {metadata.unit && (
            <div>
              <strong className="font-semibold text-foreground">Einheit:</strong>{" "}
              {metadata.unit}
            </div>
          )}
          {metadata.source && (
            <div>
              <strong className="font-semibold text-foreground">Quelle:</strong>{" "}
              {metadata.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type HelpButtonProps = {
  metadata: HelpContent;
  className?: string;
  label?: string;
};

export function HelpButton({
  metadata,
  className,
  label = "Attribut-Hilfe",
}: HelpButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[state=open]:border-primary data-[state=open]:bg-primary data-[state=open]:text-primary-foreground",
            className
          )}
        >
          <HelpCircle className="h-3 w-3" strokeWidth={2.2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-72 max-w-[min(20rem,calc(100vw-2rem))]"
      >
        <HelpPopover metadata={metadata} />
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- MetricRow ---------------- */

export type MetricRowProps = {
  label?: ReactNode;
  value?: ReactNode;
  children?: ReactNode;
  attributeKey?: string;
  context?: AttributeContext;
  metadata?: AttributeMetadata;
  unit?: ReactNode;
  showHelp?: boolean;
  className?: string;
  valueClassName?: string;
};

export function MetricRow({
  label,
  value,
  children,
  attributeKey,
  context,
  metadata,
  unit,
  showHelp = true,
  className,
  valueClassName,
}: MetricRowProps) {
  const resolvedMetadata = useMemo(
    () =>
      metadata ?? (attributeKey ? getAttributeMetadata(attributeKey, context) : undefined),
    [attributeKey, context, metadata]
  );
  const resolvedLabel =
    label ??
    (attributeKey ? formatAttributeLabel(attributeKey, context) : resolvedMetadata?.label);
  const resolvedUnit = unit ?? resolvedMetadata?.unit;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 border-b border-border/70 py-1.5 text-xs last:border-b-0",
        className
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground leading-snug">
        <span className="min-w-0 break-words">
          {resolvedLabel}
          {resolvedUnit ? ` (${resolvedUnit})` : ""}
        </span>
        {showHelp && resolvedMetadata && <HelpButton metadata={resolvedMetadata} />}
      </span>
      <span
        className={cn(
          "min-w-0 justify-self-end text-right font-mono text-[12px] leading-snug text-foreground break-words max-w-full",
          valueClassName
        )}
      >
        {children ?? value ?? "—"}
      </span>
    </div>
  );
}

/* ---------------- SummaryMetric ---------------- */

export type SummaryMetricTone = "neutral" | "good" | "warning" | "bad" | "accent";

const summaryToneClasses: Record<SummaryMetricTone, string> = {
  neutral: "border-border bg-card",
  good: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-accent/40 bg-accent/10",
  bad: "border-destructive/40 bg-destructive/10",
  accent: "border-primary/40 bg-primary/10",
};

export type SummaryMetricProps = {
  label?: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  attributeKey?: string;
  context?: AttributeContext;
  metadata?: AttributeMetadata;
  unit?: ReactNode;
  tone?: SummaryMetricTone;
  className?: string;
  style?: CSSProperties;
  showHelp?: boolean;
};

export function SummaryMetric({
  label,
  value,
  detail,
  attributeKey,
  context,
  metadata,
  unit,
  tone = "neutral",
  className,
  style,
  showHelp = true,
}: SummaryMetricProps) {
  const resolvedMetadata = useMemo(
    () =>
      metadata ?? (attributeKey ? getAttributeMetadata(attributeKey, context) : undefined),
    [attributeKey, context, metadata]
  );
  const resolvedLabel =
    label ??
    (attributeKey ? formatAttributeLabel(attributeKey, context) : resolvedMetadata?.label);
  const resolvedUnit = unit ?? resolvedMetadata?.unit;

  return (
    <div
      style={style}
      className={cn(
        "grid min-w-0 gap-1 rounded-lg border px-3 py-2.5 transition-colors",
        summaryToneClasses[tone],
        className
      )}
    >
      <div className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="min-w-0 break-words">
          {resolvedLabel}
          {resolvedUnit ? ` (${resolvedUnit})` : ""}
        </span>
        {showHelp && resolvedMetadata && <HelpButton metadata={resolvedMetadata} />}
      </div>
      <div className="font-mono text-base font-bold leading-tight text-foreground break-words">
        {value}
      </div>
      {detail && (
        <small className="text-[11px] text-muted-foreground">{detail}</small>
      )}
    </div>
  );
}

/* ---------------- SummaryCard ---------------- */

export type SummaryCardProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function SummaryCard({ title, children, className, style }: SummaryCardProps) {
  return (
    <div
      style={style}
      className={cn(
        "grid gap-2.5 rounded-lg border border-border bg-card p-3",
        className
      )}
    >
      {title && (
        <div className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------- EmptyState ---------------- */

export type EmptyStateProps = {
  title: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "warning";
  className?: string;
  style?: CSSProperties;
};

export function EmptyState({
  title,
  message,
  action,
  tone = "neutral",
  className,
  style,
}: EmptyStateProps) {
  return (
    <div
      style={style}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-xs",
        tone === "warning"
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-border bg-secondary text-secondary-foreground",
        className
      )}
    >
      <span className="grid min-w-0 gap-0.5">
        <span className="font-semibold leading-tight">{title}</span>
        {message && (
          <small
            className={cn(
              "leading-snug",
              tone === "warning" ? "text-current opacity-90" : "text-muted-foreground"
            )}
          >
            {message}
          </small>
        )}
      </span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}
