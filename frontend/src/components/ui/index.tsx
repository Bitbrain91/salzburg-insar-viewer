import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  formatAttributeLabel,
  getAttributeMetadata,
  type AttributeContext,
  type AttributeMetadata,
} from "../../lib/attributeMetadata";

const colors = {
  panel: "var(--panel, #fbfaf7)",
  ink: "var(--ink, #1a1f1c)",
  muted: "var(--muted, #5b655f)",
  accent: "var(--accent, #0c7c74)",
  accent2: "var(--accent-2, #e27d3f)",
  border: "var(--border, #d7d2c6)",
  quiet: "#eef1ec",
  warning: "#f8e6d7",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

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
};

export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  style,
  compact = false,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        gap: 2,
        padding: 3,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        background: colors.quiet,
        maxWidth: "100%",
        ...style,
      }}
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
            style={{
              minHeight: compact ? 28 : 34,
              minWidth: compact ? 32 : 44,
              padding: compact ? "5px 8px" : "7px 10px",
              border: "none",
              borderRadius: 8,
              background: selected ? colors.accent : "transparent",
              color: selected ? "#ffffff" : colors.ink,
              font: "inherit",
              fontSize: compact ? 12 : 13,
              fontWeight: selected ? 600 : 500,
              cursor: option.disabled ? "not-allowed" : "pointer",
              opacity: option.disabled ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                style={{
                  marginLeft: 6,
                  fontFamily: '"IBM Plex Mono", monospace',
                  opacity: selected ? 0.9 : 0.7,
                }}
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
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <section className={className} style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => setOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "2px 0",
          border: "none",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
        }}
      >
        <span className="section-title" style={{ minWidth: 0 }}>
          {title}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {aside}
          <span
            aria-hidden="true"
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 22,
              height: 22,
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {isOpen ? "-" : "+"}
          </span>
        </span>
      </button>
      {isOpen && (
        <div id={bodyId} className={bodyClassName}>
          {children}
        </div>
      )}
    </section>
  );
}

export const Accordion = CollapsibleSection;

export type HelpContent = Pick<AttributeMetadata, "label" | "description" | "unit" | "source">;

export type HelpPopoverProps = {
  metadata: HelpContent;
  id?: string;
  style?: CSSProperties;
};

export function HelpPopover({ metadata, id, style }: HelpPopoverProps) {
  return (
    <div
      id={id}
      role="tooltip"
      style={{
        position: "absolute",
        zIndex: 10,
        right: 0,
        top: "calc(100% + 6px)",
        width: 260,
        maxWidth: "min(260px, 78vw)",
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: colors.panel,
        boxShadow: "0 10px 28px rgba(12, 18, 15, 0.16)",
        color: colors.ink,
        fontSize: 12,
        lineHeight: 1.45,
        textTransform: "none",
        letterSpacing: 0,
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{metadata.label}</div>
      <div style={{ color: colors.muted }}>{metadata.description}</div>
      {(metadata.unit || metadata.source) && (
        <div style={{ display: "grid", gap: 3, marginTop: 8, color: colors.muted }}>
          {metadata.unit && (
            <div>
              <strong>Einheit:</strong> {metadata.unit}
            </div>
          )}
          {metadata.source && (
            <div>
              <strong>Quelle:</strong> {metadata.source}
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

export function HelpButton({ metadata, className, label = "Attribut-Hilfe" }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-flex" }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 18,
          height: 18,
          borderRadius: 999,
          border: `1px solid ${colors.border}`,
          background: open ? colors.accent : "transparent",
          color: open ? "#ffffff" : colors.muted,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ?
      </button>
      {open && <HelpPopover id={id} metadata={metadata} />}
    </span>
  );
}

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
    () => metadata ?? (attributeKey ? getAttributeMetadata(attributeKey, context) : undefined),
    [attributeKey, context, metadata]
  );
  const resolvedLabel =
    label ?? (attributeKey ? formatAttributeLabel(attributeKey, context) : resolvedMetadata?.label);
  const resolvedUnit = unit ?? resolvedMetadata?.unit;

  return (
    <div className={cx("metric", className)}>
      <span
        className="label"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        <span style={{ minWidth: 0 }}>
          {resolvedLabel}
          {resolvedUnit ? ` (${resolvedUnit})` : ""}
        </span>
        {showHelp && resolvedMetadata && <HelpButton metadata={resolvedMetadata} />}
      </span>
      <span className={cx("value", valueClassName)}>{children ?? value ?? "-"}</span>
    </div>
  );
}

export type SummaryMetricTone = "neutral" | "good" | "warning" | "bad" | "accent";

const summaryToneStyle: Record<SummaryMetricTone, CSSProperties> = {
  neutral: { borderColor: colors.border, background: colors.panel },
  good: { borderColor: "rgba(27, 158, 119, 0.35)", background: "rgba(27, 158, 119, 0.08)" },
  warning: { borderColor: "rgba(226, 125, 63, 0.35)", background: "rgba(226, 125, 63, 0.10)" },
  bad: { borderColor: "rgba(198, 55, 42, 0.35)", background: "rgba(198, 55, 42, 0.09)" },
  accent: { borderColor: "rgba(12, 124, 116, 0.35)", background: "rgba(12, 124, 116, 0.09)" },
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
    () => metadata ?? (attributeKey ? getAttributeMetadata(attributeKey, context) : undefined),
    [attributeKey, context, metadata]
  );
  const resolvedLabel =
    label ?? (attributeKey ? formatAttributeLabel(attributeKey, context) : resolvedMetadata?.label);
  const resolvedUnit = unit ?? resolvedMetadata?.unit;

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 4,
        minWidth: 0,
        padding: "10px 12px",
        border: "1px solid",
        borderRadius: 8,
        ...summaryToneStyle[tone],
        ...style,
      }}
    >
      <div
        className="label"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
          color: colors.muted,
          fontSize: 12,
        }}
      >
        <span style={{ minWidth: 0 }}>
          {resolvedLabel}
          {resolvedUnit ? ` (${resolvedUnit})` : ""}
        </span>
        {showHelp && resolvedMetadata && <HelpButton metadata={resolvedMetadata} />}
      </div>
      <div
        className="value"
        style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 18,
          fontWeight: 700,
          color: colors.ink,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
      {detail && <small style={{ color: colors.muted }}>{detail}</small>}
    </div>
  );
}

export type SummaryCardProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function SummaryCard({ title, children, className, style }: SummaryCardProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 10,
        padding: 12,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        background: colors.panel,
        ...style,
      }}
    >
      {title && <div className="section-title">{title}</div>}
      {children}
    </div>
  );
}

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
      className={cx("pill", tone === "warning" && "warning", className)}
      style={{
        width: "100%",
        alignItems: "flex-start",
        justifyContent: "space-between",
        borderRadius: 10,
        background: tone === "warning" ? colors.warning : colors.quiet,
        ...style,
      }}
    >
      <span style={{ display: "grid", gap: 3 }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {message && <small style={{ color: tone === "warning" ? "inherit" : colors.muted }}>{message}</small>}
      </span>
      {action}
    </div>
  );
}
