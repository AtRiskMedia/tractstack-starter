import { persistentAtom } from "@nanostores/persistent";
import type { BeliefStore } from "../types";

export const heldBeliefs = persistentAtom<BeliefStore[]>("user", [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
