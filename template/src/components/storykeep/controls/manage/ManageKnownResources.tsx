import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";

interface ManageKnownResourcesProps {
  knownCategories: string[];
}

const ManageKnownResources = ({ knownCategories }: ManageKnownResourcesProps) => {
  return (
    <div className="my-6 flex justify-start">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="px-2 py-1 bg-white text-gray-800 text-sm rounded-b-md inline-flex items-center">
          <DocumentDuplicateIcon className="w-6 h-6 mr-1" />
          Custom Resource Categories:
        </div>

        {knownCategories.map((category) => (
          <a
            key={category}
            href={`/storykeep/content/categories/${category}`}
            className="px-2 py-1 font-bold bg-gray-100 text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors whitespace-nowrap"
          >
            {category}
          </a>
        ))}

        <a
          href="/storykeep/content/categories/create"
          className="px-2 py-1 font-bold bg-cyan-700 text-white text-sm rounded hover:bg-cyan-800 focus:bg-cyan-800 shadow-sm transition-colors whitespace-nowrap inline-flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          New Category
        </a>
      </div>
    </div>
  );
};

export default ManageKnownResources;
