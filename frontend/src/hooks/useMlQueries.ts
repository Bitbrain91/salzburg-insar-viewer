import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMlRun,
  deleteMlRun,
  getMlRunDetail,
  listMlRuns,
  patchMlRun,
  recolorMlRun,
  type MlRunCreatePayload,
  type MlRunSummary,
  type MlRunUpdatePayload,
} from "./useApi";

/**
 * Zentrale React-Query-Hooks für ML-Läufe (Stage 4 des UX-Redesigns).
 * Query-Keys bleiben identisch zu den früheren Inline-Hooks; neu ist das
 * konditionale Polling: 5s nur solange etwas läuft, sonst 30s (Liste)
 * bzw. aus (Detail).
 */

export const mlQueryKeys = {
  runs: ["ml-runs"] as const,
  runDetail: (runId: string | null) => ["ml-run-detail", runId] as const,
};

const ACTIVE_STATUSES = new Set(["queued", "running"]);

export function hasActiveRun(runs: MlRunSummary[] | undefined): boolean {
  return Boolean(runs?.some((run) => ACTIVE_STATUSES.has(run.status)));
}

export function useMlRuns() {
  return useQuery({
    queryKey: mlQueryKeys.runs,
    queryFn: () => listMlRuns(),
    refetchInterval: (query) => (hasActiveRun(query.state.data) ? 5000 : 30000),
  });
}

export function useMlRunDetail(runId: string | null) {
  return useQuery({
    queryKey: mlQueryKeys.runDetail(runId),
    queryFn: () => getMlRunDetail(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.has(status) ? 5000 : false;
    },
  });
}

export function useCreateMlRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MlRunCreatePayload) => createMlRun(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlQueryKeys.runs });
      toast.success("Auswertung gestartet", {
        description: "Der Lauf erscheint in der Liste und aktualisiert sich automatisch.",
      });
    },
    onError: (error) => {
      toast.error("Auswertung konnte nicht gestartet werden", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

export function useDeleteMlRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => deleteMlRun(runId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlQueryKeys.runs });
      toast.success("Auswertung gelöscht");
    },
    onError: (error) => {
      toast.error("Löschen fehlgeschlagen", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

export function useUpdateMlRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, payload }: { runId: string; payload: MlRunUpdatePayload }) =>
      patchMlRun(runId, payload),
    onMutate: async ({ runId, payload }) => {
      // Optimistisch: Label/Notizen sofort in der Liste zeigen.
      await queryClient.cancelQueries({ queryKey: mlQueryKeys.runs });
      const previous = queryClient.getQueryData<MlRunSummary[]>(mlQueryKeys.runs);
      if (previous) {
        queryClient.setQueryData<MlRunSummary[]>(
          mlQueryKeys.runs,
          previous.map((run) =>
            run.run_id === runId ? { ...run, ...payload } : run
          )
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(mlQueryKeys.runs, context.previous);
      }
      toast.error("Speichern fehlgeschlagen", {
        description: error instanceof Error ? error.message : String(error),
      });
    },
    onSettled: (_data, _error, { runId }) => {
      queryClient.invalidateQueries({ queryKey: mlQueryKeys.runs });
      queryClient.invalidateQueries({ queryKey: mlQueryKeys.runDetail(runId) });
    },
  });
}

export function useRecolorMlRun() {
  return useMutation({
    mutationFn: (runId: string) => recolorMlRun(runId),
    onError: (error) => {
      console.warn("Failed to recompute building colors", error);
    },
  });
}
