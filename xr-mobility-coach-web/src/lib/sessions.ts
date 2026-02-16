import { apiJson } from "@/lib/api";

/// Types and API functions related to workout sessions
export type SessionSummary = {
  id: string;
  routineId: string;
  routineTitle?: string | null;
  targetArea?: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  overallRpe?: number | null;
  exerciseCount: number;
};

// Detailed metrics for each exercise performed in a session
export type SessionMetric = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  setIndex: number;
  completed: boolean;
  skipped: boolean;
  repsCompleted?: number | null;
  timeUnderTension?: number | null;
  exerciseRpe?: number | null;
  notes?: string | null;
};

// Detailed information about a workout session, including metrics for each exercise
export type SessionDetail = {
  id: string;
  routineId: string;
  routineTitle?: string | null;
  targetArea?: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  overallRpe?: number | null;
  metrics: SessionMetric[];
};

// Helper function to build a query string from an object of parameters
function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });

  const query = qs.toString();
  return query ? `?${query}` : "";
}

// API function to list workout sessions within a specified date range
export async function listSessions(params: { from: string; to: string }) {
  const query = buildQuery({ from: params.from, to: params.to });
  return apiJson<SessionSummary[]>(`/api/sessions${query}`);
}

// API function to get detailed information about a specific workout session by its ID
export async function getSessionDetail(id: string) {
  return apiJson<SessionDetail>(`/api/sessions/${id}`);
}
