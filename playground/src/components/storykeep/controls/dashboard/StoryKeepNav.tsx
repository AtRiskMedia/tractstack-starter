import { classNames } from "@/utils/common/helpers";
import { colors } from "@/constants";

type Action = {
  buttonText: string;
  href: string;
  color?: string;
};

// Sample actions - you'll replace these with your actual values
const ACTIONS: Action[] = [
  { buttonText: "Create New Web Page", href: "/create/edit" },
  { buttonText: "View Analytics", href: "/storykeep#analytics" },
  { buttonText: "Browse Pages", href: "/storykeep#browse" },
  { buttonText: "Choose Home Page", href: "/storykeep#select-home" },
  { buttonText: "Manage Content", href: "/storykeep#manage" },
  { buttonText: "Advanced Setup", href: "/storykeep/settings" },
];

export const StoryKeepNav = () => {
  return (
    <div className="w-full py-6">
      <h2 className="text-2xl font-bold mb-6">What would you like to do today?</h2>

      <div className="flex flex-wrap gap-3">
        {ACTIONS.map((action, index) => (
          <a
            key={`action-${index}`}
            href={action.href}
            className={classNames(
              "rounded-md px-4 py-3 text-lg text-black shadow-sm ring-1 ring-inset",
              "bg-gray-100 hover:bg-mywhite ring-cyan-600"
            )}
          >
            <div className="flex items-center">
              <span
                aria-label="Color indicator"
                className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="ml-3 block whitespace-normal text-left w-fit">
                {action.buttonText}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default StoryKeepNav;
