import type { VideoMoment } from "@/types";
import { formatTime, formatTimeRange } from "./timeUtils";

// UI Display mode
export enum ChapterDisplayMode {
  HIDDEN = "hidden",
  INDICATOR = "indicator",
  CHAPTER_VIEW = "chapter-view",
  CHAPTER_LIST = "chapter-list",
}

export function createChapterUI(container: HTMLElement): {
  chapterUI: HTMLElement;
  chapterIndicator: HTMLElement;
  chapterTitle: HTMLElement;
  chapterControls: HTMLElement;
  controlBar: HTMLElement;
  currentChapterTitle: HTMLElement;
  controlButtons: HTMLElement;
  contentArea: HTMLElement;
  timeDisplay: HTMLElement;
  prevButton: HTMLElement;
  nextButton: HTMLElement;
  toggleButton: HTMLElement;
  chapterList: HTMLElement;
} {
  const existingUI = container.querySelector(".bunny-chapters-ui");
  if (existingUI) {
    return {
      chapterUI: existingUI as HTMLElement,
      chapterIndicator: container.querySelector(".chapter-indicator") as HTMLElement,
      chapterTitle: container.querySelector(".chapter-title") as HTMLElement,
      chapterControls: container.querySelector(".chapter-controls") as HTMLElement,
      controlBar: container.querySelector(".control-bar") as HTMLElement,
      currentChapterTitle: container.querySelector(".current-chapter-title") as HTMLElement,
      controlButtons: container.querySelector(".control-buttons") as HTMLElement,
      contentArea: container.querySelector(".content-area") as HTMLElement,
      timeDisplay: container.querySelector(".time-display") as HTMLElement,
      prevButton: container.querySelector(".prev-button") as HTMLElement,
      nextButton: container.querySelector(".next-button") as HTMLElement,
      toggleButton: container.querySelector(".toggle-button") as HTMLElement,
      chapterList: container.querySelector(".chapter-list") as HTMLElement,
    };
  }

  const chapterUI = document.createElement("div");
  chapterUI.className = "bunny-chapters-ui";
  chapterUI.style.display = "none";

  const chapterIndicator = document.createElement("div");
  chapterIndicator.className = "chapter-indicator";

  const chapterTitle = document.createElement("span");
  chapterTitle.className = "chapter-title";
  chapterIndicator.appendChild(chapterTitle);

  const timeDisplay = document.createElement("span");
  timeDisplay.className = "time-display";
  chapterIndicator.appendChild(timeDisplay);

  const chapterControls = document.createElement("div");
  chapterControls.className = "chapter-controls";

  const controlBar = document.createElement("div");
  controlBar.className = "control-bar";

  const currentChapterTitle = document.createElement("h3");
  currentChapterTitle.className = "current-chapter-title";
  controlBar.appendChild(currentChapterTitle);

  const controlButtons = document.createElement("div");
  controlButtons.className = "control-buttons";

  const prevButton = document.createElement("button");
  prevButton.className = "prev-button";
  prevButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M10.828 12l4.95 4.95-1.414 1.414L8 12l6.364-6.364 1.414 1.414z"/></svg>';
  prevButton.setAttribute("aria-label", "Previous Chapter");
  controlButtons.appendChild(prevButton);

  const nextButton = document.createElement("button");
  nextButton.className = "next-button";
  nextButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z"/></svg>';
  nextButton.setAttribute("aria-label", "Next Chapter");
  controlButtons.appendChild(nextButton);

  const toggleButton = document.createElement("button");
  toggleButton.className = "toggle-button";
  toggleButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>';
  toggleButton.setAttribute("aria-label", "Toggle Chapter List");
  controlButtons.appendChild(toggleButton);

  controlBar.appendChild(controlButtons);
  chapterControls.appendChild(controlBar);

  const contentArea = document.createElement("div");
  contentArea.className = "content-area";

  const chapterList = document.createElement("ul");
  chapterList.className = "chapter-list";
  chapterList.style.display = "none";
  contentArea.appendChild(chapterList);

  chapterControls.appendChild(contentArea);

  chapterUI.appendChild(chapterIndicator);
  chapterUI.appendChild(chapterControls);

  container.appendChild(chapterUI);

  return {
    chapterUI,
    chapterIndicator,
    chapterTitle,
    chapterControls,
    controlBar,
    currentChapterTitle,
    controlButtons,
    contentArea,
    timeDisplay,
    prevButton,
    nextButton,
    toggleButton,
    chapterList,
  };
}

export function setChapterDisplayMode(
  ui: ReturnType<typeof createChapterUI>,
  mode: ChapterDisplayMode
): void {
  ui.chapterUI.style.display = mode === ChapterDisplayMode.HIDDEN ? "none" : "block";
  ui.chapterIndicator.style.display = "none";
  ui.chapterControls.style.display = "none";
  ui.chapterList.style.display = "none";

  switch (mode) {
    case ChapterDisplayMode.INDICATOR:
      ui.chapterIndicator.style.display = "flex";
      break;
    case ChapterDisplayMode.CHAPTER_VIEW:
      ui.chapterControls.style.display = "block";
      break;
    case ChapterDisplayMode.CHAPTER_LIST:
      ui.chapterControls.style.display = "block";
      ui.chapterList.style.display = "block";
      break;
  }
}

export function updateChapterIndicator(
  ui: ReturnType<typeof createChapterUI>,
  chapter: VideoMoment | null,
  currentTime: number
): void {
  if (!chapter) {
    ui.chapterTitle.textContent = "";
    ui.timeDisplay.textContent = "";
    return;
  }

  ui.chapterTitle.textContent = chapter.title;
  ui.timeDisplay.textContent = `${formatTime(currentTime - chapter.startTime)} / ${formatTime(chapter.endTime - chapter.startTime)}`;
}

export function updateChapterControls(
  ui: ReturnType<typeof createChapterUI>,
  chapter: VideoMoment | null
): void {
  if (!chapter) {
    ui.currentChapterTitle.textContent = "";
    ui.contentArea.innerHTML = "";
    return;
  }

  ui.currentChapterTitle.textContent = chapter.title;

  const chapterList = ui.chapterList;
  const parent = ui.contentArea;
  while (parent.firstChild && parent.firstChild !== chapterList) {
    parent.removeChild(parent.firstChild);
  }

  if (chapter.description) {
    const descElement = document.createElement("p");
    descElement.className = "chapter-description";
    descElement.textContent = chapter.description;
    parent.insertBefore(descElement, chapterList);
  }
}

export function updateChapterList(
  ui: ReturnType<typeof createChapterUI>,
  chapters: VideoMoment[],
  activeChapter: VideoMoment | null,
  onSelectChapter: (chapter: VideoMoment) => void
): void {
  ui.chapterList.innerHTML = "";

  if (!Array.isArray(chapters) || chapters.length === 0) {
    return;
  }

  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

  sortedChapters.forEach((chapter, index) => {
    const listItem = document.createElement("li");
    listItem.className = "chapter-list-item";

    if (activeChapter && chapter.startTime === activeChapter.startTime) {
      listItem.classList.add("active");
    }

    const chapterIndex = document.createElement("span");
    chapterIndex.className = "chapter-index";
    chapterIndex.textContent = (index + 1).toString();

    const chapterTitle = document.createElement("span");
    chapterTitle.className = "chapter-list-title";
    chapterTitle.textContent = chapter.title;

    const chapterTime = document.createElement("span");
    chapterTime.className = "chapter-time";
    chapterTime.textContent = formatTimeRange(chapter.startTime, chapter.endTime);

    listItem.appendChild(chapterIndex);
    listItem.appendChild(chapterTitle);
    listItem.appendChild(chapterTime);

    listItem.addEventListener("click", () => {
      onSelectChapter(chapter);
    });

    ui.chapterList.appendChild(listItem);
  });
}

export function createStandaloneChapterMenu(
  chapters: VideoMoment[],
  onSelectChapter: (chapter: VideoMoment) => void
): HTMLElement {
  const menu = document.createElement("div");
  menu.className = "bunny-chapters-standalone-menu";

  if (!Array.isArray(chapters) || chapters.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No chapters available";
    menu.appendChild(message);
    return menu;
  }

  const title = document.createElement("h3");
  title.className = "chapters-title";
  title.textContent = "Video Chapters";
  menu.appendChild(title);

  const chapterList = document.createElement("ul");
  chapterList.className = "standalone-chapter-list";

  const sortedChapters = [...chapters].sort((a, b) => a.startTime - b.startTime);

  sortedChapters.forEach((chapter, index) => {
    const listItem = document.createElement("li");
    listItem.className = "standalone-chapter-item";

    const chapterTitle = document.createElement("div");
    chapterTitle.className = "standalone-chapter-title";
    chapterTitle.textContent = `${index + 1}. ${chapter.title}`;

    const chapterTime = document.createElement("div");
    chapterTime.className = "standalone-chapter-time";
    chapterTime.textContent = formatTime(chapter.startTime);

    listItem.appendChild(chapterTitle);
    listItem.appendChild(chapterTime);

    listItem.addEventListener("click", () => {
      onSelectChapter(chapter);
      const items = chapterList.querySelectorAll(".standalone-chapter-item");
      items.forEach((item) => item.classList.remove("active"));
      listItem.classList.add("active");
    });

    chapterList.appendChild(listItem);
  });

  menu.appendChild(chapterList);

  return menu;
}

export function applyChapterStyles(): void {
  let styleEl = document.getElementById("bunny-chapters-styles");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "bunny-chapters-styles";
    document.head.appendChild(styleEl);
  }

  const styles = `
    .bunny-chapters-ui {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      color: #333;
      margin-top: 1rem;
    }
    
    .chapter-indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.05);
      padding: 0.5rem 1rem;
      border-left: 3px solid #0066cc;
      margin-bottom: 0.5rem;
    }
    
    .chapter-title {
      font-weight: 600;
      flex-grow: 1;
    }
    
    .time-display {
      font-size: 0.875rem;
      color: #666;
    }
    
    .chapter-controls {
      background: #f8f9fa;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    
    .control-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #fff;
      border-bottom: 1px solid #eee;
    }
    
    .current-chapter-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .control-buttons {
      display: flex;
      gap: 0.5rem;
    }
    
    .control-buttons button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .control-buttons button:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    
    .control-buttons svg {
      width: 20px;
      height: 20px;
      fill: #333;
    }
    
    .content-area {
      padding: 1rem;
    }
    
    .chapter-description {
      margin: 0 0 1rem 0;
      line-height: 1.5;
      color: #555;
    }
    
    .chapter-list {
      list-style: none;
      padding: 0;
      margin: 0;
      border-top: 1px solid #eee;
    }
    
    .chapter-list-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    
    .chapter-list-item:hover {
      background: rgba(0, 0, 0, 0.02);
    }
    
    .chapter-list-item.active {
      background: rgba(0, 102, 204, 0.05);
      border-left: 3px solid #0066cc;
    }
    
    .chapter-index {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #eee;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      margin-right: 0.75rem;
      font-weight: 600;
    }
    
    .chapter-list-title {
      flex-grow: 1;
      font-weight: 500;
    }
    
    .chapter-time {
      color: #666;
      font-size: 0.875rem;
    }
    
    .bunny-chapters-standalone-menu {
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      max-width: 100%;
    }
    
    .chapters-title {
      margin: 0;
      padding: 1rem;
      font-size: 1.2rem;
      font-weight: 600;
      border-bottom: 1px solid #eee;
    }
    
    .standalone-chapter-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .standalone-chapter-item {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    
    .standalone-chapter-item:hover {
      background: rgba(0, 0, 0, 0.02);
    }
    
    .standalone-chapter-item.active {
      background: rgba(0, 102, 204, 0.05);
      border-left: 3px solid #0066cc;
    }
    
    .standalone-chapter-title {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .standalone-chapter-time {
      color: #666;
      font-size: 0.875rem;
    }
    
    @media (max-width: 640px) {
      .control-bar {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .control-buttons {
        margin-top: 0.5rem;
      }
    }
  `;

  styleEl.textContent = styles;
}
