export type Callback<T> = (payload?: T) => void;

export class NotificationSystem<T> {
  private subscriptions: Map<string, Set<Callback<T>>> = new Map();

  /**
   * Subscribe to a specific key
   * @param key - The key to listen for updates
   * @param callback - The callback to invoke on updates
   * @returns Unsubscribe function
   */
  subscribe(key: string, callback: Callback<T>): () => void {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback);

    return () => {
      this.subscriptions.get(key)?.delete(callback);
      if (this.subscriptions.get(key)?.size === 0) {
        this.subscriptions.delete(key);
      }
    };
  }

  clear(): void {
    this.subscriptions.clear();
  }

  /**
   * Notify subscribers for a specific key with a payload
   * @param key - The key to notify about
   * @param payload - The payload to send to subscribers
   */
  notify(key: string, payload?: T): void {
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      subscribers.forEach((callback) => callback(payload));
    }
  }
}