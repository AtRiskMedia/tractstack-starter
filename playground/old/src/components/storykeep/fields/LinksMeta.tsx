import { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  paneMarkdownFragmentId,
  paneFragmentMarkdown,
  lastInteractedTypeStore,
  lastInteractedPaneStore,
} from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep";
import { cloneDeep, classNames } from "../../../utils/helpers";
import { cleanHtmlAst, findLinkNodes } from "../../../utils/compositor/markdownUtils";
import ContentEditableField from "../components/ContentEditableField";
import { toHast } from "mdast-util-to-hast";
import { toMarkdown } from "mdast-util-to-markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import { generateMarkdownLookup } from "../../../utils/compositor/generateMarkdownLookup";
import type { Root, Element } from "hast";
import type { Root as MdastRoot } from "mdast";
import type { ButtonData } from "../../../types";
import type { Dispatch, SetStateAction } from "react";

interface LinkData extends ButtonData {
  text: string;
  outerIdx: number;
  idx: number;
  index: number;
}

interface LinksMetaProps {
  paneId: string;
  target: string | null;
  setLinkTarget: Dispatch<SetStateAction<string>>;
}

const LinksMeta = (props: LinksMetaProps) => {
  const { paneId, target, setLinkTarget } = props;
  const [index, setIndex] = useState(0);
  const $paneMarkdownFragmentId = useStore(paneMarkdownFragmentId, {
    keys: [paneId],
  });
  const markdownFragmentId = $paneMarkdownFragmentId[paneId]?.current;
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId],
  });
  const markdownFragment = $paneFragmentMarkdown[markdownFragmentId]?.current;

  const { updateStoreField } = useStoryKeepUtils(markdownFragmentId);

  const [links, setLinks] = useState<Record<string, LinkData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (markdownFragment?.markdown) {
      const mdast = fromMarkdown(markdownFragment.markdown.body);
      const hast = cleanHtmlAst(toHast(mdast) as Root);
      const lookup =
        hast && "type" in hast && hast.type === "root" ? generateMarkdownLookup(hast) : null;
      const initialLinks: Record<string, LinkData> = {};
      let count = 0;

      if (lookup) {
        const linkNodes = findLinkNodes(hast as Element);
        linkNodes.forEach((node, index) => {
          const href = node.properties?.href as string;
          const text = (
            node.children[0] && "value" in node.children[0] ? node.children[0].value : ""
          ) as string;
          if (href) {
            const buttonData =
              markdownFragment.payload.optionsPayload.buttons?.[href as keyof ButtonData];
            const linkInfo = lookup.links[index];
            initialLinks[href] = {
              urlTarget: href,
              text: text,
              callbackPayload: buttonData?.callbackPayload || "",
              className: buttonData?.className || "",
              classNamesPayload: buttonData?.classNamesPayload || {},
              outerIdx: linkInfo ? linkInfo.parentNth : 0,
              idx: linkInfo ? linkInfo.childNth : 0,
              index: count,
            };
            if (target && target === href) setIndex(count);
            count++;
          }
        });
      }
      setLinks(initialLinks);
      setIsLoading(false);
      if (target === `*` && Object.keys(initialLinks).length)
        setLinkTarget(Object.keys(initialLinks)[0]);
    }
  }, [markdownFragment]);

  const updateLinkInMarkdown = (
    mdast: MdastRoot,
    outerIdx: number,
    idx: number,
    newText: string
  ): MdastRoot => {
    const newMdast = cloneDeep(mdast);
    let currentOuterIdx = 0;
    let linkFound = false;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    function traverseAndUpdate(node: any) {
      if (linkFound) return;

      if (currentOuterIdx === outerIdx) {
        let currentIdx = 0;
        if (Array.isArray(node.children)) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.type === "link") {
              if (currentIdx === idx) {
                // Update the link text
                node.children[i] = {
                  ...child,
                  children: [{ type: "text", value: newText }],
                };
                linkFound = true;
                return;
              }
            }
            currentIdx++;
            if (child.children) {
              traverseAndUpdate(child);
            }
          }
        }
      }

      if (node.type && ["paragraph", "list", "listItem", "heading"].includes(node.type)) {
        currentOuterIdx++;
      }
    }

    newMdast.children.forEach(traverseAndUpdate);

    return newMdast;
  };

  const updateStore = useCallback(
    (linkKey: string, field: "text" | "callbackPayload", currentLinkData: LinkData) => {
      if (!markdownFragmentId || !markdownFragment) return;
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(paneId);

      let mdast = fromMarkdown(markdownFragment.markdown.body);

      if (field === "text") {
        mdast = updateLinkInMarkdown(
          mdast,
          currentLinkData.outerIdx,
          currentLinkData.idx,
          currentLinkData.text
        );
      }

      const newBody = toMarkdown(mdast);
      const newHast = cleanHtmlAst(toHast(mdast) as Root);

      const updatedButtons: Record<string, ButtonData> = {
        ...(markdownFragment.payload.optionsPayload.buttons || {}),
      };
      if (!updatedButtons[linkKey]) {
        updatedButtons[linkKey] = {} as ButtonData;
      }
      updatedButtons[linkKey] = {
        ...updatedButtons[linkKey],
        [field]: currentLinkData[field],
      };

      updateStoreField("paneFragmentMarkdown", {
        ...markdownFragment,
        markdown: {
          ...markdownFragment.markdown,
          body: newBody,
          htmlAst: newHast,
        },
        payload: {
          ...markdownFragment.payload,
          optionsPayload: {
            ...markdownFragment.payload.optionsPayload,
            buttons: updatedButtons,
          },
        },
      });
    },
    [markdownFragmentId, markdownFragment, updateStoreField, paneId]
  );

  const handleLinkChange = useCallback(
    (linkKey: string, field: "text" | "callbackPayload", value: string) => {
      setLinks((prevLinks) => ({
        ...prevLinks,
        [linkKey]: {
          ...prevLinks[linkKey],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleEditingChange = useCallback(
    (editing: boolean, linkKey: string, field: "text" | "callbackPayload") => {
      if (!editing) {
        const currentLinkData = links[linkKey];
        if (currentLinkData) {
          updateStore(linkKey, field, currentLinkData);
        }
      }
    },
    [links, updateStore]
  );

  if (isLoading) {
    return <div>Loading links...</div>;
  }

  if (Object.keys(links).length === 0) {
    return <div>No links found in this pane.</div>;
  }

  return (
    <div>
      <div className="bg-myblue/5 text-md px-2 flex flex-wrap gap-x-2 gap-y-1.5">
        <span className="py-1">Link:</span>
        {Object.keys(links).map((linkKey, idx: number) => (
          <button
            key={idx}
            onClick={() => {
              setIndex(idx);
              setLinkTarget(linkKey);
            }}
            className={classNames(
              "py-1 px-1.5 rounded-md",
              idx !== index
                ? "text-md underline underline-offset-2 text-mydarkgrey hover:text-black hover:bg-myorange/20"
                : "text-md text-black bg-myorange/50 font-bold pointer-events-none"
            )}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <div key={Object.entries(links)[index]?.[0]} className="border p-4 rounded">
          <div className="space-y-2">
            {(["text", "callbackPayload"] as const).map((field) => (
              <div key={field}>
                <label
                  htmlFor={`${Object.entries(links)[index]?.[0]}-${field}`}
                  className="block text-sm text-mydarkgrey"
                >
                  {field === "text" ? "Link Text" : "Callback Payload"}
                </label>
                <ContentEditableField
                  id={`${Object.entries(links)[index]?.[0]}-${field}`}
                  value={Object.entries(links)[index]?.[1][field]}
                  onChange={(value) => {
                    handleLinkChange(Object.entries(links)[index]?.[0], field, value);
                    return true;
                  }}
                  onEditingChange={(editing) =>
                    handleEditingChange(editing, Object.entries(links)[index]?.[0], field)
                  }
                  placeholder={`Enter ${field === "text" ? "link text" : "callback payload"}`}
                  className="block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinksMeta;
