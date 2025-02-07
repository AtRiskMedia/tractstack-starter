import { CONCIERGE_SYNC_INTERVAL } from "@/constants";
import { events } from "@/store/events";
import { eventSync } from "./eventSync";
import { auth } from "@/store/auth";
import type { AuthSettings } from "@/store/auth";

let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function eventStream() {
  async function init() {
    try {
      const payload = events.get();
      if (payload.length) {
        const result = await eventSync(payload);
        if (!result) {
          console.log(`sync failed; events dropped and session logged out`);
          // Clear events store on sync failure
          events.set([]);
          // Clear auth settings as well since sync failed
          Object.keys(auth.get()).forEach((key) => {
            auth.setKey(key as keyof AuthSettings, undefined);
          });
        } else {
          // Only clear events if sync was successful
          events.set([]);
        }
      }
    } catch (e) {
      console.log(`error establishing concierge eventStream`, e);
      // Clear auth settings on connection error
      Object.keys(auth.get()).forEach((key) => {
        auth.setKey(key as keyof AuthSettings, undefined);
      });
    } finally {
      timeoutId = setTimeout(init, CONCIERGE_SYNC_INTERVAL);
    }
  }

  if (!timeoutId) {
    timeoutId = setTimeout(init, CONCIERGE_SYNC_INTERVAL);
  }

  return {
    stop: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
