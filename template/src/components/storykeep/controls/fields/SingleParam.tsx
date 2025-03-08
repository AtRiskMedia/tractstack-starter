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
          // Strip out newlines and pipe characters
          const sanitizedValue = newValue.replace(/[\n\r|]/g, "");
          onChange(sanitizedValue);
        }}
        onKeyDown={(e) => {
          // Make Enter trigger blur (apply changes)
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }

          // Prevent pipe character
          if (e.key === "|") {
            e.preventDefault();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          // Get the clipboard data
          const clipboardData = e.clipboardData;
          let pastedText = clipboardData.getData("text");

          // Clean the pasted text
          pastedText = pastedText.replace(/[\n\r|]/g, "");

          // Insert at cursor position using the modern Selection and Range API
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(pastedText);
            range.insertNode(textNode);

            // Move cursor to end of inserted text
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
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
