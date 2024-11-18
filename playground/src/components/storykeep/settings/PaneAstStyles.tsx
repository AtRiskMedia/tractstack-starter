import { memo, useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Switch, Listbox } from "@headlessui/react";
import { useStore } from "@nanostores/react";
import {
  XMarkIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import { generateMarkdownLookup } from "../../../utils/compositor/generateMarkdownLookup";
import {
  getActiveTagData,
  updateViewportTuple,
  findCodeNode,
  cleanHtmlAst,
} from "../../../utils/compositor/markdownUtils";
import { useDropdownDirection } from "../../../hooks/useDropdownDirection";
import { useStoryKeepUtils } from "../../../utils/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import ColorPickerWrapper from "../components/ColorPickerWrapper";
import {
  paneMarkdownFragmentId,
  paneFragmentMarkdown,
  lastInteractedTypeStore,
  lastInteractedPaneStore,
  editModeStore,
} from "../../../store/storykeep";
import { classNames, cloneDeep, getComputedColor } from "../../../utils/helpers";
import { tailwindClasses } from "../../../assets/tailwindClasses";
import { COLOR_STYLES, hexToTailwind, tailwindToHex } from "../../../assets/tailwindColors";
import { buttonStyleOptions, buttonStyleClasses } from "../../../assets/paneDesigns";
import { tagTitles } from "../../../constants";
import Widget from "../fields/Widget";
import ImageMeta from "../fields/ImageMeta";
import LinksMeta from "../fields/LinksMeta";
import StyleMemory from "../fields/StyleMemory";
import AddClass from "../components/AddClass";
import type { StyleFilter } from "../components/AddClass";
import type { Root } from "hast";
import type {
  ClassNamesPayloadInnerDatum,
  ClassNamesPayloadDatumValue,
  PaneAstTargetId,
  Tag,
  Tuple,
  ButtonStyleClass,
  FileDatum,
} from "../../../types";
import type { ColorStyle } from "../../../assets/tailwindColors";

interface StyleTab {
  name: string;
  tag: Tag;
  priority: number;
}

const MemoizedImageMeta = memo(ImageMeta);
const MemoizedLinksMeta = memo(LinksMeta);
const MemoizedAddClass = memo(AddClass);

export const PaneAstStyles = (props: {
  id: string;
  targetId: PaneAstTargetId;
  files: FileDatum[];
}) => {
  const { id, targetId, files } = props;
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("popular");
  const buttonStyleListboxRef = useRef<HTMLButtonElement>(null);
  const { openAbove: buttonStyleOpenAbove, maxHeight: buttonStyleMaxHeight } =
    useDropdownDirection(buttonStyleListboxRef);
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [widgetConfigMode, setWidgetConfigMode] = useState(false);
  const [widgetData, setWidgetData] = useState<string[]>([]);
  const [imageMeta, setImageMeta] = useState(false);
  const [linkTargetKey, setLinkTargetKey] = useState<string>(``);
  const [linkMode, setLinkMode] = useState<`button` | `hover` | null>(null);
  const [query, setQuery] = useState("");
  const [addClass, setAddClass] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [tabs, setTabs] = useState<StyleTab[] | null>(null);
  const [parentLayer, setParentLayer] = useState(0);
  const [mobileValue, setMobileValue] = useState<string>(``);
  const [tabletValue, setTabletValue] = useState<string>(``);
  const [desktopValue, setDesktopValue] = useState<string>(``);
  const [confirm, setConfirm] = useState<string | null>(null);
  const $editMode = useStore(editModeStore);
  const $paneMarkdownFragmentId = useStore(paneMarkdownFragmentId, {
    keys: [targetId.paneId],
  });
  const markdownFragmentId = $paneMarkdownFragmentId[targetId.paneId].current;
  const { updateStoreField } = useStoryKeepUtils(markdownFragmentId, []);
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId],
  });
  const { handleUndo } = useStoryKeepUtils(id, []);
  const markdownDatum = $paneFragmentMarkdown[markdownFragmentId].current;
  const hasHistory = !!$paneFragmentMarkdown[markdownFragmentId].history.length;
  const hasModal = markdownDatum.payload.isModal;
  const markdownLookup = useMemo(() => {
    return markdownDatum?.markdown?.htmlAst
      ? generateMarkdownLookup(markdownDatum.markdown.htmlAst)
      : null;
  }, [markdownDatum?.markdown?.htmlAst]);
  const thisTag = markdownLookup?.nthTag[targetId.outerIdx];
  const thisTagTitle = thisTag && tagTitles[thisTag];
  const hasTextShapeOutside =
    (markdownDatum.payload.textShapeOutsideDesktop &&
      markdownDatum.payload.textShapeOutsideDesktop !== `none`) ||
    (markdownDatum.payload.textShapeOutsideTablet &&
      markdownDatum.payload.textShapeOutsideTablet !== `none`) ||
    (markdownDatum.payload.textShapeOutsideMobile &&
      markdownDatum.payload.textShapeOutsideMobile !== `none`);
  const isLink =
    (typeof targetId.idx === `number` &&
      targetId.tag === `a` &&
      typeof targetId.buttonTarget === `string`) ||
    (linkTargetKey && linkTargetKey !== `*`);
  const isListItem =
    typeof targetId.idx === `number`
      ? typeof markdownLookup?.listItemsLookup[targetId.outerIdx] ===
          `object` &&
        typeof markdownLookup.listItemsLookup[targetId.outerIdx][
          targetId.idx
        ] === `number`
      : null;
  const isCodeItem =
    typeof targetId.idx === `number`
      ? typeof markdownLookup?.codeItemsLookup[targetId.outerIdx] ===
          `object` &&
        typeof markdownLookup.codeItemsLookup[targetId.outerIdx][
          targetId.idx
        ] === `number`
      : null;
  const isImage =
    typeof targetId.idx === `number`
      ? typeof markdownLookup?.imagesLookup[targetId.outerIdx] === `object` &&
        typeof markdownLookup.imagesLookup[targetId.outerIdx][targetId.idx] ===
          `number`
      : null;
  const parentClassNamesPayload =
    markdownDatum?.payload.optionsPayload.classNamesPayload.parent;
  const modalClassNamesPayload =
    markdownDatum?.payload.optionsPayload.classNamesPayload.modal;
  const imageClassNamesPayload =
    markdownDatum.payload.optionsPayload.classNamesPayload.img;
  const codeItemClassNamesPayload =
    markdownDatum.payload.optionsPayload.classNamesPayload.code;
  const listItemClassNamesPayload =
    markdownDatum.payload.optionsPayload.classNamesPayload.li;
  const outerTagClassNamesPayload =
    thisTag && markdownDatum.payload.optionsPayload.classNamesPayload[thisTag];
  const linkTargetLookup =
    typeof linkTargetKey === `string` ? linkTargetKey : targetId.buttonTarget;
  const buttonClassNamesPayload =
    isLink &&
    linkMode === `button` &&
    linkTargetLookup &&
    linkTargetLookup !== `*` &&
    markdownDatum?.payload?.optionsPayload?.buttons
      ? markdownDatum.payload.optionsPayload.buttons[linkTargetLookup]
          .classNamesPayload.button
      : isLink &&
          linkMode === `hover` &&
          linkTargetLookup &&
          linkTargetLookup !== `*` &&
          markdownDatum?.payload?.optionsPayload?.buttons
        ? markdownDatum.payload.optionsPayload.buttons[linkTargetLookup]
            .classNamesPayload.hover
        : { classes: {} };
  const buttonClassNamesPayloadArray = useMemo(() => {
    if (
      isLink &&
      linkTargetLookup &&
      linkTargetLookup !== "*" &&
      markdownDatum?.payload?.optionsPayload?.buttons
    ) {
      const buttonData =
        markdownDatum.payload.optionsPayload.buttons[linkTargetLookup];
      return [
        buttonData.classNamesPayload.button.classes || {},
        buttonData.classNamesPayload.hover.classes || {},
      ] as ClassNamesPayloadDatumValue[];
    }
    return [] as ClassNamesPayloadDatumValue[];
  }, [isLink, linkTargetLookup, markdownDatum]);
  const classNamesPayload =
    isLink && buttonClassNamesPayload
      ? buttonClassNamesPayload
      : activeTag === `img`
        ? imageClassNamesPayload
        : activeTag === `code`
          ? codeItemClassNamesPayload
          : activeTag === `li`
            ? listItemClassNamesPayload
            : outerTagClassNamesPayload;
  const handleButtonStyleChange = useCallback(
    (option: string) => {
      if (linkMode && linkTargetKey) {
        const index = parseInt(option);
        const buttonStyle = buttonStyleClasses[index] as ButtonStyleClass;
        const currentField = cloneDeep(
          $paneFragmentMarkdown[markdownFragmentId]
        );
        if (!currentField.current.payload.optionsPayload.buttons) {
          currentField.current.payload.optionsPayload.buttons = {};
        }
        if (
          !currentField.current.payload.optionsPayload.buttons[linkTargetKey]
        ) {
          currentField.current.payload.optionsPayload.buttons[linkTargetKey] = {
            urlTarget: linkTargetKey,
            callbackPayload: "",
            className: "",
            classNamesPayload: {
              button: { classes: {} },
              hover: { classes: {} },
            },
          };
        }
        currentField.current.payload.optionsPayload.buttons[
          linkTargetKey
        ].classNamesPayload.button.classes = Object.fromEntries(
          Object.entries(buttonStyle[0]).map(([key, value]) => [
            key,
            value as Tuple,
          ])
        ) as ClassNamesPayloadDatumValue;
        currentField.current.payload.optionsPayload.buttons[
          linkTargetKey
        ].classNamesPayload.hover.classes = Object.fromEntries(
          Object.entries(buttonStyle[1]).map(([key, value]) => [
            key,
            value as Tuple,
          ])
        ) as ClassNamesPayloadDatumValue;
        updateStoreField("paneFragmentMarkdown", currentField.current);
        lastInteractedTypeStore.set(`markdown`);
        lastInteractedPaneStore.set(targetId.paneId);
      }
    },
    [
      linkMode,
      linkTargetKey,
      markdownFragmentId,
      updateStoreField,
      targetId.paneId,
    ]
  );

  const removeLinkStyle = (className: string) => {
    setSelectedStyle(null);
    if (!confirm) setConfirm(className);
    else {
      setConfirm(null);
      const thisTag = linkMode;
      const thisButtonKey = linkTargetKey;
      const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
      const payloadForTag =
        thisButtonKey &&
        thisTag &&
        (currentField?.current?.payload?.optionsPayload?.buttons?.[
          thisButtonKey
        ]?.classNamesPayload?.[thisTag] as ClassNamesPayloadInnerDatum);
      if (
        payloadForTag &&
        typeof payloadForTag === `object` &&
        `classes` in payloadForTag &&
        className in payloadForTag.classes
      ) {
        delete (payloadForTag.classes as Record<string, string[]>)[className];
      }
      if (thisTag && payloadForTag) {
        updateStoreField("paneFragmentMarkdown", {
          ...currentField.current,
          payload: {
            ...currentField.current.payload,
            optionsPayload: {
              ...currentField.current.payload.optionsPayload,
              classNamesPayload: {
                ...currentField.current.payload.optionsPayload
                  .classNamesPayload,
                [thisTag]: payloadForTag,
              },
            },
          },
        });
      }
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);
    }
  };

  const removeStyle = (className: string) => {
    setSelectedStyle(null);
    if (!confirm) setConfirm(className);
    else {
      setConfirm(null);
      const activeTagData = getActiveTagData(
        activeTag,
        className,
        markdownLookup,
        targetId,
        classNamesPayload || { classes: {} as ClassNamesPayloadDatumValue },
        modalClassNamesPayload,
        parentClassNamesPayload,
        parentLayer
      );
      const thisTag = activeTagData?.tag;
      const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
      const payloadForTag =
        thisTag &&
        (currentField.current.payload.optionsPayload.classNamesPayload[
          thisTag
        ] as ClassNamesPayloadInnerDatum);
      if (payloadForTag && className) {
        if (thisTag === `parent`) {
          if (
            Array.isArray(payloadForTag.classes) &&
            payloadForTag.classes?.[parentLayer] &&
            className in payloadForTag.classes[parentLayer]
          ) {
            delete (
              payloadForTag.classes[parentLayer] as Record<string, string[]>
            )[className];
          }
        } else {
          if (payloadForTag.classes && className in payloadForTag.classes) {
            delete (payloadForTag.classes as Record<string, string[]>)[
              className
            ];
          }
          if (payloadForTag.override && className in payloadForTag.override) {
            delete payloadForTag.override[className];
          }
        }
      }
      if (thisTag && payloadForTag) {
        updateStoreField("paneFragmentMarkdown", {
          ...currentField.current,
          payload: {
            ...currentField.current.payload,
            optionsPayload: {
              ...currentField.current.payload.optionsPayload,
              classNamesPayload: {
                ...currentField.current.payload.optionsPayload
                  .classNamesPayload,
                [thisTag]: payloadForTag,
              },
            },
          },
        });
      }
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);
    }
  };

  const removeStyleIntercept = (className: string) => {
    if (isLink) removeLinkStyle(className);
    else removeStyle(className);
  };

  const handleWidgetStyle = () => {
    setWidgetConfigMode(false);
  };
  const handleWidgetConfig = useCallback(() => {
    if (
      markdownDatum?.markdown?.htmlAst &&
      (typeof targetId.outerIdx === "number" ||
        $editMode?.targetId?.outerIdx !== undefined)
    ) {
      const codeNode =
        markdownDatum?.markdown?.htmlAst &&
        findCodeNode(
          cleanHtmlAst(markdownDatum.markdown.htmlAst as Root) as Root,
          $editMode?.targetId?.outerIdx ?? targetId.outerIdx
        );
      if (codeNode) {
        const match = codeNode.match(/(\w+)\((.*?)\)/);
        if (match) {
          const [, key, valuesString] = match;
          const values = valuesString.split("|").map(item => item.trim());
          setWidgetData([key, ...values]);
        } else {
          console.error("Invalid widget format:", codeNode);
          setWidgetData([]);
        }
        setWidgetConfigMode(true);
      }
    }
    setSelectedStyle(null);
    setAddClass(false);
  }, [markdownDatum, targetId, $editMode]);

  // naz debug - pane classes here
  //console.log($paneFragmentMarkdown[markdownFragmentId].current.payload.optionsPayload);

  const handleAddLayer = (start: boolean) => {
    const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
    const payloadForTag = currentField.current.payload.optionsPayload
      .classNamesPayload.parent as ClassNamesPayloadInnerDatum;
    if (Array.isArray(payloadForTag.classes)) {
      if (start) {
        payloadForTag.classes.unshift({});
      } else {
        payloadForTag.classes.push({});
      }
      updateStoreField("paneFragmentMarkdown", {
        ...currentField.current,
        payload: {
          ...currentField.current.payload,
          optionsPayload: {
            ...currentField.current.payload.optionsPayload,
            classNamesPayload: {
              ...currentField.current.payload.optionsPayload.classNamesPayload,
              [`parent`]: payloadForTag,
            },
          },
        },
      });
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);
    }
  };

  const toggleOverride = () => {
    const thisTag = activeTagData?.tag;
    const thisClass = activeTagData?.class ?? "";
    const thisGlobalNth = activeTagData?.globalNth ?? 0;
    const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
    const payloadForTag =
      thisTag &&
      (currentField.current.payload.optionsPayload.classNamesPayload[
        thisTag
      ] as ClassNamesPayloadInnerDatum | undefined);
    if (payloadForTag && markdownLookup) {
      // already has override; edit in place
      if (activeTagData?.hasOverride && typeof thisGlobalNth === `number`) {
        if (payloadForTag?.override?.[thisClass]) {
          delete payloadForTag.override[thisClass][thisGlobalNth];
          if (Object.keys(payloadForTag.override[thisClass]).length === 0) {
            delete payloadForTag.override[thisClass];
          }
        }
        if (
          payloadForTag?.override &&
          Object.keys(payloadForTag.override).length === 0
        ) {
          delete payloadForTag.override;
          delete payloadForTag.count;
        }
      } else {
        // must generate the override
        const count =
          thisTag === `img`
            ? Object.keys(markdownLookup.images).length
            : thisTag === `code`
              ? Object.keys(markdownLookup.codeItems).length
              : thisTag === `li`
                ? Object.keys(markdownLookup.listItems).length
                : markdownLookup?.nthTagLookup[
                      thisTag as keyof typeof markdownLookup.nthTagLookup
                    ]
                  ? Object.keys(
                      markdownLookup.nthTagLookup[
                        thisTag as keyof typeof markdownLookup.nthTagLookup
                      ]
                    ).length
                  : 0;
        payloadForTag.count = count;
        if (payloadForTag && typeof thisGlobalNth === "number") {
          if (!payloadForTag.override) {
            payloadForTag.override = {};
          }
          if (!payloadForTag.override[thisClass]) {
            payloadForTag.override[thisClass] = [];
          }
          payloadForTag.override[thisClass][thisGlobalNth] = [""];
        }
      }
      updateStoreField("paneFragmentMarkdown", {
        ...currentField.current,
        payload: {
          ...currentField.current.payload,
          optionsPayload: {
            ...currentField.current.payload.optionsPayload,
            classNamesPayload: {
              ...currentField.current.payload.optionsPayload.classNamesPayload,
              [thisTag]: payloadForTag as ClassNamesPayloadInnerDatum,
            },
          },
        },
      });
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);
    }
  };

  const handleFinalChangeLink = (
    value: string,
    viewport: "mobile" | "tablet" | "desktop",
    isNegative: boolean = false
  ) => {
    const thisTag = linkMode;
    const thisClass = selectedStyle;
    const thisValue =
      typeof isNegative !== `undefined` && isNegative ? `!${value}` : value;
    const thisButtonKey = linkTargetKey;
    const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
    const payloadForTag =
      thisButtonKey &&
      thisTag &&
      (currentField?.current?.payload?.optionsPayload?.buttons?.[thisButtonKey]
        ?.classNamesPayload?.[thisTag] as ClassNamesPayloadInnerDatum);
    const thisTuple =
      payloadForTag &&
      thisClass &&
      !Array.isArray(payloadForTag.classes) &&
      payloadForTag.classes[thisClass];
    if (thisTuple && currentField.current.payload.optionsPayload.buttons) {
      const newTuple = updateViewportTuple(thisTuple, viewport, thisValue);
      (payloadForTag.classes as Record<string, Tuple>)[thisClass] = newTuple;
      updateStoreField("paneFragmentMarkdown", {
        ...currentField.current,
        payload: {
          ...currentField.current.payload,
          optionsPayload: {
            ...currentField.current.payload.optionsPayload,
            buttons: {
              ...currentField.current.payload.optionsPayload.buttons,

              [thisButtonKey]: {
                classNamesPayload: {
                  ...currentField.current.payload.optionsPayload.buttons[
                    thisButtonKey
                  ].classNamesPayload,
                  [thisTag]: payloadForTag,
                },
              },
            },
          },
        },
      });
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);
    }
  };

  const handleFinalChange = (
    value: string,
    viewport: "mobile" | "tablet" | "desktop",
    isNegative: boolean = false
  ) => {
    if (activeTagData?.values.includes(value)) {
      const thisTag = activeTagData.tag;
      const thisGlobalNth = activeTagData.globalNth;
      const thisClass = activeTagData.class;
      const thisValue =
        typeof isNegative !== `undefined` && isNegative ? `!${value}` : value;
      const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
      if (
        !currentField.current.payload.optionsPayload.classNamesPayload[thisTag]
      ) {
        currentField.current.payload.optionsPayload.classNamesPayload[thisTag] =
          {
            classes: {},
          };
      }
      const payloadForTag = currentField.current.payload.optionsPayload
        .classNamesPayload[thisTag] as ClassNamesPayloadInnerDatum;
      if (!payloadForTag.classes) {
        payloadForTag.classes = {};
      }
      let thisTuple: Tuple;
      if (
        activeTagData.tag === `parent` &&
        Array.isArray(payloadForTag.classes)
      ) {
        if (!payloadForTag.classes[parentLayer]) {
          payloadForTag.classes[parentLayer] = {};
        }
        thisTuple = (
          payloadForTag.classes[parentLayer] as Record<string, Tuple>
        )[thisClass] || [""];
      } else if (activeTagData?.hasOverride) {
        if (!payloadForTag.override) {
          payloadForTag.override = {};
        }
        if (!payloadForTag.override[thisClass]) {
          payloadForTag.override[thisClass] = [];
        }
        thisTuple = payloadForTag.override[thisClass][
          thisGlobalNth as number
        ] || [""];
      } else {
        thisTuple = (payloadForTag.classes as Record<string, Tuple>)[
          thisClass
        ] || [""];
      }
      const newTuple = updateViewportTuple(thisTuple, viewport, thisValue);
      if (
        activeTagData.tag === `parent` &&
        Array.isArray(payloadForTag.classes)
      ) {
        (payloadForTag.classes[parentLayer] as Record<string, Tuple>)[
          thisClass
        ] = newTuple;
      } else if (activeTagData?.hasOverride) {
        payloadForTag.override![thisClass][thisGlobalNth as number] = newTuple;
      } else {
        (payloadForTag.classes as Record<string, Tuple>)[thisClass] = newTuple;
      }
      updateStoreField("paneFragmentMarkdown", {
        ...currentField.current,
        payload: {
          ...currentField.current.payload,
          optionsPayload: {
            ...currentField.current.payload.optionsPayload,
            classNamesPayload: {
              ...currentField.current.payload.optionsPayload.classNamesPayload,
              [thisTag]: payloadForTag,
            },
          },
        },
      });
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);
    }
  };

  const handleFinalChangeIntercept = (
    value: string,
    viewport: "mobile" | "tablet" | "desktop",
    isNegative: boolean = false
  ) => {
    if (isLink) handleFinalChangeLink(value, viewport, isNegative);
    else handleFinalChange(value, viewport, isNegative);
  };

  const handleDeleteLayer = () => {
    const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
    const payloadForTag =
      currentField.current.payload.optionsPayload.classNamesPayload.parent;
    if (Array.isArray(payloadForTag.classes))
      payloadForTag.classes.splice(parentLayer, 1);
    if (payloadForTag)
      updateStoreField("paneFragmentMarkdown", {
        ...currentField.current,
        payload: {
          ...currentField.current.payload,
          optionsPayload: {
            ...currentField.current.payload.optionsPayload,
            classNamesPayload: {
              ...currentField.current.payload.optionsPayload.classNamesPayload,
              [`parent`]: payloadForTag,
            },
          },
        },
      });
    lastInteractedTypeStore.set(`markdown`);
    lastInteractedPaneStore.set(targetId.paneId);
  };

  const handleAddStyle = () => {
    if (selectedClass) {
      const activeTagData = getActiveTagData(
        activeTag,
        selectedClass,
        markdownLookup,
        targetId,
        classNamesPayload || null,
        modalClassNamesPayload,
        parentClassNamesPayload,
        parentLayer
      );
      const thisTag = activeTagData?.tag;
      const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
      const payloadForTag =
        thisTag &&
        (currentField.current.payload.optionsPayload.classNamesPayload[
          thisTag
        ] as ClassNamesPayloadInnerDatum);

      if (
        payloadForTag &&
        Array.isArray(payloadForTag.classes) &&
        !(selectedClass in payloadForTag.classes[parentLayer])
      ) {
        if (
          typeof payloadForTag.classes === "object" &&
          typeof payloadForTag.classes[parentLayer] === "object"
        ) {
          (payloadForTag.classes[parentLayer] as Record<string, Tuple>)[
            selectedClass
          ] = [""];
        }
      } else if (payloadForTag && !(selectedClass in payloadForTag.classes)) {
        if (
          typeof payloadForTag.classes === "object" &&
          !Array.isArray(payloadForTag.classes)
        ) {
          (payloadForTag.classes as Record<string, Tuple>)[selectedClass] = [
            "",
          ];
        }
      }
      if (thisTag && payloadForTag)
        updateStoreField("paneFragmentMarkdown", {
          ...currentField.current,
          payload: {
            ...currentField.current.payload,
            optionsPayload: {
              ...currentField.current.payload.optionsPayload,
              classNamesPayload: {
                ...currentField.current.payload.optionsPayload
                  .classNamesPayload,
                [thisTag]: payloadForTag,
              },
            },
          },
        });
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);

      setAddClass(false);
      setSelectedStyle(selectedClass);
      setSelectedClass("");
      setQuery("");
      setConfirm(null);
    }
  };

  const handleAddStyleLink = () => {
    const thisTag = linkMode;
    const thisClass = selectedClass;
    const thisButtonKey = linkTargetKey;
    const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
    const payloadForTag =
      thisButtonKey &&
      thisTag &&
      (currentField?.current?.payload?.optionsPayload?.buttons?.[thisButtonKey]
        ?.classNamesPayload?.[thisTag] as ClassNamesPayloadInnerDatum);
    if (payloadForTag && currentField.current.payload.optionsPayload.buttons) {
      (payloadForTag.classes as Record<string, Tuple>)[thisClass] = [``];
      updateStoreField("paneFragmentMarkdown", {
        ...currentField.current,
        payload: {
          ...currentField.current.payload,
          optionsPayload: {
            ...currentField.current.payload.optionsPayload,
            buttons: {
              ...currentField.current.payload.optionsPayload.buttons,

              [thisButtonKey]: {
                classNamesPayload: {
                  ...currentField.current.payload.optionsPayload.buttons[
                    thisButtonKey
                  ].classNamesPayload,
                  [thisTag]: payloadForTag,
                },
              },
            },
          },
        },
      });
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(targetId.paneId);

      setAddClass(false);
      setSelectedStyle(selectedClass);
      setSelectedClass("");
      setQuery("");
      setConfirm(null);
    }
  };

  const handleAddStyleIntercept = () => {
    if (isLink) handleAddStyleLink();
    else handleAddStyle();
  };
  const handleAddStyleInterceptCallback = useCallback(() => {
    handleAddStyleIntercept();
  }, [handleAddStyleIntercept]);

  const cancelRemoveStyle = () => {
    setConfirm(null);
  };

  const filteredClasses = useMemo(() => {
    return Object.entries(tailwindClasses)
      .filter(([, classInfo]) => {
        switch (styleFilter) {
          case "popular":
            return classInfo.priority <= 1;
          case "advanced":
            return classInfo.priority <= 2;
          case "effects":
            return true;
          default:
            return false;
        }
      })
      .filter(([, classInfo]) =>
        classInfo.title.toLowerCase().includes(query.toLowerCase())
      );
  }, [styleFilter, query]);

  const ClassTag = (className: string) => (
    <div key={className} className="flex items-center">
      {!confirm || confirm !== className ? (
        <>
          <button
            className="peer text-md py-1 px-1 mr-4 bg-mywhite text-black rounded-md hover:bg-yellow-300 shadow hover:underline"
            title={`Adjust ${
              typeof tailwindClasses[className] !== `undefined`
                ? tailwindClasses[className].title
                : className
            }`}
            onClick={() => {
              setSelectedStyle(className);
              setConfirm(null);
            }}
          >
            {typeof tailwindClasses[className] !== `undefined`
              ? tailwindClasses[className].title
              : className}
          </button>
          <button
            className="ml-[-1rem] py-1 px-0.5 bg-myorange/10 text-myorange font-bold rounded-full hover:bg-myorange/50 hover:text-black peer-hover:invisible shadow"
            title="Remove style"
            onClick={() => {
              removeStyleIntercept(className);
            }}
          >
            <XMarkIcon className="w-3 h-6" />
          </button>
        </>
      ) : (
        <>
          <button
            className="text-md py-1 pl-1.5 pr-3 bg-myorange/20 text-black rounded-md hover:bg-myorange/50"
            title="Remove style"
            onClick={() => removeStyleIntercept(className)}
          >
            <span className="flex flex-nowrap">
              Are you sure
              <CheckIcon className="w-5 h-5" />
            </span>
          </button>
          <button
            className="ml-[-0.5rem] p-1 bg-black text-white font-bold rounded-full hover:bg-myorange hover:text-white"
            title="Keep style"
            onClick={() => {
              cancelRemoveStyle();
            }}
          >
            <XMarkIcon className="w-3 h-5" />
          </button>
        </>
      )}
    </div>
  );

  useEffect(() => {
    if (
      $editMode?.type === "pane" &&
      $editMode?.mode === "styles" &&
      $editMode?.targetId?.mustConfig
    ) {
      if ($editMode?.targetId?.tag === `img`) {
        setImageMeta(true);
        setActiveTag(`img`);
      } else if ($editMode?.targetId?.tag === `code`) {
        setWidgetConfigMode(true);
        handleWidgetConfig();
      }
    }
  }, [$editMode]);

  useEffect(() => {
    const thisTabs: StyleTab[] = [];
    if (isImage) thisTabs.push({ name: `Image`, tag: `img`, priority: 1 });
    else if (isCodeItem)
      thisTabs.push({ name: `Widget`, tag: `code`, priority: 1 });
    else if (thisTagTitle && !isListItem)
      thisTabs.push({ name: thisTagTitle, tag: thisTag, priority: 0 });
    if (isListItem && thisTag) {
      thisTabs.push({ name: `List Item`, tag: `li`, priority: 2 });
      thisTabs.push({ name: `List Container`, tag: thisTag, priority: 3 });
    }
    if (hasModal)
      thisTabs.push({ name: `Modal Styles`, tag: `modal`, priority: 3 });
    if (!hasTextShapeOutside)
      thisTabs.push({ name: `Pane Styles`, tag: `parent`, priority: 4 });
    setSelectedStyle(null);
    setParentLayer(0);
    setTabs(thisTabs);
    setActiveTag(thisTabs[0].tag);
    setMobileValue(``);
    setTabletValue(``);
    setDesktopValue(``);
    if (targetId.buttonTarget && !linkTargetKey) {
      setLinkTargetKey(targetId.buttonTarget);
      setLinkMode(`button`);
    }
  }, [id, targetId]);

  const sortByActiveTag = (arr: StyleTab[], activeTag: Tag): StyleTab[] => {
    return [...arr].sort((a, b) => {
      if (a.tag === activeTag && b.tag !== activeTag) return -1;
      if (b.tag === activeTag && a.tag !== activeTag) return 1;
      if (a.tag === activeTag && b.tag === activeTag) return 0;
      return a.priority - b.priority;
    });
  };

  const mergeClassesWithAllOverrides = (
    classNamesPayload: ClassNamesPayloadInnerDatum
  ): ClassNamesPayloadDatumValue => {
    const mergedClasses: ClassNamesPayloadDatumValue = Array.isArray(
      classNamesPayload.classes
    )
      ? {}
      : { ...classNamesPayload.classes };
    const globalNth = targetId.globalNth || 0;
    if (classNamesPayload.override) {
      Object.entries(classNamesPayload.override).forEach(
        ([className, overrides]) => {
          if (globalNth in overrides) {
            mergedClasses[className] = overrides[globalNth];
          }
        }
      );
    }
    return mergedClasses;
  };

  const handlePasteStyles = (
    pastedPayload: ClassNamesPayloadDatumValue | ClassNamesPayloadDatumValue[]
  ) => {
    if (linkMode) {
      const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);
      if (!currentField.current.payload.optionsPayload.buttons) {
        currentField.current.payload.optionsPayload.buttons = {};
      }
      if (!currentField.current.payload.optionsPayload.buttons[linkTargetKey]) {
        currentField.current.payload.optionsPayload.buttons[linkTargetKey] = {
          urlTarget: linkTargetKey,
          callbackPayload: "",
          className: "",
          classNamesPayload: {
            button: { classes: {} },
            hover: { classes: {} },
          },
        };
      }
      if (Array.isArray(pastedPayload) && pastedPayload.length === 2) {
        currentField.current.payload.optionsPayload.buttons[
          linkTargetKey
        ].classNamesPayload.button.classes = pastedPayload[0];
        currentField.current.payload.optionsPayload.buttons[
          linkTargetKey
        ].classNamesPayload.hover.classes = pastedPayload[1];
        updateStoreField("paneFragmentMarkdown", currentField.current);
        lastInteractedTypeStore.set(`markdown`);
        lastInteractedPaneStore.set(targetId.paneId);
      }
    } else if (activeTag) {
      if (activeTag === "parent") {
        const currentField = cloneDeep(
          $paneFragmentMarkdown[markdownFragmentId]
        );
        const payloadForTag = currentField.current.payload.optionsPayload
          .classNamesPayload.parent as ClassNamesPayloadInnerDatum;
        if (
          Array.isArray(pastedPayload) &&
          Array.isArray(payloadForTag.classes)
        ) {
          payloadForTag.classes = pastedPayload;
        }
        updateStoreField("paneFragmentMarkdown", {
          ...currentField.current,
          payload: {
            ...currentField.current.payload,
            optionsPayload: {
              ...currentField.current.payload.optionsPayload,
              classNamesPayload: {
                ...currentField.current.payload.optionsPayload
                  .classNamesPayload,
                parent: payloadForTag,
              },
            },
          },
        });
        lastInteractedTypeStore.set(`markdown`);
        lastInteractedPaneStore.set(targetId.paneId);
      } else {
        const currentField = cloneDeep(
          $paneFragmentMarkdown[markdownFragmentId]
        );
        const payloadForTag = currentField.current.payload.optionsPayload
          .classNamesPayload[activeTag] as ClassNamesPayloadInnerDatum;
        const currentGlobalNth = targetId.globalNth ?? null;
        if (payloadForTag.override && currentGlobalNth !== null) {
          Object.keys(payloadForTag.override).forEach(className => {
            if (
              typeof currentGlobalNth === `number` &&
              payloadForTag.override![className][currentGlobalNth] !== undefined
            ) {
              delete payloadForTag.override![className][currentGlobalNth];
            }
            if (Object.keys(payloadForTag.override![className]).length === 0) {
              delete payloadForTag.override![className];
            }
          });
          if (Object.keys(payloadForTag.override).length === 0) {
            delete payloadForTag.override;
          }
        }
        payloadForTag.classes = {
          ...payloadForTag.classes,
          ...pastedPayload,
        };
        updateStoreField("paneFragmentMarkdown", {
          ...currentField.current,
          payload: {
            ...currentField.current.payload,
            optionsPayload: {
              ...currentField.current.payload.optionsPayload,
              classNamesPayload: {
                ...currentField.current.payload.optionsPayload
                  .classNamesPayload,
                [activeTag]: payloadForTag,
              },
            },
          },
        });
        lastInteractedTypeStore.set(`markdown`);
        lastInteractedPaneStore.set(targetId.paneId);
      }
    }
  };

  useEffect(() => {
    if (activeTag)
      setTabs(prevItems =>
        prevItems && activeTag ? sortByActiveTag(prevItems, activeTag) : null
      );
  }, [activeTag]);

  const activeTagData = useMemo(() => {
    return getActiveTagData(
      activeTag,
      selectedStyle,
      markdownLookup,
      targetId,
      classNamesPayload || null,
      modalClassNamesPayload,
      parentClassNamesPayload,
      parentLayer
    );
  }, [
    activeTag,
    selectedStyle,
    markdownLookup,
    targetId,
    classNamesPayload,
    modalClassNamesPayload,
    parentClassNamesPayload,
    parentLayer,
  ]);

  useEffect(() => {
    if (activeTagData) {
      setMobileValue(String(activeTagData.mobileVal ?? ""));
      setTabletValue(String(activeTagData.tabletVal ?? ""));
      setDesktopValue(String(activeTagData.desktopVal ?? ""));
    } else {
      // Reset values when activeTagData is null or undefined
      setMobileValue("");
      setTabletValue("");
      setDesktopValue("");
    }
  }, [activeTagData]);

  const Nav = () =>
    !linkTargetKey &&
    tabs &&
    !widgetConfigMode && (
      <>
        <div className="flex justify-between items-center">
          <nav aria-label="Tabs" className="flex space-x-4 mt-4 mb-1 mr-6">
            {tabs.map((tab: StyleTab, idx: number) => (
              <button
                key={idx}
                aria-current={tab.tag === activeTag ? "page" : undefined}
                onClick={() => {
                  setActiveTag(tab.tag);
                  setImageMeta(false);
                  setLinkTargetKey(``);
                  setLinkMode(null);
                  setSelectedStyle(null);
                  setAddClass(false);
                }}
                className={classNames(
                  tab.tag === activeTag
                    ? "text-black font-bold"
                    : "text-mydarkgrey hover:text-black underline",
                  "text-md"
                )}
              >
                {tab.name}
              </button>
            ))}
          </nav>
          <div className="flex flex-nowrap gap-x-4">
            {hasHistory ? (
              <button
                onClick={() => {
                  handleUndo("paneFragmentMarkdown", markdownFragmentId);
                  setImageMeta(false);
                  setLinkTargetKey(``);
                  setLinkMode(null);
                  setSelectedStyle(null);
                  setAddClass(false);
                }}
                className="bg-mygreen/50 hover:bg-myorange text-black px-2 py-1 rounded"
                disabled={
                  $paneFragmentMarkdown[markdownFragmentId]?.history.length ===
                  0
                }
              >
                Undo
              </button>
            ) : null}
            {activeTag && (
              <StyleMemory
                currentKey={activeTag}
                classNamesPayload={
                  activeTag === `parent` &&
                  parentClassNamesPayload?.classes &&
                  Array.isArray(parentClassNamesPayload.classes)
                    ? parentClassNamesPayload.classes
                    : activeTag === `modal`
                      ? modalClassNamesPayload?.classes || {}
                      : mergeClassesWithAllOverrides(
                          classNamesPayload || { classes: {} }
                        )
                }
                onPaste={handlePasteStyles}
              />
            )}
          </div>
        </div>

        <hr />
      </>
    );

  const WidgetConfigMode = () =>
    widgetConfigMode && (
      <div>
        <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
          <Widget
            id={widgetData[0]}
            values={widgetData.slice(1)}
            paneId={targetId.paneId}
            outerIdx={targetId.outerIdx}
            idx={targetId.idx}
          />
        </div>
        <span className="flex gap-x-6">
          <button
            className="my-2 underline"
            title="Close Widget Config panel"
            onClick={() => {
              setSelectedStyle(null);
              setAddClass(false);
              setWidgetConfigMode(false);
            }}
          >
            BACK
          </button>
          {activeTag === `code` && (
            <button
              className="my-2 underline"
              title="Apply styles to widget"
              onClick={() => {
                handleWidgetStyle();
              }}
            >
              STYLE THIS WIDGET
            </button>
          )}
        </span>
      </div>
    );

  const AppliedStyles = () =>
    !imageMeta &&
    !linkTargetKey &&
    !widgetConfigMode &&
    activeTag &&
    ![`parent`, `modal`].includes(activeTag) && (
      <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
        {classNamesPayload?.classes &&
        Object.keys(classNamesPayload.classes).length ? (
          Object.keys(classNamesPayload.classes).map(className =>
            ClassTag(className)
          )
        ) : (
          <span>No styles</span>
        )}
      </div>
    );

  const IsLinkNav = () =>
    linkTargetKey && (
      <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
        <span className="flex gap-x-6 w-full">
          <button
            className="my-2 underline"
            title={!linkMode ? `Style this Link` : `Configure this Link`}
            onClick={() => {
              if (linkMode) setLinkMode(null);
              else setLinkMode(`button`);
              setSelectedStyle(null);
              setAddClass(false);
            }}
          >
            {!linkMode ? `STYLE THIS LINK` : `CONFIGURE THIS LINK`}
          </button>
          {linkMode && (
            <button
              className="my-2 underline"
              title="Add a Style to this"
              onClick={() => {
                setSelectedStyle(null);
                setAddClass(!addClass);
              }}
            >
              {!addClass ? `ADD STYLE` : `ALL STYLES`}
            </button>
          )}
          {selectedStyle && (
            <button
              className="my-2 underline"
              title="All Styles"
              onClick={() => {
                setSelectedStyle(null);
              }}
            >
              ALL STYLES
            </button>
          )}
          <button
            className="my-2 underline"
            title="Close Links panel"
            onClick={() => {
              setSelectedStyle(null);
              setAddClass(false);
              setLinkMode(null);
              setLinkTargetKey(``);
            }}
          >
            CLOSE
          </button>
        </span>
      </div>
    );

  const IsParent = () =>
    activeTag === `parent` && (
      <>
        <div className="bg-myblue/5 text-md mt-2 px-2 flex flex-wrap gap-x-2 gap-y-1.5">
          <span className="py-1">Layer:</span>
          <button
            onClick={() => {
              handleAddLayer(true);
            }}
            title="Insert layer before"
            className="py-1 px-1.5 rounded-md text-sm text-mydarkgrey hover:text-black hover:bg-myorange/20"
          >
            +
          </button>
          {parentClassNamesPayload?.classes &&
            Object.keys(parentClassNamesPayload?.classes).map(
              (_, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setParentLayer(idx);
                    setSelectedStyle(null);
                  }}
                  className={classNames(
                    "py-1 px-1.5 rounded-md",
                    idx !== parentLayer
                      ? "text-md underline underline-offset-2 text-mydarkgrey hover:text-black hover:bg-myorange/20"
                      : "text-md text-black bg-myorange/50 font-bold pointer-events-none"
                  )}
                >
                  {idx + 1}
                </button>
              )
            )}
          {parentClassNamesPayload?.classes &&
            Array.isArray(parentClassNamesPayload?.classes) &&
            parentClassNamesPayload?.classes[parentLayer] &&
            typeof Object.keys(parentClassNamesPayload?.classes[parentLayer])
              .length === `number` && (
              <button
                onClick={() => {
                  handleAddLayer(false);
                }}
                title="Insert layer after"
                className="py-1 px-1.5 rounded-md text-sm text-mydarkgrey hover:text-black hover:bg-myorange/20"
              >
                +
              </button>
            )}
        </div>
        <hr />
        <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
          {parentClassNamesPayload?.classes &&
          Array.isArray(parentClassNamesPayload?.classes) &&
          parentClassNamesPayload?.classes[parentLayer] &&
          typeof Object.keys(parentClassNamesPayload?.classes[parentLayer])
            .length === `number` ? (
            Object.keys(parentClassNamesPayload?.classes[parentLayer]).map(
              className => ClassTag(className)
            )
          ) : (
            <div>
              No styles.{" "}
              <button
                className="font-bold underline"
                onClick={() => {
                  handleDeleteLayer();
                }}
              >
                Delete layer.
              </button>
            </div>
          )}
        </div>
      </>
    );

  const IsModal = () =>
    activeTag === `modal` && (
      <div className="mt-2 flex flex-wrap gap-x-1.5 gap-y-1.5">
        {modalClassNamesPayload?.classes ? (
          Object.keys(modalClassNamesPayload?.classes).map(className =>
            ClassTag(className)
          )
        ) : (
          <span>No styles</span>
        )}
      </div>
    );

  const SecondaryNav = () =>
    !imageMeta &&
    !linkTargetKey &&
    !widgetConfigMode && (
      <span className="flex gap-x-6">
        <button
          className="my-2 underline"
          title="Add a Style to this"
          onClick={() => {
            setSelectedStyle(null);
            setAddClass(!addClass);
          }}
        >
          {!addClass ? `ADD STYLE` : `CANCEL ADD STYLE`}
        </button>
        {selectedStyle && (
          <button
            className="my-2 underline"
            title="Cancel Edit Style"
            onClick={() => {
              setSelectedStyle(null);
            }}
          >
            SHOW ALL STYLES
          </button>
        )}
        {activeTag === `img` && (
          <button
            className="my-2 underline"
            title="Edit Image Metadata"
            onClick={() => {
              setImageMeta(true);
              setAddClass(false);
            }}
          >
            IMAGE DESCRIPTION
          </button>
        )}
        {activeTag === `code` && (
          <button
            className="my-2 underline"
            title="Configure Widget"
            onClick={() => {
              handleWidgetConfig();
            }}
          >
            CONFIGURE WIDGET
          </button>
        )}
        {markdownLookup?.linksLookup[targetId.outerIdx] &&
          Object.keys(markdownLookup.linksLookup[targetId.outerIdx]).length && (
            <button
              className="my-2 underline"
              title="Manage Links"
              onClick={() => {
                setLinkTargetKey(linkTargetKey || targetId.buttonTarget || `*`);
                setLinkMode(null);
                setSelectedStyle(null);
                setAddClass(false);
                if (thisTag) setActiveTag(thisTag);
              }}
            >
              MANAGE LINKS
            </button>
          )}
      </span>
    );

  const SelectedStyle = () =>
    selectedStyle ? (
      <div className="mt-6">
        <div className="bg-white shadow-inner rounded">
          <div className="px-6 py-4">
            <h4 className="text-lg">
              <strong>{tailwindClasses[selectedStyle].title}</strong> on{" "}
              {isLink || activeTagData?.hasOverride ? (
                <span className="underline font-bold text-mydarkgrey">
                  THIS
                </span>
              ) : (
                <span className="underline font-bold text-mydarkgrey">ALL</span>
              )}{" "}
              {isLink ? `Button` : tabs?.length && tagTitles[tabs.at(0)!.tag]}
              {isLink ? null : !activeTagData?.hasOverride ? `s` : null}
            </h4>
            <div className="flex flex-col gap-y-2.5 my-3 text-mydarkgrey text-xl">
              {COLOR_STYLES.includes(selectedStyle as ColorStyle) ? (
                <>
                  <div className="flex items-center">
                    <div className="flex-grow">
                      <ViewportComboBox
                        value={mobileValue}
                        onFinalChange={handleFinalChangeIntercept}
                        values={activeTagData?.values ?? []}
                        viewport="mobile"
                        allowNegative={activeTagData?.allowNegative ?? false}
                        isNegative={activeTagData?.mobileIsNegative ?? false}
                      />
                    </div>
                    <div className="ml-2">
                      <ColorPickerWrapper
                        id="mobile-color"
                        defaultColor={getComputedColor(tailwindToHex(mobileValue))}
                        onColorChange={(color) =>
                          handleFinalChangeIntercept(hexToTailwind(color) || color, "mobile")
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-grow">
                      <ViewportComboBox
                        value={tabletValue}
                        onFinalChange={handleFinalChangeIntercept}
                        values={activeTagData?.values ?? []}
                        viewport="tablet"
                        allowNegative={activeTagData?.allowNegative}
                        isNegative={activeTagData?.tabletIsNegative ?? false}
                        isInferred={tabletValue === mobileValue}
                      />
                    </div>
                    <div className="ml-2">
                      <ColorPickerWrapper
                        id="tablet-color"
                        defaultColor={getComputedColor(tailwindToHex(tabletValue))}
                        onColorChange={(color) =>
                          handleFinalChangeIntercept(hexToTailwind(color) || color, "tablet")
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-grow">
                      <ViewportComboBox
                        value={desktopValue}
                        onFinalChange={handleFinalChangeIntercept}
                        values={activeTagData?.values ?? []}
                        viewport="desktop"
                        allowNegative={activeTagData?.allowNegative ?? false}
                        isNegative={activeTagData?.desktopIsNegative ?? false}
                        isInferred={desktopValue === tabletValue}
                      />
                    </div>
                    <div className="ml-2">
                      <ColorPickerWrapper
                        id="desktop-color"
                        defaultColor={getComputedColor(tailwindToHex(desktopValue))}
                        onColorChange={(color) =>
                          handleFinalChangeIntercept(hexToTailwind(color) || color, "desktop")
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Original version without color picker
                <>
                  <ViewportComboBox
                    value={mobileValue}
                    onFinalChange={handleFinalChangeIntercept}
                    values={activeTagData?.values ?? []}
                    viewport="mobile"
                    allowNegative={activeTagData?.allowNegative ?? false}
                    isNegative={activeTagData?.mobileIsNegative ?? false}
                  />
                  <ViewportComboBox
                    value={tabletValue}
                    onFinalChange={handleFinalChangeIntercept}
                    values={activeTagData?.values ?? []}
                    viewport="tablet"
                    allowNegative={activeTagData?.allowNegative}
                    isNegative={activeTagData?.tabletIsNegative ?? false}
                    isInferred={tabletValue === mobileValue}
                  />
                  <ViewportComboBox
                    value={desktopValue}
                    onFinalChange={handleFinalChangeIntercept}
                    values={activeTagData?.values ?? []}
                    viewport="desktop"
                    allowNegative={activeTagData?.allowNegative ?? false}
                    isNegative={activeTagData?.desktopIsNegative ?? false}
                    isInferred={desktopValue === tabletValue}
                  />
                </>
              )}
            </div>

            {!isLink &&
            tabs?.length &&
            ![`Pane Styles`, `Modal Styles`].includes(
              tagTitles[tabs.at(0)!.tag]
            ) &&
            (mobileValue ||
              tabletValue ||
              desktopValue ||
              activeTagData?.hasOverride) ? (
              <div className="flex items-center mt-4">
                <Switch
                  checked={activeTagData?.hasOverride}
                  onChange={toggleOverride}
                  className={`${
                    activeTagData?.hasOverride ? "bg-myorange" : "bg-mydarkgrey"
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      activeTagData?.hasOverride
                        ? "translate-x-6"
                        : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <div className="ml-3">
                  <div className="text-md text-black font-bold">
                    {!activeTagData?.hasOverride
                      ? `Quick style mode`
                      : `Custom styles`}
                  </div>
                  <div className="text-md text-mydarkgrey">
                    {!activeTagData?.hasOverride
                      ? `all ${tagTitles[tabs?.at(0)!.tag] ?? `common element`}s (in this pane)`
                      : `on this ${tagTitles[tabs?.at(0)!.tag] ?? `element`} only`}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  const memoizedIsImage = useMemo(
    () =>
      imageMeta &&
      activeTag &&
      activeTag === `img` &&
      typeof targetId?.globalNth === `number` &&
      typeof targetId?.idx === `number` && (
        <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
          <MemoizedImageMeta
            paneId={targetId.paneId}
            outerIdx={targetId.outerIdx}
            idx={targetId.idx}
            files={files}
          />
          <span className="flex gap-x-6 w-full">
            <button
              className="my-2 underline"
              title="Edit Image Metadata"
              onClick={() => {
                setImageMeta(false);
              }}
            >
              STYLE IMAGE
            </button>
          </span>
        </div>
      ),
    [imageMeta, activeTag, targetId, files, setImageMeta]
  );

  const memoizedIsLink = useMemo(
    () =>
      linkTargetKey && (
        <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
          {linkMode && linkTargetKey !== `*` ? (
            <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
              {linkMode && linkTargetKey !== `*` ? (
                <div>
                  <div className="flex flex-nowrap justify-between">
                    <div className="flex flex-nowrap gap-x-4">
                      <button
                        className={classNames(
                          linkMode === `button` ? `font-bold` : `underline`,
                          "my-2"
                        )}
                        title="Button Styles"
                        onClick={() => {
                          setLinkMode(`button`);
                          setSelectedStyle(null);
                        }}
                      >
                        Button Styles
                      </button>
                      <button
                        className={classNames(
                          linkMode === `hover` ? `font-bold` : `underline`,
                          "my-2"
                        )}
                        title="Hover Styles"
                        onClick={() => {
                          setLinkMode(`hover`);
                          setSelectedStyle(null);
                        }}
                      >
                        Hover Styles
                      </button>
                    </div>
                    <StyleMemory
                      currentKey="button"
                      classNamesPayload={buttonClassNamesPayloadArray}
                      onPaste={handlePasteStyles}
                    />
                  </div>
                  <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
                    {classNamesPayload?.classes &&
                    Object.keys(classNamesPayload.classes).length ? (
                      Object.keys(classNamesPayload.classes).map(className =>
                        ClassTag(className)
                      )
                    ) : (
                      <div className="w-full">
                        <label
                          htmlFor="button-style-listbox"
                          className="block text-sm text-mydarkgrey mb-2"
                        >
                          Apply default button styles
                        </label>
                        <Listbox
                          value={buttonStyleOptions.at(0)}
                          onChange={handleButtonStyleChange}
                        >
                          <div className="relative mt-1">
                            <Listbox.Button
                              ref={buttonStyleListboxRef}
                              className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-myorange focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 xs:text-sm"
                            >
                              <span className="block truncate">
                                {buttonStyleOptions.at(0)}
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon
                                  className="h-5 w-5 text-mydarkgrey"
                                  aria-hidden="true"
                                />
                              </span>
                            </Listbox.Button>
                            <Listbox.Options
                              className={`absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm ${
                                buttonStyleOpenAbove
                                  ? "bottom-full mb-1"
                                  : "top-full mt-1"
                              }`}
                              style={{ maxHeight: `${buttonStyleMaxHeight}px` }}
                            >
                              {buttonStyleOptions.map((option, idx) => (
                                <Listbox.Option
                                  key={option}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                      active
                                        ? "bg-myorange/10 text-black"
                                        : "text-black"
                                    }`
                                  }
                                  value={idx}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span
                                        className={`block truncate ${
                                          selected ? "font-bold" : "font-normal"
                                        }`}
                                      >
                                        {option}
                                      </span>
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </div>
                        </Listbox>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <LinksMeta
                  paneId={targetId.paneId}
                  target={linkTargetKey}
                  setLinkTarget={setLinkTargetKey}
                />
              )}
            </div>
          ) : (
            <MemoizedLinksMeta
              paneId={targetId.paneId}
              target={linkTargetKey}
              setLinkTarget={setLinkTargetKey}
            />
          )}
        </div>
      ),
    [linkTargetKey, linkMode, targetId.paneId, setLinkTargetKey]
  );

  const memoizedAddClass = useMemo(
    () =>
      addClass && (
        <MemoizedAddClass
          styleFilter={styleFilter}
          setStyleFilter={setStyleFilter}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          setQuery={setQuery}
          filteredClasses={filteredClasses}
          handleAddStyleIntercept={handleAddStyleInterceptCallback}
        />
      ),
    [
      addClass,
      styleFilter,
      selectedClass,
      filteredClasses,
      handleAddStyleInterceptCallback,
    ]
  );

  if (!tabs) return null;

  return (
    <div>
      <div>
        {!linkTargetKey && !widgetConfigMode && <Nav />}
        {widgetConfigMode && <WidgetConfigMode />}
        {!imageMeta &&
          !linkTargetKey &&
          !widgetConfigMode &&
          activeTag &&
          !selectedStyle &&
          !addClass &&
          ![`parent`, `modal`].includes(activeTag) && <AppliedStyles />}
        {memoizedIsLink}
        {linkTargetKey && <IsLinkNav />}
        {memoizedIsImage}
        {!addClass && !selectedStyle && activeTag === `parent` && <IsParent />}
        {!addClass && !selectedStyle && activeTag === `modal` && <IsModal />}
        {!imageMeta && !linkTargetKey && !widgetConfigMode && <SecondaryNav />}
      </div>
      {memoizedAddClass}
      {selectedStyle && !addClass && <SelectedStyle />}
    </div>
  );
};
