import { atom } from "nanostores";
import { NIL } from "uuid";
import { populateAllWordsSelection } from "./appState";
import { ChapterGistType, overrideChapterGist } from "./transcribeStore";
import { type StoryChapterOverrides, type StoryData, StoryStatus } from "@/types.ts";

export const $activeStoryUuid = atom<string>(NIL);

export const $stories = atom<Map<string, StoryData>>(new Map<string, StoryData>());

export const createEmptyStory = (transcriptId: string, uuid: string): StoryData => {
  return {
    transcriptId,
    title: "",
    uuid,
    wordsSelection: {},
    chaptersOverrides: new Map<number, StoryChapterOverrides>(),
    status: StoryStatus.None,
  };
};

export const addStory = (transcriptId: string, uuid: string, title: string) => {
  $stories.get().set(uuid, {
    transcriptId,
    uuid,
    title,
    status: StoryStatus.Draft,
    chaptersOverrides: new Map(),
    wordsSelection: {},
  });
};

export const setStory = (transcriptId: string, uuid: string, story: StoryData) => {
  if (!$stories.get().has(uuid)) {
    addStory(transcriptId, uuid, "New Story");
  }
  $stories.get().set(uuid, story);
};

export const getActiveStory = (): StoryData | undefined => {
  if ($stories.get() && $activeStoryUuid.get()) {
    return $stories.get().get($activeStoryUuid.get());
  }
  return undefined;
};

export const deleteStory = (uuid: string) => {
  $stories.get().delete(uuid);
};

export const applyStoryData = (transcriptId: string, uuid: string, storyData: StoryData) => {
  let returnData = storyData;
  if (storyData) {
    populateAllWordsSelection(storyData);
    if (!(storyData.chaptersOverrides instanceof Map)) {
      storyData.chaptersOverrides = new Map();
    }
    for (const [key, value] of storyData.chaptersOverrides) {
      if (value.gist) {
        overrideChapterGist(key, value.gist, ChapterGistType.STORY_OVERRIDE);
      }
    }
  } else {
    returnData = createEmptyStory(transcriptId, uuid);
  }
  setStory(transcriptId, uuid, storyData);
  return returnData;
};

export const overrideStoryChapterGist = (chapterIdx: number, gist: string) => {
  const story = getActiveStory();
  if (!story) {
    console.error("story is undefined in override story chapter gist");
    return;
  }

  if (gist?.length > 0) {
    const chapterOverride = story.chaptersOverrides.get(chapterIdx);
    const data = { ...(chapterOverride || <StoryChapterOverrides>{}) };
    data.gist = gist;
    story.chaptersOverrides.set(chapterIdx, data);
    overrideChapterGist(chapterIdx, gist, ChapterGistType.STORY_OVERRIDE);
  } else {
    story.chaptersOverrides.delete(chapterIdx);
    // pass empty gist to remove the story override
    overrideChapterGist(chapterIdx, "", ChapterGistType.STORY_OVERRIDE);
  }
  recordStoryChange({ chaptersOverrides: story.chaptersOverrides });
};

export const recordStoryChange = (data: Partial<StoryData>) => {
  const storiesMap = $stories.get();
  const uuid = $activeStoryUuid.get();
  if (storiesMap) {
    const tmpStories = new Map<string, StoryData>(storiesMap);
    const story = { ...tmpStories.get(uuid) };
    if (story) {
      Object.assign(story, data);
      // @ts-expect-error assignment works, check later
      tmpStories.set(uuid, story);
      $stories.set(tmpStories);
    }
  }
};
