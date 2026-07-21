/**
 * Formeldarstellung mit farbigen Termgruppen — bewusst HTML/Mono statt
 * LaTeX: alle Pipeline-Formeln sind gewichtete Summen und Clamps.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FormulaTerm = {
  /** Gewicht als Anzeigetext, z. B. "0,60 ·". */
  factor?: string;
  /** Name des Terms, z. B. "Cluster-Ausreißer". */
  name: string;
  color?: string;
};

export type FormulaBoxProps = {
  /** Linke Seite, z. B. "anomaly_score". */
  result: string;
  terms: FormulaTerm[];
  /** Verbinder zwischen Termen (Standard "+"). */
  operator?: string;
  /** Zusatz hinter der Formel, z. B. "− Abzüge". */
  suffix?: ReactNode;
  note?: ReactNode;
  className?: string;
};

export function FormulaBox({
  result,
  terms,
  operator = "+",
  suffix,
  note,
  className,
}: FormulaBoxProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-secondary/60 px-3 py-2.5 text-xs",
        className
      )}
    >
      <div className="font-mono flex flex-wrap items-baseline gap-x-1.5 gap-y-1 leading-relaxed">
        <span className="font-semibold text-foreground">{result}</span>
        <span className="text-muted-foreground">=</span>
        {terms.map((term, index) => (
          <span key={term.name} className="inline-flex items-baseline gap-1.5">
            {index > 0 && <span className="text-muted-foreground">{operator}</span>}
            <span
              className="rounded px-1 py-0.5"
              style={{
                backgroundColor: term.color ? `${term.color}1a` : "hsl(var(--muted))",
                color: term.color ?? "hsl(var(--foreground))",
              }}
            >
              {term.factor && <span className="opacity-80">{term.factor} </span>}
              <span className="font-medium">{term.name}</span>
            </span>
          </span>
        ))}
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </div>
      {note && <div className="mt-1.5 leading-relaxed text-muted-foreground">{note}</div>}
    </div>
  );
}
