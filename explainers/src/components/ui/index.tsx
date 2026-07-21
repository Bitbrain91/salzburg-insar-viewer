import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children: ReactNode;
  className?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
};

export function Button({
  asChild = false,
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 py-2 text-sm",
    variant === "outline"
      ? "border border-border bg-card text-foreground hover:bg-secondary"
      : "bg-primary text-primary-foreground hover:bg-primary/90",
    className
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" && "border-border bg-secondary text-secondary-foreground",
        variant === "destructive" &&
          "border-transparent bg-destructive text-destructive-foreground",
        className
      )}
      {...props}
    />
  );
}

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: [number];
  onValueChange: (value: [number]) => void;
};

export function Slider({ className, value, onValueChange, ...props }: SliderProps) {
  return (
    <input
      type="range"
      className={cn("explainer-slider", className)}
      value={value[0]}
      onChange={(event) => onValueChange([Number(event.target.value)])}
      {...props}
    />
  );
}

type LabeledSliderProps = SliderProps & {
  label: ReactNode;
  /** Formatierter Anzeigewert, z. B. "38,5°". */
  valueLabel: string;
};

/** Slider mit Beschriftung und Mono-Wertanzeige — Standardeingabe der Diagramme. */
export function LabeledSlider({ label, valueLabel, ...props }: LabeledSliderProps) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{valueLabel}</span>
      </span>
      <Slider {...props} />
    </label>
  );
}

type ToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
};

/** Schlichter Schalter für Ja/Nein-Eingaben in den Diagrammen. */
export function Toggle({ checked, onCheckedChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-secondary",
        className
      )}
    >
      <span className="min-w-0 text-foreground">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

type TechDetailsProps = {
  /** Überschrift, Standard: "Exakte Regeln & Schwellen". */
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Aufklappbare technische Tiefe am Ende jedes Kapitels. */
export function TechDetails({ summary, children, className }: TechDetailsProps) {
  return (
    <details
      className={cn(
        "group rounded-lg border border-border bg-card open:shadow-sm",
        className
      )}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span>{summary ?? "Exakte Regeln & Schwellen"}</span>
        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="grid gap-3 border-t border-border px-4 py-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
