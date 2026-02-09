import { apiJson } from "@/lib/api";

// User profile management, including fetching and updating user profile data from the API.
type ServerUserProfile = {
  firstName: string;
  lastName: string;
  trainingExperience?: string | null;
  preferredSessionLength?: number | null;
  targetAreas?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// Defines the UserProfile type used in the app, and provides functions to get and upsert the user profile by communicating with the backend API.
export type UserProfile = {
  firstName: string;
  lastName: string;
  trainingExperience?: "beginner" | "intermediate" | "advanced" | null;
  preferredSessionLength?: number | null;
  targetAreas?: string[];
  notes?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

// Helper functions to convert between the server's string-based targetAreas and the app's array of strings format.
function parseTargetAreas(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Converts an array of target areas into a comma-separated string for the server. Returns null if the array is empty or not provided.
function serializeTargetAreas(areas?: string[] | null): string | null {
  if (!areas || areas.length === 0) return null;
  return areas.join(",");
}

// Fetches the current user's profile from the API and converts it into the UserProfile format used in the app.
export async function getProfile(): Promise<UserProfile> {
  const data = await apiJson<ServerUserProfile>("/api/profile/me");
  return {
    ...data,
    trainingExperience: data.trainingExperience as UserProfile["trainingExperience"],
    targetAreas: parseTargetAreas(data.targetAreas),
    createdAt: data.createdAt ? new Date(data.createdAt) : null,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
  };
}

// Updates the user's profile by sending the provided data to the API. Converts the targetAreas array into a string format for the server and returns the updated profile.
export type UpsertProfileRequest = {
  firstName: string;
  lastName: string;
  trainingExperience?: "beginner" | "intermediate" | "advanced" | null;
  preferredSessionLength?: number | null;
  targetAreas?: string[];
  notes?: string | null;
};

// Sends a PUT request to update the user's profile with the given data, handling the conversion of target areas and returning the updated profile.
export async function upsertProfile(payload: UpsertProfileRequest): Promise<UserProfile> {
  const serverPayload: ServerUserProfile = {
    ...payload,
    targetAreas: serializeTargetAreas(payload.targetAreas),
  };
  const data = await apiJson<ServerUserProfile>("/api/profile/me", {
    method: "PUT",
    body: JSON.stringify(serverPayload),
  });
  return {
    ...data,
    trainingExperience: data.trainingExperience as UserProfile["trainingExperience"],
    targetAreas: parseTargetAreas(data.targetAreas),
    createdAt: data.createdAt ? new Date(data.createdAt) : null,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
  };
}
