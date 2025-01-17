import InView from "@opuu/inview";
import type { InViewEvent } from "@opuu/inview";
import { events, current, panesVisible } from "../../store/events";
import { THRESHOLD_READ, THRESHOLD_GLOSSED } from "../../constants";

export function inView() {
  const elements = new InView({
    selector: ".pane",
    delay: 100,
    single: false,
  });

  elements.on("enter", (event: InViewEvent) => {
    const id = event.target.id.substring(5);
    if (!panesVisible.get()[id]) panesVisible.setKey(id, Date.now());
  });

  elements.on("exit", (event: InViewEvent) => {
    const id = event.target.id.substring(5);
    const values = panesVisible.get();
    const value = values[id];
    if (value) {
      const diff = Date.now() - value;
      panesVisible.setKey(id, null);
      const verb = diff > THRESHOLD_READ ? `READ` : diff > THRESHOLD_GLOSSED ? `GLOSSED` : null;
      if (verb) {
        const event = {
          id: id,
          type: `Pane`,
          verb: verb,
          duration: diff / 1000,
        };
        events.set([...events.get(), event]);
      }
    }
  });
  return true;
}
