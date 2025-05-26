import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";

interface CreateNewButtonProps {
  type: string;
  href: string;
}

const CreateNewButton = ({ type, href }: CreateNewButtonProps) => {
  return (
    <div className="my-6 flex justify-start">
      <div className="flex items-center gap-2">
        <div className="px-2 py-1 bg-white text-gray-800 text-sm rounded-b-md inline-flex items-center">
          <DocumentDuplicateIcon className="w-6 h-6 mr-1" />
          Create New
        </div>
        <a
          href={href}
          className="px-2 py-1 font-bold bg-gray-100 text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors whitespace-nowrap"
        >
          {type}
        </a>
      </div>
    </div>
  );
};

export default CreateNewButton;
