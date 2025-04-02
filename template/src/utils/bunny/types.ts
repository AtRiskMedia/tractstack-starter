import type { VideoMoment, BunnyPlayer } from "@/types";

/**
 * Chapter player configuration options
 */
export interface ChapterPlayerConfig {
  /** Enable or disable chapter features */
  enableChapters: boolean;

  /** How long the indicator shows after chapter change (ms) */
  indicatorDuration: number;

  /** Auto-hide controls after this duration (ms), 0 to disable */
  autoHideDuration: number;

  /** Show standalone chapter menu outside the player */
  showStandaloneMenu: boolean;

  /** Element ID to place the standalone menu, defaults to after the player */
  standaloneMenuTarget?: string;

  /** Default UI mode when chapters are active */
  defaultMode: "indicator" | "controls" | "list" | "none";

  /** Whether to show chapter indicators during playback */
  showIndicatorsDuringPlayback: boolean;

  /** Whether to persist UI state in localStorage */
  persistUserPreferences: boolean;

  /** Whether to show chapter progress */
  showProgress: boolean;
}

/**
 * Chapter player state
 */
export interface ChapterPlayerState {
  /** Currently active chapter */
  activeChapter: VideoMoment | null;

  /** Current playback time in seconds */
  currentTime: number;

  /** Whether the player is currently playing */
  isPlaying: boolean;

  /** Total video duration in seconds */
  duration: number;

  /** Chapter display mode */
  displayMode: "hidden" | "indicator" | "chapter-view" | "chapter-list";

  /** Whether the chapter list is open */
  isChapterListOpen: boolean;
}

/**
 * Chapter player event handlers
 */
export interface ChapterPlayerEvents {
  /** Called when a chapter becomes active */
  onChapterChange?: (chapter: VideoMoment | null) => void;

  /** Called when the user selects a chapter from the list */
  onChapterSelect?: (chapter: VideoMoment) => void;

  /** Called when the player time updates */
  onTimeUpdate?: (time: number) => void;

  /** Called when the display mode changes */
  onDisplayModeChange?: (mode: string) => void;
}

/**
 * Chapter player controller interface
 */
export interface ChapterPlayerController {
  /** Initialize the chapter player */
  initialize: () => Promise<void>;

  /** Go to the next chapter */
  nextChapter: () => Promise<VideoMoment | null>;

  /** Go to the previous chapter */
  previousChapter: () => Promise<VideoMoment | null>;

  /** Go to a specific chapter */
  goToChapter: (chapter: VideoMoment) => Promise<void>;

  /** Update the chapter list */
  updateChapterList: () => void;

  /** Set the display mode */
  setDisplayMode: (mode: string) => void;

  /** Toggle the chapter list */
  toggleChapterList: () => void;

  /** Get the current state */
  getState: () => ChapterPlayerState;

  /** Clean up all resources */
  destroy: () => void;
}

/**
 * Chapter player factory parameters
 */
export interface ChapterPlayerParams {
  /** Bunny player instance */
  player: BunnyPlayer;

  /** Video chapters */
  chapters: VideoMoment[];

  /** Container element for chapter UI */
  container: HTMLElement;

  /** Configuration options */
  config?: Partial<ChapterPlayerConfig>;

  /** Event handlers */
  events?: ChapterPlayerEvents;
}
