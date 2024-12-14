import StoryFragmentTailwindBgColour from "../fields/StoryFragmentTailwindBgColour";
import { useStoryKeepUtils } from "../../../utils/storykeep/StoryKeep_utils";

import StoryFragmentSocialImagePath from "../fields/StoryFragmentSocialImagePath";
import StoryFragmentMenu from "../fields/StoryFragmentMenu";
import type { MenuDatum, Config } from "../../../types";

export const StoryFragmentSettings = (props: {
  id: string;
  menus: MenuDatum[];
  config: Config;
}) => {
  const { id, menus, config } = props;

  // helpers
  const { isEditing, updateStoreField, handleEditingChange, handleUndo } = useStoryKeepUtils(id);

  return (
    <div className="w-full space-y-4 my-4">
      <StoryFragmentTailwindBgColour
        id={id}
        updateStoreField={updateStoreField}
        handleUndo={handleUndo}
        config={config}
      />
      <StoryFragmentMenu
        id={id}
        isEditing={isEditing}
        handleEditingChange={handleEditingChange}
        updateStoreField={updateStoreField}
        handleUndo={handleUndo}
        menus={menus}
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
