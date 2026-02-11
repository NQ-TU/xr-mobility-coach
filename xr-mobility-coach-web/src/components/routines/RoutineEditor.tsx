import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Target, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listExercises } from "@/lib/exercises";
import type { ExerciseSummary } from "@/lib/exercises";
import type { RoutineDetail, UpsertRoutinePayload } from "@/lib/routines";

export type RoutineEditorHandle = {
  save: () => void;
};

// The RoutineEditor component provides a user interface for creating and editing workout routines. It allows users to specify the routine title,
//  add exercises from a searchable catalogue, and configure details such as sets, reps/hold time, and coaching notes for each exercise. 
// The component also automatically derives the target muscle groups and estimated duration based on the selected exercises, providing real time 
// feedback on these attributes. Users can save their changes, which will trigger the provided onSave callback with the routine data payload.
const DEFAULT_REPS = 10;
const DEFAULT_SETS = 1;
const REST_SECONDS_PER_SET = 30;
const MUSCLE_GROUP_OPTIONS = [
  "Ankles",
  "Calves",
  "Core",
  "Full Body",
  "Glutes",
  "Hamstrings",
  "Hips",
  "Lower Back",
  "Neck",
  "Quads",
  "Shoulders",
  "Spine",
  "Upper Back",
  "Wrists",
];

type RoutineItemDraft = {
  exerciseId: string;
  exerciseName: string;
  exerciseDescription?: string | null;
  muscleGroup?: string | null;
  sets: number;
  repsOrHoldSeconds: number;
  coachingNotes: string;
};

type RoutineEditorProps = {
  mode: "create" | "edit";
  initialRoutine?: RoutineDetail | null;
  onCancel: () => void;
  onSave: (payload: UpsertRoutinePayload) => Promise<void>;
  onSavingChange?: (saving: boolean) => void;
  showFooterActions?: boolean;
};

// Utility function to build the initial list of routine items from the routine details, mapping API data to the format used in the editor state.
function buildInitialItems(routine?: RoutineDetail | null): RoutineItemDraft[] {
  if (!routine?.items?.length) return [];
  return routine.items.map((item) => ({
    exerciseId: item.exerciseId,
    exerciseName: item.exerciseName,
    exerciseDescription: null,
    muscleGroup: item.muscleGroup ?? null,
    sets: item.sets ?? DEFAULT_SETS,
    repsOrHoldSeconds: item.repsOrHoldSeconds ?? DEFAULT_REPS,
    coachingNotes: item.coachingNotes ?? "",
  }));
}

// Utility function to derive the target muscle groups for the routine based on the muscle groups of the included exercises. 
// It returns a comma-separated string of unique muscle groups, or "Full Body" if no specific groups are identified.
function buildTargetArea(items: RoutineItemDraft[]) {
  const groups: string[] = [];
  items.forEach((item) => {
    const group = item.muscleGroup?.trim();
    if (!group) return;
    if (!groups.includes(group)) groups.push(group);
  });
  if (groups.length === 0 && items.length > 0) {
    return "Full Body";
  }
  return groups.join(", ");
}

// Utility function to estimate the total duration of the routine in minutes, based on the sets and reps/hold time of each exercise, plus a fixed rest time per set.
function buildEstimatedDurationMinutes(items: RoutineItemDraft[]) {
  if (items.length === 0) return null;
  const totalSeconds = items.reduce((sum, item) => {
    const sets = Math.max(1, Math.floor(item.sets || 0));
    const repsOrHoldSeconds = Math.max(0, Math.floor(item.repsOrHoldSeconds || 0));
    return sum + sets * (repsOrHoldSeconds + REST_SECONDS_PER_SET);
  }, 0);
  if (totalSeconds <= 0) return null;
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

// Utility function to get the difficulty metadata for an exercise based on its difficulty rating, returning a label and corresponding CSS class for styling
function getDifficultyMeta(value?: number | null) {
  if (!value) return null;
  if (value === 1) return { label: "easy", className: "bg-emerald-100 text-emerald-700" };
  if (value === 2) return { label: "medium", className: "bg-amber-100 text-amber-700" };
  if (value >= 3) return { label: "hard", className: "bg-rose-100 text-rose-700" };
  return null;
}

// The main component for editing a routine, allowing users to set the title, add and configure exercises, and see real-time feedback on target areas and estimated duration.
// It also includes a search interface for finding exercises to add to the routine, and handles saving the routine through the provided onSave callback.
export const RoutineEditor = forwardRef<RoutineEditorHandle, RoutineEditorProps>(
  (
    {
      mode,
      initialRoutine,
      onCancel,
      onSave,
      onSavingChange,
      showFooterActions = true,
    },
    ref,
  ) => {
    const [title, setTitle] = useState("");
    const [items, setItems] = useState<RoutineItemDraft[]>([]);

    const targetArea = useMemo(() => buildTargetArea(items), [items]);
    const estimatedDuration = useMemo(
      () => buildEstimatedDurationMinutes(items),
      [items],
    );
    const hasTargetArea = Boolean(targetArea);
    const hasEstimatedDuration = Boolean(estimatedDuration);
    const targetAreaBadge = hasTargetArea ? "Auto" : "Pending";
    const estimatedDurationBadge = hasEstimatedDuration ? "Auto" : "Pending";
    const targetAreaDisplay = targetArea || "Auto from exercises";
    const estimatedDurationDisplay = estimatedDuration
      ? `${estimatedDuration} min`
      : "Auto from exercises";
    const targetAreaSubtitle = hasTargetArea
      ? "Derived from selected exercises"
      : "Add exercises to populate";
    const estimatedDurationSubtitle = hasEstimatedDuration
      ? `Includes ${REST_SECONDS_PER_SET}s rest per set`
      : "Add exercises to estimate";

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchMuscleGroup, setSearchMuscleGroup] = useState("");
    const [searchResults, setSearchResults] = useState<ExerciseSummary[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchPage, setSearchPage] = useState(0);
    const [searchTotalPages, setSearchTotalPages] = useState(0);

    // When the component mounts or when the mode or initial routine changes, initialize the editor state. If in edit mode with a provided routine,
    //  populate the title and items based on the routine details. If in create mode, reset to empty values.
    useEffect(() => {
      if (mode === "edit" && initialRoutine) {
        setTitle(initialRoutine.title ?? "");
        setItems(buildInitialItems(initialRoutine));
        setError(null);
        return;
      }

      if (mode === "create") {
        setTitle("");
        setItems([]);
        setError(null);
      }
    }, [mode, initialRoutine]);

    // Function to remove an exercise item from the routine based on its index in the items array.
    const removeItem = (index: number) => {
      setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    // Function to move an exercise item up or down in the routine sequence by swapping its position in the items array.
    const moveItem = (fromIndex: number, toIndex: number) => {
      setItems((prev) => {
        if (toIndex < 0 || toIndex >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    };

    // Function to update the details of an exercise item in the routine based on its index and a partial update object containing the fields to change.
    const updateItem = (index: number, patch: Partial<RoutineItemDraft>) => {
      setItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
      );
    };

    // Function to perform a search for exercises based on the current search query and selected muscle group, updating the search results and pagination state accordingly.
    const handleSearch = async (page = 0) => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const data = await listExercises({
          q: searchQuery.trim() || undefined,
          muscleGroup: searchMuscleGroup.trim() || undefined,
          page,
          size: 8,
          sort: "name,asc",
        });
        setSearchResults(data.content);
        setSearchPage(data.number ?? page);
        setSearchTotalPages(data.totalPages ?? 0);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Failed to search exercises.");
      } finally {
        setSearchLoading(false);
      }
    };

    useEffect(() => {
      handleSearch(0);
    }, []);

    // Function to add an exercise to the routine items list when selected from the search results, initializing it with default sets and reps/hold time.
    const addExercise = (exercise: ExerciseSummary) => {
      setItems((prev) => [
        ...prev,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseDescription: exercise.description ?? null,
          muscleGroup: exercise.muscleGroup ?? null,
          sets: DEFAULT_SETS,
          repsOrHoldSeconds:
            typeof exercise.defaultHoldTimeOrReps === "number" &&
            exercise.defaultHoldTimeOrReps > 0
              ? exercise.defaultHoldTimeOrReps
              : DEFAULT_REPS,
          coachingNotes: "",
        },
      ]);
    };

    // Validation function to ensure that the routine has a title, a valid estimated duration, at least one exercise, 
    // and that all exercises have valid sets and reps/hold time before allowing the routine to be saved. Domain constraints
    //  are enforced here, and any validation errors are returned as strings to be displayed to the user.
    const validate = () => {
      if (!title.trim()) return "Title is required.";
      const durationValue = estimatedDuration ?? 0;
      if (durationValue < 1) {
        return "Estimated duration must be at least 1 minute.";
      }
      if (items.length === 0) return "Add at least one exercise.";
      const invalidIndex = items.findIndex(
        (item) => item.sets < 1 || item.repsOrHoldSeconds < 1,
      );
      if (invalidIndex >= 0) {
        return `Exercise ${invalidIndex + 1} needs sets and reps/hold of at least 1.`;
      }
      return null;
    };

    // Function to handle saving the routine, which first validates the input and then constructs the payload to be sent to the onSave callback.
    // The payload includes the routine title, target area, estimated duration, and a list of exercises with their respective details.
    //  If validation fails, an error message is set instead. The saving state is managed to provide feedback on the save operation.
    const handleSave = async () => {
      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      const payload: UpsertRoutinePayload = {
        title: title.trim(),
        targetArea: targetArea.trim() || null,
        estimatedDuration: estimatedDuration ?? 0,
        items: items.map((item) => ({
          exerciseId: item.exerciseId,
          sets: Math.max(1, Math.floor(item.sets)),
          repsOrHoldSeconds: Math.max(1, Math.floor(item.repsOrHoldSeconds)),
          coachingNotes: item.coachingNotes.trim() || null,
        })),
      };

      setSaving(true);
      setError(null);
      try {
        await onSave(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save routine.");
      } finally {
        setSaving(false);
      }
    };

    // Expose the save function to parent components through the ref, allowing them to trigger the save operation from outside the component (e.g., from a footer action button).
    useImperativeHandle(ref, () => ({
      save: handleSave,
    }));

    // Whenever the saving state changes, call the onSavingChange callback if provided to notify parent components of the current saving status.
    useEffect(() => {
      onSavingChange?.(saving);
    }, [saving, onSavingChange]);

    // Calculate the total number of pages for the exercise search results based on the API response, and determine the current page number for display.
    const pageCount = Math.max(1, searchTotalPages || 1);
    const pageNumber = searchTotalPages === 0 ? 1 : searchPage + 1;

    // If in edit mode and the initial routine data is still loading (i.e., not yet available), display a loading state with a message indicating that the routine details are being fetched.
    if (mode === "edit" && !initialRoutine) {
      return (
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Edit Routine</CardTitle>
            <CardDescription>Loading routine data...</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Fetching routine details.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Routine title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="bg-white"
                placeholder="New Routine"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-sm">
                  <Target className="size-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Target areas
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        hasTargetArea
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {targetAreaBadge}
                    </span>
                  </div>
                  <p
                    className={`text-base font-semibold ${
                      hasTargetArea ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {targetAreaDisplay}
                  </p>
                  <p className="text-xs text-muted-foreground">{targetAreaSubtitle}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                  <Timer className="size-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Estimated duration
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        hasEstimatedDuration
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {estimatedDurationBadge}
                    </span>
                  </div>
                  <p
                    className={`text-base font-semibold ${
                      hasEstimatedDuration ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {estimatedDurationDisplay}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {estimatedDurationSubtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between py-2 border-b border-border/40 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sequence ({items.length})
              </span>
              <span className="text-xs text-muted-foreground">Use arrows to reorder</span>
            </div>

            <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-3">
              {items.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-white/30">
                  <p>No exercises added yet.</p>
                  <p className="text-sm">Select exercises from the catalogue.</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={`${item.exerciseId}-${index}`}
                    className="relative rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="text-base font-semibold text-foreground">
                            {item.exerciseName}
                          </h4>
                          {item.exerciseDescription && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.exerciseDescription}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                              {item.muscleGroup || "Full body"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => moveItem(index, index - 1)}
                            disabled={index === 0}
                            aria-label="Move up"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => moveItem(index, index + 1)}
                            disabled={index === items.length - 1}
                            aria-label="Move down"
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(index)}
                            aria-label="Remove exercise"
                          >
                            x
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Sets</Label>
                          <Input
                            value={item.sets}
                            type="number"
                            className="h-9 bg-slate-50 border-slate-200"
                            onChange={(event) =>
                              updateItem(index, {
                                sets: Number(event.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Reps / Hold</Label>
                          <Input
                            value={item.repsOrHoldSeconds}
                            type="number"
                            className="h-9 bg-slate-50 border-slate-200"
                            onChange={(event) =>
                              updateItem(index, {
                                repsOrHoldSeconds: Number(event.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Coaching notes</Label>
                        <textarea
                          rows={1}
                          placeholder="Coaching notes..."
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          maxLength={150}
                          value={item.coachingNotes}
                          onChange={(event) =>
                            updateItem(index, { coachingNotes: event.target.value.slice(0, 150) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {showFooterActions && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {mode === "create"
                  ? "Create a routine and keep the order in sync with your list."
                  : "Saving will replace the entire routine in the order shown."}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" type="button" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {saving
                    ? "Saving..."
                    : mode === "create"
                      ? "Create routine"
                      : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-1/3 flex flex-col gap-4 h-full overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-4 shrink-0 space-y-3">
            <Input
              placeholder="Search catalogue..."
              className="bg-slate-50"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch(0);
              }}
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-slate-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={searchMuscleGroup}
                onChange={(event) => setSearchMuscleGroup(event.target.value)}
              >
                <option value="">All muscle groups</option>
                {MUSCLE_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => handleSearch(0)}
                disabled={searchLoading}
                className="h-9"
              >
                Search
              </Button>
            </div>
            {searchError && <p className="text-sm text-red-600">{searchError}</p>}
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border/50 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Exercise catalogue</p>
              <span className="text-xs text-muted-foreground">
                {searchResults.length} results
              </span>
            </div>

            <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-3">
              {searchLoading ? (
                <p className="text-sm text-muted-foreground">Searching exercises...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No results yet. Try searching by name or muscle group.
                </p>
              ) : (
                searchResults.map((exercise) => {
                  const difficulty = getDifficultyMeta(exercise.difficulty);

                  return (
                    <div
                      key={exercise.id}
                      className="p-4 border border-border/50 rounded-2xl bg-white hover:border-sky-200 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-semibold text-sm">{exercise.name}</h4>
                          {exercise.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {exercise.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {exercise.muscleGroup && (
                              <span className="text-[10px] h-5 px-2 rounded-full bg-sky-50 text-sky-700 font-medium">
                                {exercise.muscleGroup}
                              </span>
                            )}
                            {difficulty && (
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficulty.className}`}
                              >
                                {difficulty.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-full hover:bg-sky-100 hover:text-sky-700"
                          onClick={() => addExercise(exercise)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => handleSearch(searchPage - 1)}
                disabled={searchLoading || searchPage <= 0}
              >
                Previous
              </Button>
              <span>
                Page {pageNumber} of {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => handleSearch(searchPage + 1)}
                disabled={searchLoading || searchPage + 1 >= searchTotalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

RoutineEditor.displayName = "RoutineEditor";
