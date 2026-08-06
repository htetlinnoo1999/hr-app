/**
 * Theme (light/dark) resolution and application.
 *
 * The app supports three modes: an explicit "light"/"dark", or "system" which
 * follows the OS preference. The dark palette is driven by a `.dark` class on
 * <html> (see index.css's `@custom-variant dark`), so applying a theme is just
 * toggling that class. The chosen mode is persisted via the UI store; a small
 * inline script in index.html applies it before first paint to avoid a flash.
 */

export type Theme = "light" | "dark" | "system";

export const THEME_VALUES: Theme[] = ["light", "dark", "system"];

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The OS-level preference, used when the mode is "system". */
export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(DARK_QUERY).matches
  );
}

/** Resolve a mode to the concrete light/dark it should render as. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/** Toggle the `.dark` class on <html> to match the given mode. */
export function applyTheme(theme: Theme): void {
  const isDark = resolveTheme(theme) === "dark";
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * Watch the OS preference and re-apply while the mode is "system". Returns an
 * unsubscribe function. `getTheme` is read live so it always sees the current
 * mode.
 */
export function watchSystemTheme(getTheme: () => Theme): () => void {
  const mql = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (getTheme() === "system") applyTheme("system");
  };
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
