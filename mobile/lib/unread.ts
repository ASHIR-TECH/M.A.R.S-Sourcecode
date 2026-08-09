type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

/**
 * Tiny module-level store for the Chat tab's unread count. The chat screen
 * increments it when a new agent response arrives while the tab is not
 * focused; the tab bar reads it via useSyncExternalStore.
 */
export const unread = {
  get: (): number => count,
  set: (n: number): void => {
    count = Math.max(0, n);
    for (const listener of listeners) listener(count);
  },
  increment: (): void => unread.set(count + 1),
  clear: (): void => unread.set(0),
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
