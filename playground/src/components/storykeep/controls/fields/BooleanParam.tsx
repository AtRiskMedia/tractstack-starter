import { useState, useEffect } from "react";
import { Switch } from "@headlessui/react";
import { classNames } from "@/utils/common/helpers";

interface BooleanParamProps {
  label: string;
  value: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function BooleanParam({ label, value, onChange, disabled = false }: BooleanParamProps) {
  const [enabled, setEnabled] = useState(value);

  useEffect(() => {
    setEnabled(value);
  }, [value]);

  const handleToggle = (checked: boolean) => {
    if (!disabled) {
      setEnabled(checked);
      onChange(checked);
    }
  };

  return (
    <Switch.Group as="div" className="space-y-1">
      <div className="flex items-center justify-between">
        <Switch.Label className="text-sm text-gray-600 mr-4">{label}</Switch.Label>
        <Switch
          checked={enabled}
          onChange={handleToggle}
          disabled={disabled}
          className={({ checked }) =>
            classNames(
              checked ? "bg-cyan-700" : "bg-gray-300",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            )
          }
        >
          {({ checked }) => (
            <span
              className={classNames(
                checked ? "translate-x-6" : "translate-x-1",
                "inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out"
              )}
            />
          )}
        </Switch>
      </div>
      <div className="text-xs text-gray-500">{enabled ? "Enabled" : "Off"}</div>
    </Switch.Group>
  );
}

export default BooleanParam;
