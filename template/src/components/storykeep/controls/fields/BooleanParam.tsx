import { useState, useEffect } from "react";
import { Switch } from "@ark-ui/react";
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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Switch.Root
          checked={enabled}
          onCheckedChange={(details) => handleToggle(details.checked)}
          disabled={disabled}
          className="inline-flex items-center"
        >
          <Switch.Control
            className={classNames(
              enabled ? "bg-cyan-700" : "bg-gray-300",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            )}
          >
            <Switch.Thumb
              className={classNames(
                enabled ? "translate-x-6" : "translate-x-1",
                "inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out"
              )}
            />
          </Switch.Control>
          <Switch.HiddenInput />
          <div className="flex items-center h-6 ml-4">
            <Switch.Label className="text-sm text-gray-600 leading-none">{label}</Switch.Label>
          </div>
        </Switch.Root>
      </div>
      <div className="text-xs text-gray-500">{enabled ? "Enabled" : "Off"}</div>
    </div>
  );
}

export default BooleanParam;
