import { useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
  toggle: (key: K) => void;
}

/**
 * Column-sort state: click the active column to flip direction, another to
 * switch (resetting to ascending).
 */
export function useSort<K extends string>(
  initialKey: K,
  initialDir: SortDir = "asc",
): SortState<K> {
  const [key, setKey] = useState<K>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);

  function toggle(next: K) {
    if (next === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setKey(next);
      setDir("asc");
    }
  }

  return { key, dir, toggle };
}

/** Generic comparator for string | number | null/undefined values. */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
