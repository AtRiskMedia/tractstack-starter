import { useState } from "react";

interface AddPaneNewCustomCopyProps {
  value: string;
  onChange: (value: string) => void;
}

export const AddPaneNewCustomCopy = ({
  value: initialValue,
  onChange,
}: AddPaneNewCustomCopyProps) => {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    onChange(localValue);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow">
      <div className="p-6">
        <textarea
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter your markdown here..."
          className="w-full h-48 p-4 text-sm font-mono bg-gray-50 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          spellCheck={false}
        />
        <div className="mt-2 text-sm text-gray-500">
          Use markdown formatting: # for headings, * for lists, etc.
        </div>
      </div>
    </div>
  );
};
