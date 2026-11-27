function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function logEvent(fn: string, event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ fn, event, ...data, ts: new Date().toISOString() }));
}

export function logError(
  fn: string,
  event: string,
  err: unknown,
  data: Record<string, unknown> = {}
): void {
  console.error(
    JSON.stringify({ fn, event, error: toErrorMessage(err), ...data, ts: new Date().toISOString() })
  );
}
