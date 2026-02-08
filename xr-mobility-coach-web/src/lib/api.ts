// API utility functions for handling authentication tokens and making API requests with proper headers and error handling.
// Includes functions to get/set JWT tokens in sessionStorage, construct API URLs with a base path, and fetch JSON data with error handling.
// TODO: Consider using httpOnly cookies for better security instead of sessionStorage/localStorage for JWTs, to mitigate XSS risks.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_KEY = "auth_jwt";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function withBase(path: string) {
  if (path.startsWith("http")) return path;
  if (API_BASE && path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

// Fetch wrapper that automatically includes JWT token in Authorization header and handles JSON responses and errors.
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(withBase(path), { ...init, headers });

  if (res.status === 401) {
    setToken(null);
  }

  return res;
}

// Fetch JSON data from the API, automatically handling token inclusion and error responses. Throws an error with a message if the response is not ok.
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : String(data || res.statusText);
    throw new Error(message);
  }

  return data as T;
}
