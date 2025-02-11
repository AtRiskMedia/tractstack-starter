interface SingleParamProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SingleParam({ label, value, onChange, placeholder, disabled = false }: SingleParamProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-600">{label}</label>
      <div
        contentEditable={!disabled}
        onBlur={(e) => {
          const newValue = e.currentTarget.textContent || "";
          onChange(newValue);
        }}
        className={`rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset 
          ${disabled ? "bg-gray-100 text-gray-500" : "ring-gray-300 focus:ring-2 focus:ring-cyan-700"}`}
        style={{ minHeight: "1em" }}
        suppressContentEditableWarning
      >
        {value || placeholder}
      </div>
    </div>
  );
}

export default SingleParam;
