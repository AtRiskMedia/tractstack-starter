import type { EventStream } from "../store/events.ts";

export const processEvents = (eventStream: EventStream[]) => {
  console.log(eventStream);
  return true;
};
