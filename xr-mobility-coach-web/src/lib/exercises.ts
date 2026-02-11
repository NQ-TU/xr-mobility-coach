import { apiJson } from "@/lib/api";
import type { Page } from "@/lib/routines";

export type ExerciseSummary = {
  id: string;
  name: string;
  description?: string | null;
  muscleGroup?: string | null;
  difficulty?: number | null;
  defaultHoldTimeOrReps?: number | null;
  animationAssetId?: string | null;
};

export async function getExercise(id: string) {
  return apiJson<ExerciseSummary>(`/api/exercises/${id}`);
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function listExercises(
  options: {
    q?: string;
    muscleGroup?: string;
    difficulty?: number;
    page?: number;
    size?: number;
    sort?: string;
  } = {},
) {
  const query = buildQuery({
    q: options.q,
    muscleGroup: options.muscleGroup,
    difficulty: options.difficulty,
    page: options.page ?? 0,
    size: options.size ?? 6,
    sort: options.sort ?? "name,asc",
  });
  return apiJson<Page<ExerciseSummary>>(`/api/exercises${query}`);
}
