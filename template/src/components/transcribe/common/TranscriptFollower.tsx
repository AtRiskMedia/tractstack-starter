import {useStore} from "@nanostores/react";
import {useEffect, useMemo, useRef, useState} from "react";
import type { SentencesResponse, Transcript, TranscriptSentence, Word } from "assemblyai";
import TreeMap from "ts-treemap";
import { convertMillisecondsToSeconds } from "@/utils/transcribe/utils.ts";
import { $videoPlayer } from "@/store/transcribe/appState.ts";
import { buildTranscript } from "@/utils/transcribe/converters.ts";
import { $chaptersStore, $wordStore, setDataToStore } from "@/store/transcribe/transcribeStore.ts";
import { JSONBetterParser } from "@/utils/common/helpers.ts";
import {
    $activeTranscriptOverride,
    applyTranscriptOverrides,
    createEmptyTranscriptOverride,
} from "@/store/transcribe/transcriptOverridesStore.ts";
import { WordsSearch } from "@/components/transcribe/video/WordsSearch.tsx";
import { ActiveChapter } from "@/components/transcribe/video/ActiveChapter.tsx";
import { TranscriptWordDrawer } from "@/components/transcribe/common/TranscriptWordDrawer.tsx";
import { LoadSpinner } from "@/components/transcribe/helpers/LoadSpinner.tsx";
import { Switch } from "@/components/transcribe/common/Switch.tsx";

export type TranscriptFollowerProps = {
    transcriptUuid: string;
}

export type WordData = {
    wordIdx: number,
    wordIdxOffset: number;
    chapterIdx: number;
}

export type SentenceData = {
    chapterIdx: number,
    sentenceIdx: number,
    startTime: number;
    endTime: number;
    sentenceWordStartIdx: number;
    chapterWordStartIdx: number;
    wordsMap: Map<string, number>;
}

type TranscriptServerResponse = {
    transcript: Transcript,
    sentences: SentencesResponse
}

export type ChapterWords = {
    startIdx: number;
    endIdx: number;
    wordsSeekTimes: [number, WordData][];
}

enum View {
    SENTENCE = 0,
    PARAGRAPH = 1,
}

function buildChapters(transcript: Transcript) {
    const chaptersMap: TreeMap<number, number> = new TreeMap<number, number>();
    for (let i = 0; i < transcript.chapters.length; ++i) {
        const startTime = convertMillisecondsToSeconds(transcript.chapters[i].start);
        chaptersMap.set(startTime, i);
    }
    return chaptersMap;
}

function buildSentencesToChaptersMap(sentences: TranscriptSentence[], transcript: Transcript) {
    const sentencesMap: TreeMap<number, SentenceData> = new TreeMap<number, SentenceData>();
    let activeChapterIdx = 0;
    let accumulatedSentenceWords = 0;
    let accumulatedChapterWords = 0;
    for (let i = 0; i < sentences.length; ++i) {
        const sentence = sentences[i];
        // current chapter ends when the new sentence starts, chapters and sentences are sorted so we increment the index
        if (sentence.start >= transcript.chapters[activeChapterIdx].end) {
            ++activeChapterIdx;
            accumulatedSentenceWords = 0;
        }

        if (sentence.start >= transcript.chapters[activeChapterIdx].start && sentence.end <= transcript.chapters[activeChapterIdx].end) {
            const startS = convertMillisecondsToSeconds(sentence.start);
            const endS = convertMillisecondsToSeconds(sentence.end);
            const wordsMap = new Map<string, number>();
            sentence.words.forEach(w => wordsMap.set(w.text, w.start))

            sentencesMap.set(startS, {
                chapterIdx: activeChapterIdx,
                startTime: startS,
                endTime: endS,
                sentenceWordStartIdx: accumulatedSentenceWords,
                chapterWordStartIdx: accumulatedChapterWords,
                sentenceIdx: i,
                wordsMap
            });
            accumulatedSentenceWords += sentence.words.length;
            accumulatedChapterWords += sentence.words.length;
        }
    }
    return {sentencesMap, activeChapterIdx};
}

function buildWordsToChaptersMap(activeChapterIdx: number, transcript: Transcript, chaptersMap: TreeMap<number, number>) {
    const wordsMap: TreeMap<number, WordData> = new TreeMap<number, WordData>();
    const chapterWords: Map<number, ChapterWords> = new Map<number, ChapterWords>();

    activeChapterIdx = 0;
    let globalWordIdxOffset = 0;
    let wordsAmount = 0;
    for (let i = 0; i < transcript.words.length; ++i) {
        const word = transcript.words[i];
        const startTime = convertMillisecondsToSeconds(word.start);
        const chapterIdx = chaptersMap.get(chaptersMap.floorKey(startTime));
        if (activeChapterIdx !== chapterIdx) {
            if (!chapterWords.get(activeChapterIdx)) {
                chapterWords.set(activeChapterIdx, {
                    startIdx: i-wordsAmount,
                    endIdx: i,
                    wordsSeekTimes: Array.from(wordsMap.toMap())
                });
            }
            globalWordIdxOffset += wordsAmount;
            activeChapterIdx = chapterIdx;
            wordsAmount = 0;
            wordsMap.clear();
        }

        wordsMap.set(startTime, {
            wordIdx: i,
            chapterIdx,
            wordIdxOffset: globalWordIdxOffset,
        });
        ++wordsAmount;

    }
    return {chapterWords};
}

export const TranscriptFollower = (props: TranscriptFollowerProps) => {
    const player = useStore<any>($videoPlayer);
    const [originalTranscript, setOriginalTranscript] = useState<Transcript>();
    const [chapterWords, setChapterWords] = useState<Map<number, ChapterWords>>();
    const [chapters, setChapters] = useState<TreeMap<number, number>>();
    const [sentencesMap, setSentencesMap] = useState<TreeMap<number, SentenceData>>()
    const [sentences, setSentences] = useState<SentencesResponse>()
    const [time, setTime] = useState<number>(0);
    const [view, setView] = useState<View>(View.SENTENCE);
    const [searching, setSearching] = useState(false);

    const words = useRef<Map<number, TreeMap<number, WordData>>>(new Map<number, TreeMap<number, WordData>>);

    useEffect(() => {
        const run = async () => {
            try {
                const uuid = props.transcriptUuid;
                console.log("retrieving transcript... " + uuid);
                if (uuid) {
                    console.time("requests");
                    const transcriptUrl = `/api/transcribe/transcript?` + new URLSearchParams({transcript_id: uuid}).toString();
                    const transcriptOverrideUrl = `/api/transcribe/transcript_override?` + new URLSearchParams({transcript_id: uuid}).toString();
                    const data = await Promise.all([
                        await fetch(transcriptUrl),
                        await fetch(transcriptOverrideUrl),
                    ]);

                    const transcriptRes = await data[0].json() as TranscriptServerResponse;
                    console.timeEnd("requests");

                    const transcript = transcriptRes.transcript;
                    const sentencesResponse = transcriptRes.sentences;

                    // build chapters treemap lookup based on start time
                    console.time("chapters");
                    const chaptersMap = buildChapters(transcript);
                    const {sentencesMap, activeChapterIdx} = buildSentencesToChaptersMap(sentencesResponse.sentences, transcript);
                    console.timeEnd("chapters");

                    // build words and chapter to words maps
                    console.time("words");
                    const {chapterWords} = buildWordsToChaptersMap(activeChapterIdx, transcript, chaptersMap);
                    console.timeEnd("words")

                    console.time("transcript_convertion");
                    const convertedTranscript = buildTranscript(transcript, sentencesResponse, undefined);
                    setDataToStore(convertedTranscript);

                    const transcriptOverrides = await data[1].json();
                    if(transcriptOverrides?.length > 0) {
                        const data = JSONBetterParser(transcriptOverrides[0].data);
                        applyTranscriptOverrides(data);
                    } else {
                        $activeTranscriptOverride.set(createEmptyTranscriptOverride(uuid));
                    }
                    console.timeEnd("transcript_convertion");

                    setOriginalTranscript(transcript);
                    setSentences(sentencesResponse);
                    setChapters(chaptersMap);
                    setSentencesMap(sentencesMap);
                    setChapterWords(chapterWords);
                }
            } catch (ex) {
                console.error("error retrieving transcript: " + ex);
            }

            $videoPlayer.get()?.play();
        };
        run().catch(e => console.error(e));
    }, []);

    useEffect(() => {
        if(player) {
            player.on('timeupdate', function(data) {
                setTime(data.seconds);
            });
        }
        return () => {
            player?.off('timeupdate');
        }
    }, [player]);

    const getActiveChapterIdx = (time: number): number => {
        if(chapters) {
            const key = chapters.floorKey(time);
            if (!key)
                return chapters.get(chapters.firstKey());
            return chapters.get(key);
        }
        return -1;
    }

    const getWords = (chapterIdx: number, time: number): Word[] => {
        if(view === View.PARAGRAPH) {
            if (chapterIdx === -1) return [];
            const chapter = $chaptersStore.get()[chapterIdx];
            if (chapter) {
              return chapter.rawWords;
            }
            return [];
        } else if(view === View.SENTENCE) {
            return getSentenceWords(time);
        }
    }

    const buildWordsLookup = (chapterIdx: number): TreeMap<number, WordData> => {
        const seekTimes = chapterWords.get(chapterIdx).wordsSeekTimes;
        return new TreeMap<number, WordData>(seekTimes);
    }

    const getSelectedWordIdx = (chapterIdx: number, time: number): number => {
        if(time <= 0 || chapterIdx === -1) return 0;
        let wordsLookup = words.current.get(chapterIdx);
        if(!wordsLookup) {
            console.time("build_words_chunk");
            wordsLookup = buildWordsLookup(chapterIdx);
            words.current.set(chapterIdx, wordsLookup);
            console.timeEnd("build_words_chunk");
        }

        const matchingWord = wordsLookup.floorKey(time);
        const entry = wordsLookup.get(matchingWord);
        if(!entry)
            return 0;
        if(view === View.PARAGRAPH) {
            return entry?.wordIdx - entry?.wordIdxOffset;
        } else {
            const sentenceEntry = sentencesMap.get(sentencesMap.floorKey(time));
            return entry?.wordIdx - entry?.wordIdxOffset - sentenceEntry?.sentenceWordStartIdx;
        }
    }

    const onWordClicked = (idx: number, word: Word) => {
        player.setCurrentTime(convertMillisecondsToSeconds(word.start));
    }

    const getSentenceWords = (time: number): Word[] => {
        if(sentencesMap) {
            const entry = sentencesMap.get(sentencesMap.floorKey(time));
            if(!entry)
                return [];
            const wordsAmount = sentences.sentences[entry.sentenceIdx].words.length;
            return $wordStore.get().slice(entry.chapterWordStartIdx, entry.chapterWordStartIdx + wordsAmount);
        }
        return [];
    }

    const activeChapterIdx = useMemo(() => getActiveChapterIdx(time), [time]);

    const isReady = (): boolean => !!originalTranscript;
    return (
        <div className="flex mx-auto bg-amber-50 min-w-[1000px] w-[1000px]">
            {isReady() ?
                <div className="flex w-full flex-col m-4 px-2 gap-y-4">
                    <div className="flex justify-between">
                        <Switch checked={view === View.PARAGRAPH}
                                onSwitch={e => setView(view === View.PARAGRAPH ? View.SENTENCE : View.PARAGRAPH)}
                                leftText="Sentence"
                                rightText="Paragraph"
                        />
                        <div>
                            <button className="bg-amber-300 p-2 rounded drop-shadow-xl border-2 border-black"
                                    onClick={() => setSearching(true)}>
                                Search Word
                            </button>
                            <WordsSearch searching={searching}
                                         transcript={originalTranscript}
                                         chapterWords={chapterWords}
                                         sentences={sentences}
                                         onClose={() => setSearching(false)}/>
                        </div>
                    </div>
                    <ActiveChapter activeChapterIdx={activeChapterIdx}
                                   transcript={originalTranscript}/>
                    <div className="flex flex-wrap mx-auto">
                        {getWords(activeChapterIdx, time)
                            .map((x, idx) =>
                                <TranscriptWordDrawer chapterIdx={activeChapterIdx}
                                                      word={x}
                                                      wordIdx={idx}
                                                      selected={getSelectedWordIdx(activeChapterIdx, time) === idx}
                                                      onClick={onWordClicked}/>)
                        }
                    </div>
                </div>
                :
                <div className="mx-auto">
                    <LoadSpinner/>
                </div>
            }
        </div>
    );
}