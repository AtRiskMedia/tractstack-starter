import type { BunnyPlayer } from "@/types";
import type { VideoMoment } from "@/types";
import { findActiveChapter, getNextChapter, getPreviousChapter } from "./chapters";

/**
 * Seeks the player to a specific time
 * @param player Bunny player instance
 * @param time Time in seconds to seek to
 * @returns Promise that resolves when the seek operation is complete
 */
export function seekToTime(player: BunnyPlayer, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (!player) {
      resolve();
      return;
    }

    try {
      // Set the current time
      player.setCurrentTime(time);

      // Wait a moment for the seek to complete
      setTimeout(() => {
        resolve();
      }, 100);
    } catch (error) {
      console.error("Error seeking to time:", error);
      resolve();
    }
  });
}

/**
 * Seeks the player to a specific chapter
 * @param player Bunny player instance
 * @param chapter Chapter to seek to
 * @returns Promise that resolves when the seek operation is complete
 */
export function seekToChapter(player: BunnyPlayer, chapter: VideoMoment): Promise<void> {
  if (!player || !chapter) {
    return Promise.resolve();
  }

  return seekToTime(player, chapter.startTime);
}

/**
 * Navigates to the next chapter
 * @param player Bunny player instance
 * @param chapters Array of video chapters
 * @param currentTime Current playback time
 * @returns Promise that resolves when navigation is complete
 */
export async function goToNextChapter(
  player: BunnyPlayer,
  chapters: VideoMoment[],
  currentTime: number
): Promise<VideoMoment | null> {
  const nextChapter = getNextChapter(chapters, currentTime);

  if (!nextChapter) {
    return null;
  }

  await seekToChapter(player, nextChapter);
  return nextChapter;
}

/**
 * Navigates to the previous chapter
 * @param player Bunny player instance
 * @param chapters Array of video chapters
 * @param currentTime Current playback time
 * @returns Promise that resolves when navigation is complete
 */
export async function goToPreviousChapter(
  player: BunnyPlayer,
  chapters: VideoMoment[],
  currentTime: number
): Promise<VideoMoment | null> {
  const prevChapter = getPreviousChapter(chapters, currentTime);

  if (!prevChapter) {
    return Promise.resolve(null);
  }

  return seekToChapter(player, prevChapter).then(() => prevChapter);
}

/**
 * Navigates to a specific chapter by index
 * @param player Bunny player instance
 * @param chapters Array of video chapters
 * @param index Index of the chapter to navigate to
 * @returns Promise that resolves when navigation is complete
 */
export async function goToChapterByIndex(
  player: BunnyPlayer,
  chapters: VideoMoment[],
  index: number
): Promise<VideoMoment | null> {
  if (!Array.isArray(chapters) || index < 0 || index >= chapters.length) {
    return Promise.resolve(null);
  }

  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);
  const chapter = sortedChapters[index];

  if (!chapter) {
    return Promise.resolve(null);
  }

  return seekToChapter(player, chapter).then(() => chapter);
}

/**
 * Gets the current time from the player
 * @param player Bunny player instance
 * @returns Promise that resolves with the current time in seconds
 */
export function getCurrentTime(player: BunnyPlayer): Promise<number> {
  return new Promise((resolve) => {
    if (!player) {
      resolve(0);
      return;
    }

    try {
      player.getCurrentTime((time) => {
        resolve(time);
      });
    } catch (error) {
      console.error("Error getting current time:", error);
      resolve(0);
    }
  });
}

/**
 * Watches the player for time updates and executes a callback
 * @param player Bunny player instance
 * @param callback Function to call with the current time and active chapter
 * @param chapters Array of video chapters
 * @param intervalMs Update interval in milliseconds (default: 250ms)
 * @returns Function to stop watching
 */
export function watchPlayerTime(
  player: BunnyPlayer,
  callback: (time: number, activeChapter: VideoMoment | null) => void,
  chapters: VideoMoment[],
  intervalMs: number = 250
): () => void {
  if (!player || typeof callback !== "function") {
    return () => {}; // No-op cleanup function
  }

  const interval = setInterval(() => {
    getCurrentTime(player).then((time) => {
      const activeChapter = findActiveChapter(chapters, time);
      callback(time, activeChapter);
    });
  }, intervalMs);

  // Return a cleanup function
  return () => {
    clearInterval(interval);
  };
}

/**
 * Sets up keyboard navigation for chapters
 * @param player Bunny player instance
 * @param chapters Array of video chapters
 * @returns Function to remove keyboard listeners
 */
export function setupKeyboardNavigation(player: BunnyPlayer, chapters: VideoMoment[]): () => void {
  if (!player || !Array.isArray(chapters) || chapters.length === 0) {
    return () => {}; // No-op cleanup function
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    // Only handle if the player or its container is focused
    if (!document.activeElement?.closest("[data-player-container]")) {
      return;
    }

    getCurrentTime(player).then((time) => {
      switch (event.key) {
        case "ArrowRight":
          if (event.ctrlKey || event.metaKey) {
            // Navigate to next chapter with Ctrl/Cmd + Right Arrow
            goToNextChapter(player, chapters, time);
            event.preventDefault();
          }
          break;

        case "ArrowLeft":
          if (event.ctrlKey || event.metaKey) {
            // Navigate to previous chapter with Ctrl/Cmd + Left Arrow
            goToPreviousChapter(player, chapters, time);
            event.preventDefault();
          }
          break;
      }
    });
  };

  document.addEventListener("keydown", handleKeyDown);

  // Return a cleanup function
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}
