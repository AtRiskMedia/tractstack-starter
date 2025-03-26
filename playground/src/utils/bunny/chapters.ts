import type { VideoMoment } from "@/types";

/**
 * Finds the currently active chapter based on the current playback time
 * @param chapters Array of video chapters
 * @param currentTime Current playback time in seconds
 * @returns The active chapter or null if no chapter is active
 */
export function findActiveChapter(
  chapters: VideoMoment[],
  currentTime: number
): VideoMoment | null {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return null;
  }

  // Sort chapters by startTime to ensure correct order
  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

  // Find the chapter that covers the current time
  for (const chapter of sortedChapters) {
    if (currentTime >= chapter.startTime && currentTime < chapter.endTime) {
      return chapter;
    }
  }

  return null;
}

/**
 * Gets the next chapter based on the current time
 * @param chapters Array of video chapters
 * @param currentTime Current playback time in seconds
 * @returns The next chapter or null if there is no next chapter
 */
export function getNextChapter(chapters: VideoMoment[], currentTime: number): VideoMoment | null {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return null;
  }

  // Sort chapters by startTime
  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

  // Find the next chapter
  for (const chapter of sortedChapters) {
    if (chapter.startTime > currentTime) {
      return chapter;
    }
  }

  return null; // No next chapter
}

/**
 * Gets the previous chapter based on the current time
 * @param chapters Array of video chapters
 * @param currentTime Current playback time in seconds
 * @returns The previous chapter or null if there is no previous chapter
 */
export function getPreviousChapter(
  chapters: VideoMoment[],
  currentTime: number
): VideoMoment | null {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return null;
  }

  // Sort chapters by startTime (descending for previous lookup)
  const sortedChapters = [...chapters].sort((a, b) => b.startTime - a.startTime);

  // Find the previous chapter
  for (const chapter of sortedChapters) {
    // We use a small buffer (1 second) to avoid issues with boundary conditions
    if (chapter.startTime < currentTime - 1) {
      return chapter;
    }
  }

  return null; // No previous chapter
}

/**
 * Gets the chapter at a specific index
 * @param chapters Array of video chapters
 * @param index Index of the chapter to retrieve
 * @returns The chapter at the specified index or null if index is out of bounds
 */
export function getChapterByIndex(chapters: VideoMoment[], index: number): VideoMoment | null {
  if (!Array.isArray(chapters) || index < 0 || index >= chapters.length) {
    return null;
  }

  // Sort chapters by startTime and get the one at the specified index
  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);
  return sortedChapters[index];
}

/**
 * Calculates the chapter progress as a percentage
 * @param chapter The current chapter
 * @param currentTime Current playback time in seconds
 * @returns Progress percentage (0-100)
 */
export function getChapterProgress(chapter: VideoMoment, currentTime: number): number {
  if (!chapter || typeof currentTime !== "number") {
    return 0;
  }

  const chapterDuration = chapter.endTime - chapter.startTime;
  if (chapterDuration <= 0) {
    return 0;
  }

  const elapsedTime = currentTime - chapter.startTime;
  const progress = Math.min(Math.max(0, (elapsedTime / chapterDuration) * 100), 100);

  return progress;
}

/**
 * Validates and normalizes chapter data
 * @param chapters Array of video chapters to validate
 * @returns Array of valid, normalized chapters
 */
export function normalizeChapters(chapters: any[]): VideoMoment[] {
  if (!Array.isArray(chapters)) {
    return [];
  }

  // Filter and normalize chapters
  return chapters
    .filter(
      (chapter) =>
        typeof chapter === "object" &&
        typeof chapter.startTime === "number" &&
        typeof chapter.endTime === "number" &&
        typeof chapter.title === "string" &&
        chapter.startTime < chapter.endTime
    )
    .map((chapter) => ({
      startTime: chapter.startTime,
      endTime: chapter.endTime,
      title: chapter.title,
      description: typeof chapter.description === "string" ? chapter.description : "",
      linkedPaneId: typeof chapter.linkedPaneId === "string" ? chapter.linkedPaneId : undefined,
    }))
    .sort((a, b) => a.startTime - b.startTime);
}
