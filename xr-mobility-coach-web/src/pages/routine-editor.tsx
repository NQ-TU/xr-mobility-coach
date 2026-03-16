import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoutineEditor, type RoutineEditorHandle } from "@/components/routines/RoutineEditor";
import { createRoutine, getRoutine, updateRoutine } from "@/lib/routines";
import type { RoutineDetail, UpsertRoutinePayload } from "@/lib/routines";

export default function RoutineEditorPage() {
  const [, setLocation] = useLocation();
  const [matchEdit, editParams] = useRoute("/routines/:id/edit");
  const [matchNew] = useRoute("/routines/new");

  const mode = useMemo<"create" | "edit">(
    () => (matchEdit ? "edit" : "create"),
    [matchEdit],
  );

  const routineId = matchEdit ? editParams?.id : null;

  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<RoutineEditorHandle | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !routineId) {
      return;
    }

    let active = true;

    getRoutine(routineId)
      .then((data) => {
        if (active) {
          setLoadedRoutineId(routineId);
          setRoutine(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadedRoutineId(routineId);
          setRoutine(null);
          setError(err instanceof Error ? err.message : "Failed to load routine.");
        }
      });

    return () => {
      active = false;
    };
  }, [mode, routineId]);

  const routineForEditor =
    mode === "edit" && loadedRoutineId === routineId ? routine : null;
  const pageError =
    mode === "edit" && loadedRoutineId === routineId ? error : null;

  const handleCancel = () => {
    setLocation("/routines");
  };

  const handleSave = async (payload: UpsertRoutinePayload) => {
    if (mode === "create") {
      const created = await createRoutine(payload);
      setLocation(`/routines?selected=${created.id}`);
      return;
    }

    if (mode === "edit" && routineId) {
      const updated = await updateRoutine(routineId, payload);
      setLocation(`/routines?selected=${updated.id}`);
    }
  };

  if (!matchEdit && !matchNew) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="h-9 w-9"
            onClick={handleCancel}
          >
            <span className="text-lg leading-none">&lt;</span>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {mode === "create" ? "Create Routine" : "Edit Routine"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Design your perfect mobility flow."
                : "Update the sequence and details."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" type="button" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => editorRef.current?.save()}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {saving ? "Saving..." : "Save Routine"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-visible lg:overflow-hidden">
        {pageError ? (
          <Card className="glass-card border-none">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-red-600">{pageError}</p>
              <Button type="button" onClick={handleCancel}>
                Return to routines
              </Button>
            </CardContent>
          </Card>
        ) : (
            <RoutineEditor
              ref={editorRef}
              mode={mode}
              initialRoutine={routineForEditor}
              onCancel={handleCancel}
              onSave={handleSave}
              onSavingChange={setSaving}
              showFooterActions={false}
          />
        )}
      </div>
    </div>
  );
}
