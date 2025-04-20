import { useStore } from "@nanostores/react";
import { activeHelpKeyStore, showHelpStore, isEditingStore } from "@/store/help";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { helpMessages } from "@/utils/storykeep/helpMessages";

export const HudDisplay = () => {
  const showHelp = useStore(showHelpStore) && !useStore(isEditingStore);
  const currentHelpKey = useStore(activeHelpKeyStore);
  const ctx = getCtx();
  const signal = useStore(settingsPanelStore);

  useContextualHelp(signal, ctx);

  const message =
    typeof currentHelpKey === `string` ? helpMessages[currentHelpKey] : helpMessages.DEFAULT;

  if (!showHelp) return null;

  return (
    <div
      key={message}
      className="bg-black/70 text-white rounded-md p-2 text-lg text-right mb-2 transition-opacity duration-300 ease-in-out"
      style={{ minHeight: `3em`, maxWidth: `300px` }}
    >
      {currentHelpKey}:{` `}
      {message || "\u00A0"}
    </div>
  );
};

export default HudDisplay;
