import { useStore } from "@nanostores/react";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { paneImpression } from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep/StoryKeep_utils";
import ContentEditableField from "./ContentEditableField";
import type { ImpressionDatum, StoreKey } from "../../../types";

interface PaneImpressionProps {
  id: string;
}

const PaneImpression = ({ id }: PaneImpressionProps) => {
  const $paneImpression = useStore(paneImpression, { keys: [id] });
  const { updateStoreField, handleEditingChange, handleUndo } = useStoryKeepUtils(id);

  const handleUpdateField = (field: keyof ImpressionDatum, value: string) => {
    const currentImpression = $paneImpression[id]?.current || { parentId: id };
    const updatedImpression = { ...currentImpression, [field]: value };
    updateStoreField("paneImpression", updatedImpression);
    return true;
  };

  const handleReset = () => {
    updateStoreField("paneImpression", null);
  };

  const commonClasses =
    "mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myorange focus:ring-indigo-500 xs:text-sm px-2 py-1";

  return (
    <div className="max-w-2xl flex flex-wrap gap-4">
      <div className="flex-grow">
        <label className="block text-sm text-black">Title</label>
        <ContentEditableField
          id="impression-title"
          value={$paneImpression[id]?.current?.title || ""}
          onChange={(value) => handleUpdateField("title", value)}
          onEditingChange={(editing) => handleEditingChange("paneImpression" as StoreKey, editing)}
          placeholder="Enter impression title"
          className={commonClasses}
        />
      </div>

      <div className="w-36">
        <label className="block text-sm text-black">Button Text</label>
        <ContentEditableField
          id="impression-button-text"
          value={$paneImpression[id]?.current?.buttonText || ""}
          onChange={(value) => handleUpdateField("buttonText", value)}
          onEditingChange={(editing) => handleEditingChange("paneImpression" as StoreKey, editing)}
          placeholder="Enter button text"
          className={commonClasses}
        />
      </div>

      <div className="flex items-end space-x-2">
        {$paneImpression[id]?.history.length > 0 && (
          <button
            onClick={() => handleUndo("paneImpression", id)}
            className="h-8 w-8 flex items-center justify-center rounded bg-mygreen/50 hover:bg-myorange hover:text-white"
            title="Undo"
          >
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleReset}
          className="h-8 w-8 flex items-center justify-center rounded bg-myorange/80 hover:bg-black text-white"
          title="Reset Impression"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="w-full">
        <label className="block text-sm text-black">Actions Lisp</label>
        <ContentEditableField
          id="impression-actions-lisp"
          value={$paneImpression[id]?.current?.actionsLisp || ""}
          onChange={(value) => handleUpdateField("actionsLisp", value)}
          onEditingChange={(editing) => handleEditingChange("paneImpression" as StoreKey, editing)}
          placeholder="Enter actions lisp"
          className={commonClasses}
        />
      </div>

      <div className="w-full">
        <label className="block text-sm text-black">Body</label>
        <ContentEditableField
          id="impression-body"
          value={$paneImpression[id]?.current?.body || ""}
          onChange={(value) => handleUpdateField("body", value)}
          onEditingChange={(editing) => handleEditingChange("paneImpression" as StoreKey, editing)}
          placeholder="Enter impression body"
          className={commonClasses}
        />
      </div>
    </div>
  );
};

export default PaneImpression;
