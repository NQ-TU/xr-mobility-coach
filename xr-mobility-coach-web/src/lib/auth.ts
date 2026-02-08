/**
 * Authentication utilities for handling user login, registration, and session management using JWT tokens stored in sessionStorage. 
 * Provides functions to log in, register, fetch the current user, and log out by managing the token and making API requests to the
 * backend authentication endpoints.
 */
import { apiFetch, apiJson, setToken } from "@/lib/api";


export type AuthUser = { userId: string; email: string };
type AuthResponse = AuthUser & { token: string };

// Logs in a user by sending credentials to the API, storing the returned JWT token, and returning user info.
export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return { userId: data.userId, email: data.email };
}

// Registers a new user by sending credentials to the API, storing the returned JWT token, and returning user info.
export async function register(email: string, password: string): Promise<AuthUser> {
  const data = await apiJson<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return { userId: data.userId, email: data.email };
}

// Fetches the current authenticated user's info from the API using the stored JWT token. Returns null if not authenticated.
export async function me(): Promise<AuthUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as AuthUser;
}

// Logs out the user by clearing the stored JWT token.
export function logout() {
  setToken(null);
}
