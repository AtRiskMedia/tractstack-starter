import { useState, useRef, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import tinycolor from "tinycolor2";
import { tailwindColors } from "../../../assets/tailwindColors";
import { getComputedColor, debounce } from "../../../utils/helpers";
import { useDropdownDirection } from "../../../hooks/useDropdownDirection";
import type { CSSProperties } from "react";

export interface ColorPickerProps {
  id: string;
  defaultColor: string;
  onColorChange: (color: string) => void;
  skipTailwind?: boolean;
}

interface ClosestColor {
  name: string;
  shade: number;
}

type CustomColorKey =
  | "brand-1"
  | "brand-2"
  | "brand-3"
  | "brand-4"
  | "brand-5"
  | "brand-6"
  | "brand-7"
  | "brand-8";

const customColors: Record<CustomColorKey, string> = {
  "brand-1": "var(--brand-1)",
  "brand-2": "var(--brand-2)",
  "brand-3": "var(--brand-3)",
  "brand-4": "var(--brand-4)",
  "brand-5": "var(--brand-5)",
  "brand-6": "var(--brand-6)",
  "brand-7": "var(--brand-7)",
  "brand-8": "var(--brand-8)",
};

export const findClosestTailwindColor = (color: string): ClosestColor | null => {
  const targetColor = tinycolor(color);
  const targetHsl = targetColor.toHsl();
  let closestColor: ClosestColor | null = null;
  let closestDistance = Infinity;

  const validShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  Object.entries(tailwindColors).forEach(([colorName, shades]) => {
    shades.forEach((shade, index) => {
      if (!validShades.includes((index + 1) * 100)) return;

      const shadeColor = tinycolor(shade);
      const shadeHsl = shadeColor.toHsl();

      const distanceH = Math.abs(targetHsl.h - shadeHsl.h);
      const distanceS = Math.abs(targetHsl.s - shadeHsl.s);
      const distanceL = Math.abs(targetHsl.l - shadeHsl.l);
      const distance = Math.sqrt(
        distanceH * distanceH + distanceS * distanceS + distanceL * distanceL
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestColor = { name: colorName, shade: validShades[index] };
      }
    });
  });
  return closestColor;
};

const ColorPicker = ({ id, defaultColor, onColorChange, skipTailwind }: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [color, setColor] = useState(getComputedColor(defaultColor));
  const lastSelectedColor = useRef(getComputedColor(defaultColor));
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const { openAbove } = useDropdownDirection(colorPickerRef);

  useEffect(() => {
    const computedColor = getComputedColor(defaultColor);
    setColor(computedColor);
    lastSelectedColor.current = computedColor;
  }, [defaultColor]);

  const handleClick = useCallback(() => {
    setDisplayColorPicker((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setDisplayColorPicker(false);
    if (color !== lastSelectedColor.current) {
      setColor(lastSelectedColor.current);
      if (skipTailwind) {
        onColorChange(lastSelectedColor.current);
      } else {
        const closestColor = findClosestTailwindColor(lastSelectedColor.current);
        if (closestColor) {
          onColorChange(`${closestColor.name}-${closestColor.shade}`);
        } else {
          const customColorEntry = Object.entries(customColors).find(
            ([, value]) => getComputedColor(value) === lastSelectedColor.current
          );
          onColorChange(customColorEntry ? customColorEntry[0] : lastSelectedColor.current);
        }
      }
    }
  }, [color, onColorChange, skipTailwind]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      setColor(newColor);
      lastSelectedColor.current = newColor;

      if (skipTailwind) {
        onColorChange(newColor);
        return;
      }

      const customColorEntry = Object.entries(customColors).find(
        ([, value]) => getComputedColor(value) === newColor
      );

      if (customColorEntry) {
        onColorChange(customColorEntry[0]);
      } else {
        const closestColor = findClosestTailwindColor(newColor);
        if (closestColor) {
          onColorChange(`${closestColor.name}-${closestColor.shade}`);
        } else {
          onColorChange(newColor);
        }
      }
    },
    [onColorChange, skipTailwind]
  );

  const debouncedHandleColorChange = useCallback(
    debounce((newColor: string) => {
      handleColorChange(newColor);
      setDisplayColorPicker(false);
    }, 300),
    [handleColorChange]
  );

  const popover: CSSProperties = {
    position: "absolute",
    zIndex: 2,
    ...(openAbove ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" }),
    left: 0,
  };
  const cover: CSSProperties = {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  };

  return (
    <div className="relative">
      <div
        id={id}
        ref={colorPickerRef}
        style={{ backgroundColor: color }}
        className="border border-dotted border-1 border-black h-10 w-24 cursor-pointer"
        onClick={handleClick}
      />
      {displayColorPicker ? (
        <div style={popover}>
          <div style={cover} onClick={handleClose} />
          <HexColorPicker color={color} onChange={debouncedHandleColorChange} />
        </div>
      ) : null}
    </div>
  );
};

export default ColorPicker;
