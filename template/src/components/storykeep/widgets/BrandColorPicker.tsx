import { useState, useEffect, useCallback } from "react";
import ColorPickerWrapper from "./ColorPickerWrapper";

interface BrandColorPickerProps {
  value: string;
  onChange: (newValue: string) => void;
  onEditingChange?: () => void;
}

const BrandColorPicker = ({ value, onChange, onEditingChange }: BrandColorPickerProps) => {
  const [colors, setColors] = useState<string[]>([]);
  const [hexInputs, setHexInputs] = useState<string[]>([]);

  useEffect(() => {
    const colorArray = value.split(",").map((color) => `#${color.trim()}`);
    setColors(colorArray);
    setHexInputs(colorArray.map((color) => color.replace("#", "").toUpperCase()));
  }, [value]);

  const handleColorChange = useCallback(
    (newColor: string, index: number) => {
      const newColors = [...colors];
      newColors[index] = newColor;
      const newHexInputs = [...hexInputs];
      newHexInputs[index] = newColor.replace("#", "").toUpperCase();
      setHexInputs(newHexInputs);
      const csvValue = newColors.map((color) => color.replace("#", "")).join(",");
      onChange(csvValue);
      if (onEditingChange) {
        onEditingChange();
      }
    },
    [colors, hexInputs, onChange, onEditingChange]
  );

  const handleHexInput = useCallback(
    (value: string, index: number) => {
      const cleaned = value
        .replace(/[^0-9A-Fa-f]/g, "")
        .toUpperCase()
        .slice(0, 6);
      const newHexInputs = [...hexInputs];
      newHexInputs[index] = cleaned;
      setHexInputs(newHexInputs);

      if (cleaned.length === 6) {
        const newColors = [...colors];
        newColors[index] = `#${cleaned}`;
        const csvValue = newColors.map((color) => color.replace("#", "")).join(",");
        onChange(csvValue);
        if (onEditingChange) {
          onEditingChange();
        }
      }
    },
    [colors, hexInputs, onChange, onEditingChange]
  );

  return (
    <div
      className="grid grid-cols-4 md:grid-cols-8 gap-4"
      role="group"
      aria-label="Brand color selection"
    >
      {colors.map((color, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-2"
          role="group"
          aria-label={`Color ${index + 1}`}
        >
          <label htmlFor={`brand-color-input-${index}`} className="sr-only">
            Brand color {index + 1} hex value
          </label>
          <ColorPickerWrapper
            id={`brand-color-${index}`}
            defaultColor={color}
            onColorChange={(newColor) => handleColorChange(newColor, index)}
            skipTailwind={true}
            aria-label={`Color picker for brand color ${index + 1}`}
          />
          <input
            id={`brand-color-input-${index}`}
            type="text"
            maxLength={6}
            value={hexInputs[index]}
            onChange={(e) => handleHexInput(e.target.value, index)}
            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-myorange text-center font-mono uppercase"
            placeholder="FFFFFF"
            aria-label={`Hex color value for brand color ${index + 1}`}
            aria-describedby={`color-hint-${index}`}
          />
          <span id={`color-hint-${index}`} className="sr-only">
            Enter a 6-character hex color code without the # symbol
          </span>
        </div>
      ))}
    </div>
  );
};

export default BrandColorPicker;
