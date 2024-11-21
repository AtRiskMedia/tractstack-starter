import { useState, useEffect, useCallback, useRef, memo, type ReactElement } from "react";
import { useStore } from "@nanostores/react";
import { convertMarkdownToHtml, htmlToMarkdown } from "../../../utils/compositor/markdownUtils";
import {
  paneFragmentMarkdown,
  lastInteractedTypeStore,
  lastInteractedPaneStore,
  editModeStore,
} from "../../../store/storykeep";
import {
  updateMarkdownElement,
  markdownToHtmlAst,
  cleanHtmlAst,
} from "../../../utils/compositor/markdownUtils";
import { useStoryKeepUtils } from "../../../utils/storykeep";
import { generateMarkdownLookup } from "../../../utils/compositor/generateMarkdownLookup";
import type { ButtonData, ClassNamesPayloadDatumValue, MarkdownLookup } from "../../../types";
import type { KeyboardEvent, ClipboardEvent } from "react";
import type { Root } from "hast";
import { MoveDraggableElement } from "@/components/storykeep/components/MoveDraggableElement.tsx";

interface EditableContentProps {
  content: string;
  tag: string;
  paneId: string;
  markdownFragmentId: string;
  classes: string;
  outerIdx: number;
  idx: number | null;
  queueUpdate: (id: string, updateFn: () => void) => void;
  markdownLookup: MarkdownLookup;
  skipDragNDrop: boolean;
  id: string;
}

const EditableContent = ({
  content,
  tag,
  paneId,
  markdownFragmentId,
  classes,
  outerIdx,
  idx,
  queueUpdate,
  markdownLookup,
  skipDragNDrop,
  id,
}: EditableContentProps) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [internalContent, setInternalContent] = useState(content);
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId],
  });
  const { updateStoreField } = useStoryKeepUtils(markdownFragmentId, []);

  const findNewLinks = (html: string, existingButtons: Record<string, ButtonData>) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const links = tempDiv.querySelectorAll("a");
    return Array.from(links)
      .filter((link) => {
        const href = link.getAttribute("data-href");
        return href && !existingButtons[href];
      })
      .map((link) => ({
        href: link.getAttribute("data-href") || "",
        text: link.textContent || "",
      }));
  };

  const processContent = useCallback((htmlContent: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    const processBlockElement = (element: Element) => {
      // Only add spaces for elements that need them
      if (["p", "li"].includes(element.tagName.toLowerCase())) {
        const firstChild = element.firstChild;
        const lastChild = element.lastChild;
        // Add non-breaking space at the start if the first child is not a text node
        if (firstChild && firstChild.nodeType !== Node.TEXT_NODE) {
          const spaceSpan = document.createElement("span");
          spaceSpan.innerHTML = "&nbsp;";
          spaceSpan.setAttribute("data-space", "start");
          element.insertBefore(spaceSpan, firstChild);
        }
        // Add non-breaking space at the end if the last child is not a text node
        if (lastChild && lastChild.nodeType !== Node.TEXT_NODE) {
          const spaceSpan = document.createElement("span");
          spaceSpan.innerHTML = "&nbsp;";
          spaceSpan.setAttribute("data-space", "end");
          element.appendChild(spaceSpan);
        }
      }
      const links = element.getElementsByTagName("a");
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const href = link.getAttribute("href") || "";
        link.setAttribute("data-href", href);
        link.removeAttribute("href");
        link.classList.add("pointer-events-none");
      }
    };
    // Process block-level elements
    tempDiv.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li").forEach(processBlockElement);
    return tempDiv.innerHTML;
  }, []);

  const updateNanostore = useCallback(() => {
    if (!markdownFragmentId || !contentEditableRef.current) return;

    const newHtmlContent = convertMarkdownToHtml(contentEditableRef.current.innerHTML);
    const newMarkdown = htmlToMarkdown(newHtmlContent);
    const newBody = updateMarkdownElement(
      $paneFragmentMarkdown[markdownFragmentId].current.markdown.body,
      newMarkdown,
      tag,
      outerIdx,
      idx
    );

    const newHtmlAst = cleanHtmlAst(markdownToHtmlAst(newBody)) as Root;
    if (newHtmlAst) {
      const newMarkdownLookup = generateMarkdownLookup(newHtmlAst);

      let updatedFragment = {
        ...$paneFragmentMarkdown[markdownFragmentId]?.current,
        markdown: {
          ...$paneFragmentMarkdown[markdownFragmentId]?.current?.markdown,
          body: newBody,
          htmlAst: newHtmlAst,
        },
      };

      const newLinks = findNewLinks(
        newHtmlContent,
        updatedFragment.payload.optionsPayload.buttons || {}
      );
      if (newLinks.length > 0 && newMarkdownLookup) {
        const [newLink] = newLinks;
        const linkInfo = newMarkdownLookup.linksByTarget[newLink.href];
        if (linkInfo) {
          const newButtonPayload: ButtonData = {
            urlTarget: newLink.href,
            callbackPayload: "(goto (home))",
            className: "",
            classNamesPayload: {
              button: { classes: {} as ClassNamesPayloadDatumValue },
              hover: { classes: {} as ClassNamesPayloadDatumValue },
            },
          };
          updatedFragment = {
            ...updatedFragment,
            payload: {
              ...updatedFragment.payload,
              optionsPayload: {
                ...updatedFragment.payload.optionsPayload,
                buttons: {
                  ...updatedFragment.payload.optionsPayload.buttons,
                  [newLink.href]: newButtonPayload,
                },
              },
            },
          };
        }
      }

      queueUpdate(`${outerIdx}${idx !== null ? `-${idx}` : ""}-${markdownFragmentId}`, () => {
        lastInteractedTypeStore.set(`markdown`);
        lastInteractedPaneStore.set(paneId);
        updateStoreField("paneFragmentMarkdown", updatedFragment);
        if (newLinks.length > 0) {
          const [newLink] = newLinks;
          const linkInfo = newMarkdownLookup.linksByTarget[newLink.href];
          if (linkInfo) {
            editModeStore.set({
              id: paneId,
              mode: "styles",
              type: "pane",
              targetId: {
                paneId,
                outerIdx: linkInfo.parentNth,
                idx: linkInfo.childNth,
                globalNth: linkInfo.globalNth,
                tag: "a",
                buttonTarget: newLink.href,
              },
            });
          }
        }
      });
    }
  }, [
    markdownFragmentId,
    paneId,
    tag,
    outerIdx,
    idx,
    $paneFragmentMarkdown,
    updateStoreField,
    htmlToMarkdown,
    queueUpdate,
  ]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (contentEditableRef.current) {
      const updated = convertMarkdownToHtml(contentEditableRef.current.innerHTML);
      setInternalContent(updated);
    }
    updateNanostore();
  }, [updateNanostore]);

  const handlePaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    const sanitizedText = text
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(sanitizedText));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      if (contentEditableRef.current) {
        setInternalContent(contentEditableRef.current.innerHTML);
      }
    }
  }, []);

  useEffect(() => {
    setInternalContent(processContent(content));
  }, [content, processContent]);

  const drawContent = (): ReactElement => (
    <div
      ref={contentEditableRef}
      contentEditable={true}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPaste={handlePaste}
      className={classes}
      dangerouslySetInnerHTML={{ __html: internalContent }}
      tabIndex={0}
      role="textbox"
      aria-multiline="true"
      aria-label={`Editable ${tag} content`}
    />
  );

  return (skipDragNDrop ?
    drawContent() :
    <MoveDraggableElement
      skipDragNDrop={skipDragNDrop}
      fragmentId={markdownFragmentId}
      paneId={paneId}
      idx={idx}
      id={id}
      outerIdx={outerIdx}
      markdownLookup={markdownLookup}
      self={contentEditableRef}
    >
      {drawContent()}
    </MoveDraggableElement>
  );
};

export default memo(EditableContent);
