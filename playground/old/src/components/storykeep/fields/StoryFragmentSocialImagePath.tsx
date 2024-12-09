import ExclamationCircleIcon from "@heroicons/react/24/outline/ExclamationCircleIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import ContentEditableField from "../components/ContentEditableField";
import { useStore } from "@nanostores/react";
import {
  storyFragmentSocialImagePath,
  uncleanDataStore,
  temporaryErrorsStore,
} from "../../../store/storykeep";
import type { StoreKey } from "../../../types";

interface StoryFragmentSocialImagePathProps {
  id: string;
  isEditing: Partial<Record<StoreKey, boolean>>;
  handleEditingChange: (storeKey: StoreKey, editing: boolean) => void;
  updateStoreField: (storeKey: StoreKey, newValue: string) => boolean;
  handleUndo: (storeKey: StoreKey, id: string) => void;
}

const StoryFragmentSocialImagePath = ({
  id,
  isEditing,
  handleEditingChange,
  updateStoreField,
  handleUndo,
}: StoryFragmentSocialImagePathProps) => {
  const $storyFragmentSocialImagePath = useStore(storyFragmentSocialImagePath, {
    keys: [id],
  });
  const $uncleanData = useStore(uncleanDataStore, { keys: [id] });
  const $temporaryErrors = useStore(temporaryErrorsStore, { keys: [id] });

  return (
    <>
      <div className="flex items-center space-x-4 max-w-80">
        <span
          id="storyFragmentSocialImagePath-label"
          className="flex items-center text-md text-mydarkgrey flex-shrink-0"
        >
          Social share image
        </span>
        <div className="flex-grow relative">
          <ContentEditableField
            id="storyFragmentSocialImagePath"
            value={$storyFragmentSocialImagePath[id]?.current || ""}
            onChange={(newValue) => updateStoreField("storyFragmentSocialImagePath", newValue)}
            onEditingChange={(editing) =>
              handleEditingChange("storyFragmentSocialImagePath", editing)
            }
            placeholder="Enter slug here"
            className="block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
          />
          {($uncleanData[id]?.storyFragmentSocialImagePath ||
            $temporaryErrors[id]?.storyFragmentSocialImagePath) && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ExclamationCircleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        <button
          onClick={() => handleUndo("storyFragmentSocialImagePath", id)}
          className="disabled:hidden ml-2"
          disabled={$storyFragmentSocialImagePath[id]?.history.length === 0}
        >
          <ChevronDoubleLeftIcon
            className="h-8 w-8 text-myblack rounded bg-mygreen/50 px-1 hover:bg-myorange hover:text-white"
            title="Undo"
          />
        </button>
      </div>
      {(isEditing.storyFragmentSocialImagePath ||
        $uncleanData[id]?.storyFragmentSocialImagePath) && (
        <ul className="text-black bg-mygreen/20 rounded mt-2 font-lg flex flex-wrap px-4 py-2">
          <li className="pr-6 py-2">
            <strong>LIMITATION</strong>: currently this is just a path and file must be added to
            public/custom manually. Soon you'll be able to upload an image and have it
            auto-magically work.
          </li>
        </ul>
      )}
    </>
  );
};

export default StoryFragmentSocialImagePath;
