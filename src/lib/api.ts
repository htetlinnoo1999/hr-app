import axios from "axios";

import type { Role } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";

export type { Role };

/**
 * Base URL of the Staffly backend.
 *
 * Configurable via VITE_API_BASE_URL (see .env). The `/api` prefix is
 * docs-only — the real endpoints live at the root (e.g. POST /auth/login),
 * so nothing is appended here.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
}

// --- pagination -----------------------------------------------------------
// The list endpoints (GET /organizations, /employees, /departments,
// /leave-requests) return a paginated envelope rather than a bare array.

/** Envelope every paginated list endpoint returns. `page` is 1-based. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Query params shared by every paginated list endpoint. `page` is 1-based. */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Default page size for the list pages when none is specified. */
export const DEFAULT_PAGE_SIZE = 20;

/** Build the `page`/`limit` query object, omitting anything unset. */
export function paginationQuery(
  params: PaginationParams,
): Record<string, number> {
  const query: Record<string, number> = {};
  if (params.page != null) query.page = params.page;
  if (params.limit != null) query.limit = params.limit;
  return query;
}

/**
 * Fetch every page of a paginated endpoint and concatenate the rows. Used for
 * dropdowns and name-lookup maps that need the full set rather than one page.
 * Relies on the server-reported `limit`, so it is robust to a server-side
 * page-size cap (it will simply make more requests).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage(1);
  const limit = first.limit || first.data.length || 1;
  const pageCount = Math.max(1, Math.ceil(first.total / limit));
  if (pageCount <= 1) return first.data;
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) => fetchPage(i + 2)),
  );
  return [first.data, ...rest.map((p) => p.data)].flat();
}

/** Shared axios instance — all API calls should go through this. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach the bearer token from the auth store. Every
// endpoint except POST /auth/login requires it.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: a 401 means the token is missing/expired (no refresh
// flow exists), so clear auth and let the app redirect to /login. The login
// request itself is exempt — a bad-credentials 401 there is not a session
// expiry.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const url = axios.isAxiosError(error) ? (error.config?.url ?? "") : "";
    if (status === 401 && !url.includes("/auth/login")) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable message from an axios/API error. */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Unable to reach the server. Please try again.";
    }
    const data = error.response.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (typeof data?.message === "string") return data.message;
    return error.response.statusText || fallback;
  }
  return fallback;
}
