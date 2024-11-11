import StoryFragmentTailwindBgColour from "../fields/StoryFragmentTailwindBgColour";
import { useStoryKeepUtils } from "../../../utils/storykeep";

import StoryFragmentSocialImagePath from "../fields/StoryFragmentSocialImagePath";
import StoryFragmentMenu from "../fields/StoryFragmentMenu";

export const StoryFragmentSettings = (props: { id: string }) => {
  const { id } = props;

  // helpers
  const { isEditing, updateStoreField, handleEditingChange, handleUndo } = useStoryKeepUtils(id);

  return (
    <div className="w-full space-y-4 my-4">
      <StoryFragmentTailwindBgColour
        id={id}
        updateStoreField={updateStoreField}
        handleUndo={handleUndo}
      />
      <StoryFragmentMenu
        id={id}
        isEditing={isEditing}
        handleEditingChange={handleEditingChange}
        updateStoreField={updateStoreField}
        handleUndo={handleUndo}
        payload={[]}
      />

      <StoryFragmentSocialImagePath
        id={id}
        isEditing={isEditing}
        handleEditingChange={handleEditingChange}
        updateStoreField={updateStoreField}
        handleUndo={handleUndo}
      />
    </div>
  );
};
