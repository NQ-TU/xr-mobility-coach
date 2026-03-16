import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExercise } from "@/lib/exercises";
import type { ExerciseSummary } from "@/lib/exercises";
import type { RoutineDetail } from "@/lib/routines";

/// Utility function to format date strings into a more readable format.
function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Component to display the details of a routine, including its exercises and metadata.
type RoutineCardProps = {
  routine: RoutineDetail | null;
  loading?: boolean;
  error?: string | null;
  onEdit: () => void;
  onDelete: () => void;
};

// The RoutineCard component displays detailed information about a specific routine, including its title, target area, estimated duration, and the list of exercises it contains. 
// It also provides buttons for editing and deleting the routine.
export function RoutineCard({
  routine,
  loading = false,
  error,
  onEdit,
  onDelete,
}: RoutineCardProps) {
  const [exerciseDetails, setExerciseDetails] = useState<Record<string, ExerciseSummary>>({});

  const routineExerciseIds = useMemo(() => {
    if (!routine?.items?.length) return [];
    return Array.from(new Set(routine.items.map((item) => item.exerciseId)));
  }, [routine]);

  useEffect(() => {
    let active = true;

    if (routineExerciseIds.length === 0) {
      return () => {
        active = false;
      };
    }

    // Fetch details for all exercises in the routine in parallel, and store them in a map for easy access.
    Promise.all(
      routineExerciseIds.map(async (id) => {
        try {
          return await getExercise(id);
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (!active) return;
      const next: Record<string, ExerciseSummary> = {};
      results.forEach((exercise) => {
        if (exercise) next[exercise.id] = exercise;
      });
      setExerciseDetails(next);
    });

    return () => {
      active = false;
    };
  }, [routineExerciseIds]);

  if (loading && !routine) {
    return (
      <Card className="border border-white/40 bg-white/80 shadow-lg rounded-3xl h-full flex flex-col">
        <CardHeader>
          <CardTitle>Routine Details</CardTitle>
          <CardDescription>Loading routine details...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground">Fetching routine data.</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !routine) {
    return (
      <Card className="border border-white/40 bg-white/80 shadow-lg rounded-3xl h-full flex flex-col">
        <CardHeader>
          <CardTitle>Routine Details</CardTitle>
          <CardDescription>Unable to load the routine.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!routine) {
    return (
      <Card className="border border-white/40 bg-white/80 shadow-lg rounded-3xl h-full flex flex-col">
        <CardHeader>
          <CardTitle>Routine Details</CardTitle>
          <CardDescription>Select a routine to see details.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground">
            Choose a routine from the list to review exercises or edit it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-white/40 bg-white/85 shadow-lg rounded-3xl h-full flex flex-col">
      <CardContent className="p-6 space-y-6 flex-1">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
              {routine.targetArea || "Full body"}
            </span>
            <div>
              <h2 className="text-4xl font-display font-bold">{routine.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Created {formatDate(routine.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onEdit}
              className="border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              Edit routine
            </Button>
            <Button variant="destructive" size="sm" type="button" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-sm">
              <Timer className="size-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Duration
                </p>
                <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  Estimate
                </span>
              </div>
              <p className="text-3xl font-display font-semibold">
                {routine.estimatedDuration
                  ? `${routine.estimatedDuration} min`
                  : "Not set"}
              </p>
              <p className="text-xs text-muted-foreground">Estimated session length.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
              <Dumbbell className="size-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Exercises
                </p>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Total
                </span>
              </div>
              <p className="text-3xl font-display font-semibold">{routine.items.length}</p>
              <p className="text-xs text-muted-foreground">Movements in this routine.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold">Routine Sequence</h3>
          {routine.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exercises have been added yet.
            </p>
            // If there are no exercises in the routine, display a message indicating that the routine is empty. Otherwise, 
            // map over the exercises and display their details, including name, description, muscle group, sets, reps/hold time, tempo, 
            // and any coaching notes. Exercise details are enriched with data fetched from the API based on exercise IDs.
          ) : (
            routine.items.map((item, index) => (
              (() => {
                const detail = exerciseDetails[item.exerciseId];
                const description = detail?.description ?? null;
                const muscleGroup = item.muscleGroup || detail?.muscleGroup || null;
                return (
              <div
                key={`${item.exerciseId}-${index}`}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-white/70 p-4"
              >
                <div className="size-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-base font-semibold">{item.exerciseName}</p>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {muscleGroup && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        {muscleGroup}
                      </span>
                    )}
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-teal-700 text-xs font-medium">
                      {item.sets ?? "-"} Sets
                    </span>
                    <span>{item.repsOrHoldSeconds ?? "-"} reps/hold</span>
                    {item.tempo && (
                      <span className="text-xs font-mono bg-slate-100/80 px-2 py-0.5 rounded">
                        Tempo: {item.tempo}
                      </span>
                    )}
                  </div>
                  {item.coachingNotes && (
                    <p className="text-sm text-muted-foreground">{item.coachingNotes}</p>
                  )}
                </div>
              </div>
                );
              })()
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
