import { events, panesVisible, current } from "../../store/events";
import { THRESHOLD_READ, THRESHOLD_GLOSSED } from "../../constants";

export async function eventProcessQueue() {
  const panes = panesVisible.get();
  Object.keys(panes).forEach((id: string) => {
    const value = panes[id];
    if (value) {
      const diff = Date.now() - value;
      panesVisible.setKey(id, null);
      const verb = diff > THRESHOLD_READ ? `READ` : diff > THRESHOLD_GLOSSED ? `GLOSSED` : null;
      if (verb) {
        const event = {
          id: id,
          parentId: current.get().id || undefined,
          type: `Pane`,
          verb: verb,
          duration: diff,
        };
        //console.log(`=force-event`, event);
        events.set([...events.get(), event]);
      }
    }
  });
  return true;
}
