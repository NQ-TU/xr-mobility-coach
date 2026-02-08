import { apiJson } from "@/lib/api";

export type UserProfile = {
  firstName: string;
  lastName: string;
};

export async function upsertProfile(firstName: string, lastName: string): Promise<UserProfile> {
  return apiJson<UserProfile>("/api/profile/me", {
    method: "PUT",
    body: JSON.stringify({ firstName, lastName }),
  });
}
