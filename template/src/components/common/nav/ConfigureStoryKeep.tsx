import AdjustmentsHorizontalIcon from "@heroicons/react/24/outline/AdjustmentsHorizontalIcon";

export const ConfigureStoryKeep = () => {
  return (
    <a
      href="/storykeep/settings"
      className="hover:text-myblue hover:rotate-6"
      title="Your Story Keep Settings"
    >
      <AdjustmentsHorizontalIcon className="h-6 w-6 text-myblue/80" />
    </a>
  );
};
