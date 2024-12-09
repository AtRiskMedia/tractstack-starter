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
      // Allow typing by updating the display value
      const cleaned = value
        .replace(/[^0-9A-Fa-f]/g, "")
        .toUpperCase()
        .slice(0, 6);
      const newHexInputs = [...hexInputs];
      newHexInputs[index] = cleaned;
      setHexInputs(newHexInputs);

      // Only update the actual color if we have a valid hex
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
    <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
      {colors.map((color, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <ColorPickerWrapper
            id={`brand-color-${index}`}
            defaultColor={color}
            onColorChange={(newColor) => handleColorChange(newColor, index)}
            skipTailwind={true}
          />
          <input
            type="text"
            maxLength={6}
            value={hexInputs[index]}
            onChange={(e) => handleHexInput(e.target.value, index)}
            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-myorange text-center font-mono uppercase"
            placeholder="FFFFFF"
          />
        </div>
      ))}
    </div>
  );
};

export default BrandColorPicker;
