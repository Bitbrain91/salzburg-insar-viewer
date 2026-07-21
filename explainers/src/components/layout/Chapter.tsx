/**
 * Kapitel-Wrapper: Anker-Section mit Stationsnummer (Eyebrow), Frage-Titel,
 * Klartext-Lead, Diagramm-Inhalt und optionaler technischer Tiefe.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TechDetails } from "@/components/ui";
import type { ChapterMeta } from "@/content/chapters";

export type ChapterProps = {
  meta: ChapterMeta;
  children: ReactNode;
  /** Inhalt der aufklappbaren "Exakte Regeln & Schwellen". */
  techDetails?: ReactNode;
};

export function Chapter({ meta, children, techDetails }: ChapterProps) {
  return (
    <section id={meta.id} aria-labelledby={`${meta.id}-titel`} className="grid gap-5">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="grid gap-2"
      >
        <p className="section-title !mb-0">{meta.eyebrow}</p>
        <h2 id={`${meta.id}-titel`} className="text-2xl font-bold tracking-tight text-foreground">
          {meta.titel}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{meta.lead}</p>
      </motion.header>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
        className="grid gap-4"
      >
        {children}
      </motion.div>
      {techDetails && <TechDetails>{techDetails}</TechDetails>}
    </section>
  );
}
