import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoutineCard } from "@/components/routines/Routine";
import { cn } from "@/lib/utils";
import { deleteRoutine, getRoutine, listRoutines } from "@/lib/routines";
import type { Page, RoutineDetail, RoutineSummary } from "@/lib/routines";

const PAGE_SIZE = 10;

function formatExerciseCount(count: number) {
  return `${count} exercise${count === 1 ? "" : "s"}`;
}

function getSelectedFromLocation(location: string) {
  // Supports deep-linking back to a specific routine (e.g. after save/edit).
  const query = location.split("?")[1];
  if (!query) return null;
  const params = new URLSearchParams(query);
  return params.get("selected");
}

export default function RoutinesPage() {
  const [location, setLocation] = useLocation();
  const selectedFromQuery = useMemo(() => getSelectedFromLocation(location), [location]);

  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [pageInfo, setPageInfo] = useState<Page<RoutineSummary> | null>(null);
  const [listPage, setListPage] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoutines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return routines;
    return routines.filter((routine) => {
      const title = routine.title?.toLowerCase() ?? "";
      const target = routine.targetArea?.toLowerCase() ?? "";
      return title.includes(query) || target.includes(query);
    });
  }, [routines, searchQuery]);

  const loadRoutines = useCallback(
    async (page: number) => {
      setListLoading(true);
      setListError(null);
      try {
        const data = await listRoutines({
          page,
          size: PAGE_SIZE,
          sort: "createdAt,desc",
        });
        setRoutines(data.content);
        setPageInfo(data);
        // Selection precedence: keep current selection, then query param, then first item.
        setSelectedId((current) =>
          current ?? selectedFromQuery ?? data.content[0]?.id ?? null,
        );
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Failed to load routines.");
      } finally {
        setListLoading(false);
      }
    },
    [selectedFromQuery],
  );

  useEffect(() => {
    loadRoutines(listPage);
  }, [listPage, loadRoutines]);

  useEffect(() => {
    // Sync selection when a `?selected=<id>` query param is pushed to this route.
    if (selectedFromQuery) {
      setSelectedId(selectedFromQuery);
    }
  }, [selectedFromQuery]);

  useEffect(() => {
    // Guard against setting state from a stale request when selection changes quickly.
    let active = true;

    if (!selectedId) {
      setSelectedRoutine(null);
      setDetailError(null);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    getRoutine(selectedId)
      .then((data) => {
        if (active) setSelectedRoutine(data);
      })
      .catch((err) => {
        if (active) {
          setSelectedRoutine(null);
          setDetailError(
            err instanceof Error ? err.message : "Failed to load routine.",
          );
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  const handleCreate = () => {
    setLocation("/routines/new");
  };

  const handleEdit = () => {
    if (!selectedRoutine) return;
    setLocation(`/routines/${selectedRoutine.id}/edit`);
  };

  const handleDelete = async () => {
    if (!selectedRoutine) return;
    const ok = window.confirm(
      `Delete "${selectedRoutine.title}"? This cannot be undone.`,
    );
    if (!ok) return;

    try {
      await deleteRoutine(selectedRoutine.id);
      setSelectedRoutine(null);
      setSelectedId(null);
      setLocation("/routines");
      await loadRoutines(listPage);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "Failed to delete routine.",
      );
    }
  };

  const totalPages = pageInfo?.totalPages ?? 1;
  const pageNumber = (pageInfo?.number ?? 0) + 1;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] h-full items-stretch">
        <div className="space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-display font-bold">Routines</h1>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200/60"
              type="button"
              onClick={handleCreate}
            >
              + New Routine
            </Button>
          </div>

          <Input
            placeholder="Filter routines..."
            className="bg-white/60 border-border/60"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {listLoading && routines.length === 0 && (
              <p className="text-sm text-muted-foreground">Loading routines...</p>
            )}
            {listError && <p className="text-sm text-red-600">{listError}</p>}
            {!listLoading && routines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No routines yet. Create your first routine to get started.
              </p>
            )}

            <div className="space-y-3 overflow-y-auto pr-2">
              {filteredRoutines.map((routine) => {
                const metaParts = [
                  routine.targetArea || "Full body",
                  routine.estimatedDuration ? `${routine.estimatedDuration} min` : null,
                  formatExerciseCount(routine.exerciseCount),
                ].filter(Boolean);

                return (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => setSelectedId(routine.id)}
                    className={cn(
                      "w-full text-left rounded-2xl border border-border/60 bg-white/90 p-4 transition hover:bg-white",
                      selectedId === routine.id
                        ? "border-sky-300 bg-sky-50 shadow-sm"
                        : "shadow-sm",
                    )}
                  >
                    <p className="text-base font-semibold">{routine.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {metaParts.join(" - ")}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setListPage((prev) => Math.max(0, prev - 1))}
                disabled={listPage === 0 || listLoading}
              >
                Previous
              </Button>
              <span>
                Page {pageNumber} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() =>
                  setListPage((prev) =>
                    pageInfo && prev + 1 < pageInfo.totalPages ? prev + 1 : prev,
                  )
                }
                disabled={listLoading || (pageInfo ? pageInfo.last : true)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <RoutineCard
          routine={selectedRoutine}
          loading={detailLoading}
          error={detailError}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
