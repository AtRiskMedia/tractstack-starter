import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";

interface MultiParamProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

function MultiParam({ label, values, onChange, disabled = false }: MultiParamProps) {
  const handleAdd = () => {
    onChange([...values, ""]);
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
  };

  const handleChange = (index: number, newValue: string) => {
    const newValues = [...values];
    newValues[index] = newValue;
    onChange(newValues);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-600">{label}</label>
      <div className="space-y-1">
        {values.map((value, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              contentEditable={!disabled}
              onBlur={(e) => {
                handleChange(index, e.currentTarget.textContent || "");
              }}
              className={`flex-1 rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset
                ${disabled ? "bg-gray-100 text-gray-500" : "ring-gray-300 focus:ring-2 focus:ring-cyan-700"}`}
              style={{ minHeight: "1em" }}
              suppressContentEditableWarning
            >
              {value}
            </div>
            {!disabled && (
              <button
                onClick={() => handleRemove(index)}
                className="text-gray-500 hover:text-gray-700"
                title="Remove value"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            onClick={handleAdd}
            className="text-cyan-700 hover:text-black flex items-center"
            title={`Add ${label}`}
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            <span>Add {label}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default MultiParam;
