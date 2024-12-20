import type { ParagraphsResponse, SentencesResponse, Transcript, TranscriptWord } from "assemblyai";
import TreeMap from "ts-treemap";
import { stripSpecialCharsEnd } from "@/utils/transcribe/utils.ts";

export interface Chapter {
  transcriptId: string;
  index: number;
  start: number;
  end: number;
  gist: string,
  overrideGist: string;
  storyGist: string;
  excluded: boolean;
  sentencesSet: Set<string>;
  rawSentences: Sentence[];
  words: Set<string>;
  rawWords: Word[];
  wordsMap: Map<string, number[]>;

  getGist(): string; // => overrideGist || gist;
}

export interface Word {
  transcriptId: string;
  text: string;
  overrideText: string;
  chapter: number;
  start: number;
  end: number;
  excluded: boolean;
  globalIndex: number,

  getText(): string; // => overrideText || text;
}

export interface Sentence {
  transcriptId: string;
  text: string;
  chapterIdx: number;
  start: number;
  end: number;
  rawWords: TranscriptWord[],
  wordsMap: Map<string, number[]>;
}

export interface TractStackTranscript {
  id: string;
  slug: string;
  title: string;
  text: string;
  chapters: number;
  duration: number;
}

export interface Paragraph {
  transcriptId: string;
  start: number;
  end: number;
}

export interface Highlight {
  transcriptId: string;
  text: string;
  timestamps: {
    start: number,
    end: number,
  }[];
  excluded: boolean;
}

export interface Selection {
  transcriptId: string;
  text: string;
  mode: string;
  chapter: number;
  start: number;
  end: number;
}

export interface ConvertedTranscript {
  chapters: Chapter[];
  words: Word[];
  sentences: Sentence[];
  transcript: TractStackTranscript;
  paragraphs: Paragraph[];
  highlights: Highlight[];
  selections: Selection[];
}

export const ConvertedTranscript_NULL: ConvertedTranscript = {
  selections: [],
  words: [],
  sentences: [],
  transcript: {duration: 0, title: "", text: "", id: "", slug: "", chapters: 0},
  paragraphs: [],
  highlights: [],
  chapters: [],
}

const buildChapters = (t: Transcript, s: SentencesResponse): {chapters: Chapter[], chaptersMap: TreeMap<number, Chapter>, words: Word[]} => {
  const chapters: Chapter[] = [];
  const chaptersMap: TreeMap<number, Chapter> = new TreeMap<number, Chapter>();
  const allWords: Word[] = [];
  let globalWordIdx = 0;
  if (t.chapters) {
    for (let i = 0; i < t.chapters.length; i++) {
      const x = t.chapters[i];

      // parse sentences lowercase
      const sentencesStrings = [];
      const sentences = [];
      for(let i = 0; i < s.sentences.length; ++i) {
        if(s.sentences[i].start >= x.start && s.sentences[i].end <= x.end) {
          sentencesStrings.push(s.sentences[i].text.toLowerCase());
          sentences.push(s.sentences[i]);
        }
      }

      // parse words with no special characters and lowercase
      const wordsStrSet = new Set<string>();
      const wordsArr: Word[] = [];
      for(let j = 0; j < sentences.length; j++) {
        const words = sentences[j].words;
        for (let k = 0; k < words.length; k++) {
          const wordStr = words[k].text;
          if(wordStr.length === 0)
            continue;

          const word: Word = {
            text: wordStr,
            start: words[k].start,
            end: words[k].end,
            excluded: false,
            chapter: i,
            transcriptId: t.id,
            overrideText: "",
            globalIndex: globalWordIdx,
            getText(): string {return this.overrideText || this.text},
          };

          ++globalWordIdx;
          allWords.push(word);
          wordsArr.push(word);
          const w = stripSpecialCharsEnd(word.getText().toLowerCase())
          if (w.length > 0 && !wordsStrSet.has(w)) {
            wordsStrSet.add(w);
          }
        }
      }

      const chapter = {
        gist: x.gist,
        overrideGist: "",
        storyGist: "",
        transcriptId: t.id,
        index: i,
        start: x.start,
        end: x.end,
        excluded: false,
        sentencesSet: new Set<string>(sentencesStrings),
        rawSentences: [],
        words: wordsStrSet,
        rawWords: wordsArr,
        wordsMap: new Map<string, number[]>,

        getGist(): string {return this.storyGist || this.overrideGist || this.gist},
      };
      chapters.push(chapter);
    }

    for (let i = 0; i < chapters.length; i++) {
      chaptersMap.set(chapters[i].start, chapters[i]);
    }
  }
  return {chapters, chaptersMap, words: allWords};
}

const buildSentences = (sentencesResponse: SentencesResponse, lookup: TreeMap<number, Chapter>): Sentence[] => {
  const sentences: Sentence[] = [];
  if (sentencesResponse !== undefined) {
    const sentencesList = sentencesResponse.sentences;
    for (let i = 0; i < sentencesList.length; ++i) {
      const sentence = sentencesList[i];
      const chapter = lookup.get(<number>lookup.floorKey(sentence.start));

      const wordsMap = new Map<string, number[]>();
      for(let j = 0; j < sentence.words.length; j++) {
        const words = sentence.words;
        for (let k = 0; k < words.length; k++) {
          const word = words[k].text;
          const start = words[k].start;
          if(word.length === 0)
            continue;
          const w = stripSpecialCharsEnd(word.toLowerCase())
          if (w.length > 0) {
            if(!wordsMap.has(w))
            {
              wordsMap.set(w, [start]);
            }
            const indices = wordsMap.get(w);
            if(indices?.findIndex(x => x === start) === -1) {
              indices.push(start);
            }
          }
        }
      }

      const convertedSentence = {
        transcriptId: sentencesResponse.id,
        start: sentence.start,
        end: sentence.end,
        text: sentence.text,
        chapterIdx: chapter?.index || -1,
        wordsMap: wordsMap,
        rawWords: sentence.words,
      }
      sentences.push(convertedSentence);
      chapter?.rawSentences.push(convertedSentence);
    }
  }
  return sentences;
}

const buildParagraphs = (p: ParagraphsResponse|undefined): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  if (p !== undefined) {
    for (let i = 0; i < p.paragraphs.length; ++i) {
      const x = p.paragraphs[i];
      paragraphs.push({
        transcriptId: p.id,
        start: x.start,
        end: x.end,
      });
    }
  }
  return paragraphs;
}

export const buildTranscript = (t: Transcript, s: SentencesResponse, p: ParagraphsResponse|undefined): ConvertedTranscript => {
  const {chapters, chaptersMap, words} = buildChapters(t, s);
  const sentences: Sentence[] = buildSentences(s, chaptersMap);
  const paragraphs: Paragraph[] = buildParagraphs(p);
  const highlights: Highlight[] = [];
  const selections: Selection[] = [];

  const transcript: TractStackTranscript = {
    text: t.text ?? "",
    chapters: t.chapters?.length ?? 0,
    id: t.id,
    slug: "",
    title: t.summary ?? "",
    duration: 0,
  };

  return {
    chapters,
    words,
    highlights,
    selections,
    paragraphs,
    sentences,
    transcript
  };
}