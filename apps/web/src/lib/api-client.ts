const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const fallbackBaseUrl = "http://localhost:4000/api/v1";

if (!configuredBaseUrl && process.env.NODE_ENV === "production") {
  // Silently falling back to a dev-only URL in production is exactly what
  // caused a full signup/login outage here before — every request failed
  // with no way to tell why from the UI. Surface it loudly instead.
  // eslint-disable-next-line no-console
  console.error(
    `NEXT_PUBLIC_API_BASE_URL is not set at build time — falling back to "${fallbackBaseUrl}", which will not work in production.`,
  );
}

export const API_BASE_URL = configuredBaseUrl ?? fallbackBaseUrl;

/** Fire-and-forget ping to wake a sleeping Render free-tier instance before the user finishes typing. */
export function warmApi() {
  fetch(`${API_BASE_URL}/health`).catch(() => {});
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// Access tokens live in memory only (never localStorage) to limit XSS token
// theft blast radius. They're re-established on page load via the httpOnly
// refresh cookie (see AuthProvider's bootstrap effect).
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Registered by AuthProvider so the client can force a logout on a hard 401. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

async function rawFetch(path: string, options: RequestOptions) {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  // Let the browser set Content-Type (with multipart boundary) for FormData bodies.
  if (!isFormData) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await rawFetch("/auth/refresh", { method: "POST", skipAuthRetry: true });
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, options);
    } else {
      setAccessToken(null);
      onUnauthorized?.();
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const code = data?.error?.code ?? "UNKNOWN_ERROR";
    const message = data?.error?.message ?? "Something went wrong on our end. Please try again.";
    throw new ApiClientError(code, message, res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  /** Multipart upload — body must be a FormData instance (e.g. document uploads). */
  upload: <T>(path: string, formData: FormData) => apiFetch<T>(path, { method: "POST", body: formData }),
};
