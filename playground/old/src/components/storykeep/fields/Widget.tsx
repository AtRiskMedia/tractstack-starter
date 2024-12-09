import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import ContentEditableField from "../components/ContentEditableField";
import {
  paneFragmentMarkdown,
  paneMarkdownFragmentId,
  lastInteractedTypeStore,
  lastInteractedPaneStore,
} from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep";
import {
  updateMarkdownElement,
  extractMarkdownElement,
  markdownToHtmlAst,
} from "../../../utils/compositor/markdownUtils";
import { cloneDeep } from "../../../utils/helpers";
import { widgetMeta } from "../../../constants";

interface WidgetProps {
  id: string;
  values: string[];
  paneId: string;
  outerIdx: number;
  idx: number | null;
}

const Widget = ({ id, values, paneId, outerIdx, idx }: WidgetProps) => {
  const [widgetValues, setWidgetValues] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const $paneMarkdownFragmentId = useStore(paneMarkdownFragmentId, {
    keys: [paneId],
  });
  const markdownFragmentId = $paneMarkdownFragmentId[paneId]?.current;
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId || ""],
  });
  const { updateStoreField, handleUndo } = useStoryKeepUtils(markdownFragmentId || "");

  const meta = useMemo(() => widgetMeta[id] || { valueDefaults: [], multi: [] }, [id]);

  const extractWidgetValues = useCallback(() => {
    if (
      !markdownFragmentId ||
      !$paneFragmentMarkdown[markdownFragmentId]?.current?.markdown?.body
    ) {
      return values.length > 0 ? values : meta.valueDefaults;
    }
    const content = extractMarkdownElement(
      $paneFragmentMarkdown[markdownFragmentId].current.markdown.body,
      "code",
      outerIdx,
      idx
    );
    const match = content.match(/(\w+)\((.*?)\)/);
    if (match) {
      const [, , valuesString] = match;
      return valuesString
        .split("|")
        .map((value, index) =>
          meta.multi[index] && value === "" ? meta.valueDefaults[index] : value
        );
    }
    return values.length > 0 ? values : meta.valueDefaults;
  }, [markdownFragmentId, $paneFragmentMarkdown, outerIdx, idx, values, meta]);

  useEffect(() => {
    if (!isEditing) {
      const extractedValues = extractWidgetValues();
      setWidgetValues(extractedValues);
    }
  }, [$paneFragmentMarkdown, markdownFragmentId, isEditing]);

  const handleValueChange = useCallback(
    (index: number, subIndex: number | null, newValue: string) => {
      setIsEditing(true);
      setWidgetValues((prev) => {
        const newValues = [...prev];
        if (meta.multi[index]) {
          const values = newValues[index].split(",").map((v) => v.trim());
          if (subIndex !== null) {
            values[subIndex] = newValue;
          }
          newValues[index] = values.filter((v) => v !== "").join(",");
        } else {
          newValues[index] = newValue;
        }
        return newValues;
      });
      return true;
    },
    [meta]
  );

  const handleFinalChange = useCallback(() => {
    if (!markdownFragmentId) return;

    lastInteractedTypeStore.set(`markdown`);
    lastInteractedPaneStore.set(paneId);
    const currentField = cloneDeep($paneFragmentMarkdown[markdownFragmentId]);

    if (!currentField?.current?.markdown) return;

    const newContent = `${id}(${widgetValues.join("|")})`;
    const newBody = updateMarkdownElement(
      currentField.current.markdown.body,
      newContent,
      "code",
      outerIdx,
      idx
    );
    const newHtmlAst = markdownToHtmlAst(newBody);
    updateStoreField("paneFragmentMarkdown", {
      ...currentField.current,
      markdown: {
        ...currentField.current.markdown,
        body: newBody,
        htmlAst: newHtmlAst,
      },
    });
    setIsEditing(false);
  }, [
    id,
    widgetValues,
    markdownFragmentId,
    $paneFragmentMarkdown,
    paneId,
    outerIdx,
    idx,
    updateStoreField,
  ]);

  const addValue = useCallback((index: number) => {
    setIsEditing(true);
    setWidgetValues((prev) => {
      const newValues = [...prev];
      const values = newValues[index].split(",").map((v) => v.trim());
      values.push("");
      newValues[index] = values.join(",");
      return newValues;
    });
  }, []);

  const removeValue = useCallback(
    (index: number, subIndex: number) => {
      setIsEditing(true);
      setWidgetValues((prev) => {
        const newValues = [...prev];
        const values = newValues[index].split(",").map((v) => v.trim());
        values.splice(subIndex, 1);
        newValues[index] = values.length > 0 ? values.join(",") : meta.valueDefaults[index] || "";
        return newValues;
      });
    },
    [meta]
  );

  const handleUndoClick = useCallback(() => {
    if (markdownFragmentId) {
      handleUndo("paneFragmentMarkdown", markdownFragmentId);
      setIsEditing(false);
    }
  }, [handleUndo, markdownFragmentId]);

  if (!markdownFragmentId || !$paneFragmentMarkdown[markdownFragmentId]) {
    return <div>Loading widget data...</div>;
  }
  return (
    <div className="space-y-4 max-w-md min-w-80">
      <div className="flex flex-nowrap justify-between">
        <h3 className="text-lg font-bold">{meta.title}</h3>
        <div className="flex justify-end">
          <button
            onClick={handleUndoClick}
            className="flex items-center text-myblack bg-mygreen/50 px-2 py-1 rounded hover:bg-myorange hover:text-white disabled:hidden"
            disabled={$paneFragmentMarkdown[markdownFragmentId]?.history.length === 0}
          >
            <ChevronDoubleLeftIcon className="h-5 w-5 mr-1" />
            Undo
          </button>
        </div>
      </div>

      {widgetValues.map((value, index) => (
        <div key={index} className="space-y-1">
          <label className="block text-sm text-mydarkgrey">
            {meta.valueLabels[index] || `Value ${index + 1}`}
          </label>
          {meta.multi[index] ? (
            <div className="space-y-1">
              {value.split(",").map((subValue, subIndex) => (
                <div key={subIndex} className="flex items-center space-x-2">
                  <ContentEditableField
                    id={`widget-value-${index}-${subIndex}`}
                    value={subValue.trim()}
                    onChange={(newValue) => handleValueChange(index, subIndex, newValue)}
                    onEditingChange={handleFinalChange}
                    placeholder={`Enter ${meta.valueLabels[index] || "value"}`}
                    className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
                  />
                  <button
                    onClick={() => removeValue(index, subIndex)}
                    className="text-myorange hover:text-black"
                    title="Remove value"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addValue(index)}
                className="text-myblue hover:text-black flex items-center"
                title="Add value"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                <span>Add {meta.valueLabels[index] || "Value"}</span>
              </button>
            </div>
          ) : (
            <ContentEditableField
              id={`widget-value-${index}`}
              value={value}
              onChange={(newValue) => handleValueChange(index, null, newValue)}
              onEditingChange={handleFinalChange}
              placeholder={`Enter ${meta.valueLabels[index] || "value"}`}
              className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Widget;
