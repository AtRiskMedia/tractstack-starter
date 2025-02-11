import { useState, useEffect } from "react";
import type { ColorPickerProps } from "./ColorPicker";
import type { ComponentType } from "react";

interface ColorPickerWrapperProps extends ColorPickerProps {
  skipTailwind?: boolean;
}

const ColorPickerWrapper = ({
  id,
  defaultColor,
  onColorChange,
  skipTailwind,
}: ColorPickerWrapperProps) => {
  const [ColorPicker, setColorPicker] = useState<ComponentType<ColorPickerProps> | null>(null);
  const [currentColor, setCurrentColor] = useState(defaultColor);

  useEffect(() => {
    import("./ColorPicker").then((module) => {
      setColorPicker(() => module.default as ComponentType<ColorPickerProps>);
    });
  }, []);

  useEffect(() => {
    setCurrentColor(defaultColor);
  }, [defaultColor]);

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    onColorChange(color);
  };

  if (!ColorPicker) {
    return (
      <div
        id={id}
        style={{ backgroundColor: currentColor }}
        className="border border-dotted border-1 border-black h-8 w-24 cursor-pointer"
      ></div>
    );
  }

  return (
    <ColorPicker
      id={id}
      defaultColor={currentColor}
      onColorChange={handleColorChange}
      skipTailwind={skipTailwind}
    />
  );
};

export default ColorPickerWrapper;
