import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { loginRequest } from "@/apis/auth"
import { type User } from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  /** Authenticate and store the token + user. Throws on failure. */
  login: (email: string, password: string) => Promise<void>
  /** Clear the session. Called on sign-out and on any 401 from the API. */
  logout: () => void
}

/**
 * Auth state lives here. Persisted to sessionStorage, so the token survives a
 * refresh within the tab but is cleared when the tab closes. There is no
 * refresh-token flow — an expired token (default 1 day) surfaces as a 401,
 * which the API response interceptor turns into a logout.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const { accessToken, user } = await loginRequest(email, password)
        set({ token: accessToken, user })
      },
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "staffly.auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

/** Convenience selector: whether a session token is present. */
export const useIsAuthenticated = () => useAuthStore((s) => Boolean(s.token))
