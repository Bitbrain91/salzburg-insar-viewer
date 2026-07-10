import { useEffect, useRef, useState } from "react";
import { useUpdateMlRun } from "../../hooks/useMlQueries";

type RunRenameControlProps = {
  runId: string;
  currentLabel: string | null | undefined;
  /** Angezeigter (ggf. abgeleiteter) Titel als Platzhalter. */
  placeholder: string;
  onDone: () => void;
  className?: string;
};

/**
 * Inline-Umbenennen eines Laufs: Enter speichert (leer = Label entfernen,
 * Titel fällt auf den abgeleiteten Namen zurück), Escape bricht ab.
 */
export function RunRenameControl({
  runId,
  currentLabel,
  placeholder,
  onDone,
  className,
}: RunRenameControlProps) {
  const [value, setValue] = useState(currentLabel ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateRun = useUpdateMlRun();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = () => {
    const trimmed = value.trim();
    const nextLabel = trimmed === "" ? null : trimmed.slice(0, 120);
    if ((currentLabel ?? null) !== nextLabel) {
      updateRun.mutate({ runId, payload: { label: nextLabel } });
    }
    onDone();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          save();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onDone();
        }
      }}
      onClick={(event) => event.stopPropagation()}
      maxLength={120}
      aria-label="Name der Auswertung"
      className={
        className ??
        "w-full rounded-md border border-primary bg-background px-2 py-1 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    />
  );
}
