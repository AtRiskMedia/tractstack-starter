import { type BunnyPlayer, hasPlayerJS } from "@/types";

export function getBunnyPlayer(elementId: string): BunnyPlayer | null {
  if (!hasPlayerJS(window)) {
    console.error("Bunny player.js is not loaded");
    return null;
  }

  try {
    return new window.playerjs.Player(elementId);
  } catch (err) {
    console.error("Error creating Bunny player:", err);
    return null;
  }
}
