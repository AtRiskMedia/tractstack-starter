import PuzzlePieceIcon from "@heroicons/react/24/outline/PuzzlePieceIcon";
import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import { isDemoModeStore } from "@/store/storykeep.ts";

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
  //tractstack: {
  //  name: "Tract Stack",
  //  browse: "Tract Stacks",
  //  url: "/storykeep/content/tractstacks",
  //  createUrl: "/storykeep/content/tractstacks/create",
  //},
  storyfragment: {
    name: "Web Page (Story Fragment)",
    browse: "Story Fragments",
    url: null,
    createUrl: "/create/edit",
  },
  contextPane: {
    name: "Context Page",
    browse: "Context Pages",
    url: null,
    createUrl: "/context/create/edit",
  },
};

const magicPaths = {
  belief: {
    name: "Magic Path Belief",
    browse: "Magic Path Beliefs",
    url: "/storykeep/content/beliefs",
    createUrl: "/storykeep/content/beliefs/create",
  },
};

const ManageContent = () => {
  const isDemoMode = isDemoModeStore.get();
  if (isDemoMode) return null;

  const buttonClass =
    "px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10 whitespace-nowrap";

  const labelClass =
    "px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-b-md inline-flex items-center whitespace-nowrap";

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-bold font-action text-xl">Manage Content</h3>
      <div className="w-fit p-0.5 shadow-md">
        <div className="p-1.5 bg-white rounded-b-md w-full flex flex-wrap gap-4">
          <div className="w-full flex flex-wrap items-center gap-2">
            <div className={labelClass}>
              <BeakerIcon className="w-6 h-6 mr-1" /> <strong>Other Content types:</strong>
            </div>
            {Object.entries(contentTypes).map(
              ([key, content]) =>
                content.url && (
                  <a key={`browse-${key}`} href={content.url} className={buttonClass}>
                    {content.browse}
                  </a>
                )
            )}
          </div>

          <div className="w-full flex flex-wrap items-center gap-2">
            <div className={labelClass}>
              <PuzzlePieceIcon className="w-6 h-6 mr-1" /> <strong>Epistemic Hypermedia:</strong>
            </div>
            {Object.entries(magicPaths).map(
              ([key, content]) =>
                content.url && (
                  <a key={`browse-${key}`} href={content.url} className={buttonClass}>
                    {content.browse}
                  </a>
                )
            )}
          </div>

          <div className="w-full flex flex-wrap items-center gap-2">
            <div className={labelClass}>
              <DocumentDuplicateIcon className="w-6 h-6 mr-1" /> <strong>Create New:</strong>
            </div>
            {Object.entries(contentTypes).map(
              ([key, content]) =>
                content.createUrl && (
                  <a key={`create-${key}`} href={content.createUrl} className={buttonClass}>
                    {content.name}
                  </a>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageContent;
