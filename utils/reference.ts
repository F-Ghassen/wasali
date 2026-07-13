/**
 * utils/reference.ts
 *
 * Human-readable short references derived deterministically from a UUID.
 * One source of truth for the `WSL-XXXXXX` scheme used across bookings and
 * routes — no stored column, no collision handling (display-only).
 */

/** `WSL-XXXXXX` from the first 6 hex chars of a UUID, uppercased. */
export function shortRef(id: string): string {
  return `WSL-${id.slice(0, 6).toUpperCase()}`;
}

/** Human-readable Trip ID for a route. Alias of {@link shortRef} for clarity at call sites. */
export function tripId(routeId: string): string {
  return shortRef(routeId);
}
