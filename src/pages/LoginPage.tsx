import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api";
import { useAuthStore, useIsAuthenticated } from "@/stores/authStore";

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as LocationState | null)?.from?.pathname ?? "/";

  // Already logged in (e.g. navigated to /login manually) → bounce to the app.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — the product's first impression. Hidden on small screens. */}
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-[oklch(1_0_0/0.12)] blur-3xl"
        />
        <span className="relative text-xl font-bold tracking-tight">Staffly</span>
        <div className="relative max-w-md space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            The HR platform for borderless teams.
          </h2>
          <p className="text-primary-foreground/80">
            Manage people, contracts, and time off across every entity — in one
            place.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Staffly
        </p>
      </div>

      {/* Sign-in form */}
      <div className="flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight lg:hidden">Staffly</h1>
          <h1 className="hidden text-2xl font-bold tracking-tight lg:block">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={submitting}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              aria-invalid={Boolean(error)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
      </div>
    </div>
  );
}
