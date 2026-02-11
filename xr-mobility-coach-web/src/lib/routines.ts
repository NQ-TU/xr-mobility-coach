import { apiFetch, apiJson } from "@/lib/api";

// Routine-related types and API functions for listing routines with pagination, fetching routine details, creating, updating, and deleting routines.
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

// Summary information about a routine, including its ID, title, target area, estimated duration, creation date, and the count of exercises it contains.
export type RoutineSummary = {
  id: string;
  title: string;
  targetArea?: string | null;
  estimatedDuration?: number | null;
  createdAt?: string | null;
  exerciseCount: number;
};

// Detailed information about a routine, including its ID, title, target area, estimated duration, creation date, and a list of exercises with their specific details and sequencing information.
export type RoutineItem = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  sequenceIndex?: number | null;
  sets?: number | null;
  repsOrHoldSeconds?: number | null;
  tempo?: string | null;
  coachingNotes?: string | null;
};

// Payload structure for creating or updating a routine, which includes the routine's title, target area, estimated duration, and a list of exercises with their details to be included in the routine.
export type RoutineDetail = {
  id: string;
  title: string;
  targetArea?: string | null;
  estimatedDuration?: number | null;
  createdAt?: string | null;
  items: RoutineItem[];
};

// Payload structure for creating or updating a routine, which includes the routine's title, target area, estimated duration, and a list of exercises with their details to be included in the routine.
export type RoutineItemPayload = {
  exerciseId: string;
  sets: number;
  repsOrHoldSeconds: number;
  tempo?: string | null;
  coachingNotes?: string | null;
};

// The function constructs a query string from the provided options and makes an API request to retrieve a paginated list of RoutineSummary objects that match the search criteria.
export type UpsertRoutinePayload = {
  title: string;
  targetArea?: string | null;
  estimatedDuration?: number | null;
  items: RoutineItemPayload[];
};

// The function constructs a query string from the provided options and makes an API request to retrieve a paginated list of RoutineSummary objects that match the search criteria.
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

// Fetches a paginated list of routine summaries from the API based on the provided pagination and sorting options, returning a Page object containing an array of RoutineSummary objects and pagination metadata.
export async function listRoutines(
  options: { page?: number; size?: number; sort?: string } = {},
) {
  const query = buildQuery({
    page: options.page ?? 0,
    size: options.size ?? 10,
    sort: options.sort ?? "createdAt,desc",
  });
  return apiJson<Page<RoutineSummary>>(`/api/routines${query}`);
}

// Fetches the details of a specific routine by its ID from the API, returning a RoutineDetail object with all relevant information about the routine, including its exercises and their sequencing.
export async function getRoutine(id: string) {
  return apiJson<RoutineDetail>(`/api/routines/${id}`);
}

// Creates a new routine by sending the provided routine data to the API, returning the created RoutineDetail object with its assigned ID and all relevant information.
export async function createRoutine(payload: UpsertRoutinePayload) {
  return apiJson<RoutineDetail>("/api/routines", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Updates an existing routine by sending the provided routine data to the API for the specified routine ID, returning the updated RoutineDetail object with all relevant information.
export async function updateRoutine(id: string, payload: UpsertRoutinePayload) {
  return apiJson<RoutineDetail>(`/api/routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Deletes a routine by its ID by making a DELETE request to the API, throwing an error if the operation fails, and returning nothing if the deletion is successful.
export async function deleteRoutine(id: string) {
  const res = await apiFetch(`/api/routines/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}
