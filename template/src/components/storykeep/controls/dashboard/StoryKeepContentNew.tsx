import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";

const contentTypes = {
  image: {
    name: "Image",
    url: "/storykeep/create/image",
  },
  menu: {
    name: "Menu",
    url: "/storykeep/create/menu",
  },
  resource: {
    name: "Resource",
    url: "/storykeep/create/resource",
  },
  tractstack: {
    name: "Tract Stack",
    url: "/storykeep/create/tractstack",
  },
  storyfragment: {
    name: "Story Fragment",
    url: "/storykeep/create/storyfragment",
  },
  pane: {
    name: "Pane",
    url: "/storykeep/create/pane",
  },
  context: {
    name: "Context Pane",
    url: "/storykeep/create/context",
  },
};

const StoryKeepContent = () => {
  const buttonClass =
    "px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10 whitespace-nowrap mb-1";

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full group">
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-2 transition-opacity">
            <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center">
              <DocumentDuplicateIcon className="w-6 h-6 mr-1" /> <strong>Create New:</strong>
            </div>

            {Object.entries(contentTypes).map(([key, content]) => (
              <a key={key} href={content.url} className={buttonClass}>
                {content.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryKeepContent;
