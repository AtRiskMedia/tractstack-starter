import CheckIcon from "@heroicons/react/20/solid/CheckIcon";

interface ContentTypeFilterProps {
  types: string[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

export function ContentTypeFilter({ types, selectedTypes, onChange }: ContentTypeFilterProps) {
  const handleChange = (type: string) => {
    const newSelectedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    onChange(newSelectedTypes);
  };

  return (
    <div>
      <h2 id="content-type-filter-label" className="block text-lg leading-6 text-black mb-2">
        Filter by Content Type
      </h2>
      <div
        role="group"
        aria-labelledby="content-type-filter-label"
        className="mt-1 flex flex-wrap gap-2"
      >
        {types.map((type) => (
          <button
            key={type}
            onClick={() => handleChange(type)}
            aria-pressed={selectedTypes.includes(type)}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
              selectedTypes.includes(type)
                ? "bg-myorange/20 text-black font-bold"
                : "bg-white text-mydarkgrey border border-mydarkgrey"
            }`}
          >
            {selectedTypes.includes(type) && (
              <CheckIcon className="h-4 w-4 mr-1" aria-hidden="true" />
            )}
            <span>{type === `StoryFragment` ? `Web Pages` : `Short Context Pages`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
