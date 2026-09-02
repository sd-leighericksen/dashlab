import "server-only";
// Single serial queue shared by the watcher and the writer so indexing never races.
const g = globalThis as { __dashlabQueue?: Promise<unknown> };
g.__dashlabQueue ??= Promise.resolve();

export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = (g.__dashlabQueue as Promise<unknown>).then(fn, fn);
  g.__dashlabQueue = next.catch(() => {});
  return next;
}
