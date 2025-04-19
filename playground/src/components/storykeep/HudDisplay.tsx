import { useStore } from "@nanostores/react";
import { activeHelpKeyStore, showHelpStore } from "@/store/help";
import { helpMessages } from "@/utils/storykeep/helpMessages";

export const HudDisplay = () => {
  const currentHelpKey = useStore(activeHelpKeyStore);
  const showHelp = useStore(showHelpStore);
  const message = typeof currentHelpKey === `string` ? helpMessages[currentHelpKey] : helpMessages.DEFAULT;

  if (!showHelp) return null;
  // Use a key based on the message to force re-render on change, enabling transitions
  // Add min-height to prevent layout shifts when message disappears
  return (
    <div
      key={message}
      className="bg-black/70 text-white rounded p-2 text-sm max-w-[300px] text-right mb-2 transition-opacity duration-300 ease-in-out"
      //style={{ opacity: currentHelpKey ? 1 : 0 }} // Control opacity based on key presence
      style={{ minHeight: `3em` }}
    >
      {message || "\u00A0"} {/* Render non-breaking space if message is empty */}
    </div>
  );
};

export default HudDisplay;
