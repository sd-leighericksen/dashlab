import "server-only";
import { EventEmitter } from "node:events";
import type { ContentKindT } from "@/lib/content/kinds";

export type DashlabEvents = {
  "content:changed": [{ kind: ContentKindT; slug: string; path: string; valid: boolean }];
  "content:removed": [{ kind: ContentKindT; slug: string; path: string }];
  "index:rescan": [{ count: number }];
  "probe:update": [{ kind: ContentKindT; slug: string }];
};

class TypedBus extends EventEmitter {
  emitEvent<K extends keyof DashlabEvents>(
    event: K,
    ...args: DashlabEvents[K]
  ): void {
    this.emit(event as string, ...args);
  }
  onEvent<K extends keyof DashlabEvents>(
    event: K,
    listener: (...args: DashlabEvents[K]) => void,
  ): void {
    this.on(event as string, listener as (...a: unknown[]) => void);
  }
}

const g = globalThis as { __dashlabBus?: TypedBus };
export const bus: TypedBus = g.__dashlabBus ?? new TypedBus();
bus.setMaxListeners(50);
g.__dashlabBus = bus;
