/**
 * A minimal, recording stand-in for the Supabase query builder. Each terminal
 * call (awaited chain, `single`, `maybeSingle`, `rpc`) consumes the next queued
 * result for its table, or resolves `{ data: null, error: null }` when none is queued.
 */

export interface FakeCall {
  table: string;
  op: string;
  args: unknown[];
}

interface FakeResult {
  data?: unknown;
  error?: unknown;
}

export const calls: FakeCall[] = [];
const queue = new Map<string, FakeResult[]>();

export function queueResult(table: string, result: FakeResult): void {
  const list = queue.get(table) ?? [];
  list.push(result);
  queue.set(table, list);
}

export function reset(): void {
  calls.length = 0;
  queue.clear();
}

export function callsFor(table: string): FakeCall[] {
  return calls.filter((c) => c.table === table);
}

function next(key: string): Promise<FakeResult> {
  const result = queue.get(key)?.shift() ?? { data: null, error: null };
  return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
}

const CHAIN_OPS = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order', 'limit'] as const;

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  for (const op of CHAIN_OPS) {
    chain[op] = (...args: unknown[]) => {
      calls.push({ table, op, args });
      return chain;
    };
  }
  chain.single = () => {
    calls.push({ table, op: 'single', args: [] });
    return next(table);
  };
  chain.maybeSingle = () => {
    calls.push({ table, op: 'maybeSingle', args: [] });
    return next(table);
  };
  // Awaiting the chain itself (e.g. after `delete().eq()`) is a terminal call.
  chain.then = (resolve: (v: FakeResult) => unknown, reject?: (e: unknown) => unknown) =>
    next(table).then(resolve, reject);
  return chain;
}

export const fakeClient = {
  from: (table: string) => builder(table),
  rpc: (name: string, args: Record<string, unknown>) => {
    calls.push({ table: `rpc:${name}`, op: 'rpc', args: [args] });
    return next(`rpc:${name}`);
  },
};
