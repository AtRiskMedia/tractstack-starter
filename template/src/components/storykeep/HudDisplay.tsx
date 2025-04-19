import { useStore } from "@nanostores/react";
import { activeHelpKeyStore, showHelpStore } from "@/store/help";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { useContextualHelp } from "@/hooks/useContextualHelp";
import { helpMessages } from "@/utils/storykeep/helpMessages";

export const HudDisplay = () => {
  const showHelp = useStore(showHelpStore);
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
      className="bg-black/70 text-white rounded p-2 text-sm text-right mb-2 transition-opacity duration-300 ease-in-out"
      style={{ minHeight: `3em`, maxWidth: `300px` }}
    >
      {message || "\u00A0"}
    </div>
  );
};

export default HudDisplay;
