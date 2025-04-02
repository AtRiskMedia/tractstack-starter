/**
 * Formats seconds into MM:SS display format
 * @param seconds Time in seconds
 * @returns Formatted time string (MM:SS)
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Formats seconds into HH:MM:SS display format for longer videos
 * @param seconds Time in seconds
 * @returns Formatted time string (HH:MM:SS or MM:SS if hours is 0)
 */
export function formatLongTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else {
    return formatTime(seconds);
  }
}

/**
 * Parses a timestamp string in various formats to seconds
 * @param timestamp Timestamp string (e.g., "1:30", "01:30", "1m30s", "90s", "90")
 * @returns Time in seconds or 0 if invalid
 */
export function parseTimestamp(timestamp: string): number {
  if (!timestamp || typeof timestamp !== "string") {
    return 0;
  }

  // Try MM:SS or HH:MM:SS format
  if (timestamp.includes(":")) {
    const parts = timestamp.split(":").map((part) => parseInt(part, 10));

    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }

  // Try 1m30s format
  const minutesMatch = timestamp.match(/(\d+)m/);
  const secondsMatch = timestamp.match(/(\d+)s/);

  let totalSeconds = 0;
  if (minutesMatch && minutesMatch[1]) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }
  if (secondsMatch && secondsMatch[1]) {
    totalSeconds += parseInt(secondsMatch[1], 10);
  }

  if (totalSeconds > 0) {
    return totalSeconds;
  }

  // Just try parsing as raw seconds
  const rawSeconds = parseInt(timestamp, 10);
  return !isNaN(rawSeconds) ? rawSeconds : 0;
}

/**
 * Calculates the percentage of progress based on current time and total duration
 * @param currentTime Current playback time in seconds
 * @param duration Total duration in seconds
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, (currentTime / duration) * 100), 100);
}

/**
 * Converts a percentage to seconds based on total duration
 * @param percentage Progress percentage (0-100)
 * @param duration Total duration in seconds
 * @returns Time in seconds
 */
export function percentageToSeconds(percentage: number, duration: number): number {
  if (!Number.isFinite(percentage) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return (percentage / 100) * duration;
}

/**
 * Formats a time range (start-end)
 * @param startTime Start time in seconds
 * @param endTime End time in seconds
 * @returns Formatted time range (MM:SS-MM:SS)
 */
export function formatTimeRange(startTime: number, endTime: number): string {
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
}
