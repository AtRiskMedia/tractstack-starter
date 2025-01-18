import { PuzzlePieceIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

const contentTypes = {
  image: {
    name: "Image",
    browse: "Images",
    url: "/storykeep/content/images",
    createUrl: null, // "/storykeep/create/image",
  },
  menu: {
    name: "Menu",
    browse: "Menus",
    url: "/storykeep/content/menus",
    createUrl: "/storykeep/content/menus/create",
  },
  resource: {
    name: "Resource",
    browse: "Resources",
    url: "/storykeep/content/resources",
    createUrl: "/storykeep/content/resources/create",
  },
  tractstack: {
    name: "Tract Stack",
    browse: "Tract Stacks",
    url: "/storykeep/content/tractstacks",
    createUrl: "/storykeep/content/tractstacks/create",
  },
  //storyfragment: {
  //  name: "Story Fragment",
  //  browse: "Story Fragments",
  //  url: "/storykeep/content/storyfragments",
  //  createUrl: "/storykeep/create/storyfragment",
  //},
  //pane: {
  //  name: "Pane",
  //  browse: "Panes",
  //  url: "/storykeep/content/panes",
  //  createUrl: "/storykeep/create/pane",
  //},
  //context: {
  //  name: "Context Pane",
  //  browse: "Context Panes",
  //  url: "/storykeep/content/context",
  //  createUrl: "/storykeep/create/context",
  //},
};

const ManageContent = () => {
  const buttonClass =
    "px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10 whitespace-nowrap";

  const labelClass =
    "px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center whitespace-nowrap";

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-bold font-action text-xl">Manage Content</h3>
      <div className="flex flex-col gap-2">
        <div className="w-fit p-0.5 shadow-md">
          <div className="p-1.5 bg-white rounded-b-md w-full">
            <div className="flex flex-wrap items-center gap-2">
              <div className={labelClass}>
                <PuzzlePieceIcon className="w-6 h-6 mr-1" /> <strong>Browse Content:</strong>
              </div>

              {Object.entries(contentTypes).map(([key, content]) => (
                <div key={`browse-${key}`}>
                  {content.url ? (
                    <a key={`browse-${key}`} href={content.url} className={buttonClass}>
                      {content.browse}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-fit p-0.5 shadow-md">
          <div className="p-1.5 bg-white rounded-b-md w-full">
            <div className="flex flex-wrap items-center gap-2">
              <div className={labelClass}>
                <DocumentDuplicateIcon className="w-6 h-6 mr-1" /> <strong>Create New:</strong>
              </div>

              {Object.entries(contentTypes).map(([key, content]) => (
                <div key={`create-${key}`}>
                  {content.createUrl ? (
                    <a href={content.createUrl} className={buttonClass}>
                      {content.name}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageContent;
