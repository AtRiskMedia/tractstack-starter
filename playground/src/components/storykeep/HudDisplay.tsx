import { useStore } from "@nanostores/react";
import { activeHelpKeyStore, showHelpStore, isEditingStore } from "@/store/help";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { helpMessages } from "@/lib/helpMessages";

export const HudDisplay = () => {
  // Get all store values first
  const signal = useStore(settingsPanelStore);
  const ctx = getCtx();

  // Call hooks before any conditional returns
  useContextualHelp(signal, ctx);

  const showHelp = useStore(showHelpStore);
  const isEditing = useStore(isEditingStore);
  const currentHelpKey = useStore(activeHelpKeyStore);

  // Now we can use conditional logic
  const shouldShowHelp = showHelp && !isEditing;

  const message =
    typeof currentHelpKey === `string` ? helpMessages[currentHelpKey] : helpMessages.DEFAULT;

  if (!shouldShowHelp || !message) return null;

  return (
    <div
      key={message}
      className="text-white rounded-md p-3.5 text-lg text-right mb-2 transition-opacity duration-300 ease-in-out"
      style={{
        marginBottom: `3em`,
        background: `rgb(0 0 0 / 90%)`,
        minHeight: `3em`,
        maxWidth: `320px`,
        cursor: `context-menu`,
      }}
    >
      {message || "\u00A0"}
    </div>
  );
};

export default HudDisplay;
