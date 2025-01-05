import { useState, useRef, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import tinycolor from "tinycolor2";
import { tailwindColors } from "../../../../utils/tailwind/tailwindColors";
import { getComputedColor } from "../../../../utils/common/helpers";
import { useDropdownDirection } from "../../../../utils/storykeep/useDropdownDirection";

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
interface RGB {
  r: number;
  g: number;
  b: number;
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

interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbToLab(rgb: RGB): { l: number; a: number; b: number } {
  const { r, g, b } = rgb;

  // Normalize RGB values
  const rNormalized = r / 255;
  const gNormalized = g / 255;
  const bNormalized = b / 255;

  // sRGB to XYZ conversion
  let x = 0.4124564 * rNormalized + 0.3575761 * gNormalized + 0.1804375 * bNormalized;
  let y = 0.2126729 * rNormalized + 0.7151522 * gNormalized + 0.072175 * bNormalized;
  let z = 0.0193339 * rNormalized + 0.119192 * gNormalized + 0.9503041 * bNormalized;

  // Normalize for D65 white point
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  // Convert to LAB
  function labConvert(t: number) {
    if (t > 0.008856) {
      return Math.pow(t, 1 / 3);
    } else {
      return 7.787 * t + 16 / 116;
    }
  }

  const fx = labConvert(x);
  const fy = labConvert(y);
  const fz = labConvert(z);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);

  return { l, a, b: bLab };
}

export const findClosestTailwindColor = (color: string): ClosestColor | null => {
  const targetColor = tinycolor(color);
  const targetRgb = targetColor.toRgb();
  const targetLab = rgbToLab(targetRgb);

  if (!targetLab) return null;

  let closestColor: ClosestColor | null = null;
  let closestDistance = Infinity;

  const validShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  Object.entries(tailwindColors).forEach(([colorName, shades]) => {
    shades.forEach((shade, index) => {
      if (!validShades.includes((index + 1) * 100)) return;

      const shadeColor = tinycolor(shade);
      const shadeRgb = shadeColor.toRgb();
      const shadeLab = rgbToLab(shadeRgb);

      if (shadeLab) {
        const distance = Math.sqrt(
          Math.pow(targetLab.l - shadeLab.l, 2) +
            Math.pow(targetLab.a - shadeLab.a, 2) +
            Math.pow(targetLab.b - shadeLab.b, 2)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestColor = { name: colorName, shade: validShades[index] };
        }
      }
    });
  });

  return closestColor;
};

const ColorPicker = ({ id, defaultColor, onColorChange, skipTailwind }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewColor, setPreviewColor] = useState(getComputedColor(defaultColor));
  const [selectedColor, setSelectedColor] = useState(getComputedColor(defaultColor));
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const pickerPopoverRef = useRef<HTMLDivElement>(null);
  const { openAbove } = useDropdownDirection(colorPickerRef);

  // Update colors when default color changes
  useEffect(() => {
    const computedColor = getComputedColor(defaultColor);
    setPreviewColor(computedColor);
    setSelectedColor(computedColor);
  }, [defaultColor]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        handleConfirmColor();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, previewColor]);

  // Adjust picker position to ensure it's visible
  useEffect(() => {
    if (isOpen && pickerPopoverRef.current) {
      const picker = pickerPopoverRef.current;
      const rect = picker.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        const overflow = rect.right - viewportWidth;
        picker.style.left = `${-overflow - 10}px`;
      }

      if (!openAbove && rect.bottom > viewportHeight) {
        picker.style.top = "auto";
        picker.style.bottom = "calc(100% + 10px)";
      } else if (openAbove && rect.top < 0) {
        picker.style.bottom = "auto";
        picker.style.top = "calc(100% + 10px)";
      }
    }
  }, [isOpen, openAbove]);

  const handleConfirmColor = useCallback(() => {
    setIsOpen(false);
    setSelectedColor(previewColor);

    if (skipTailwind) {
      onColorChange(previewColor);
      return;
    }

    // Check for custom brand colors first
    const customColorEntry = Object.entries(customColors).find(
      ([, value]) => getComputedColor(value) === previewColor
    );

    if (customColorEntry) {
      onColorChange(customColorEntry[0]);
    } else {
      // Find closest Tailwind color if not a custom color
      const closestColor = findClosestTailwindColor(previewColor);
      if (closestColor) {
        const tailwindClass = `${closestColor.name}-${closestColor.shade}`;
        onColorChange(tailwindClass);
      } else {
        onColorChange(previewColor);
      }
    }
  }, [previewColor, onColorChange, skipTailwind]);

  const handlePreviewChange = useCallback((newColor: string) => {
    setPreviewColor(newColor);
  }, []);

  return (
    <div className="relative" ref={colorPickerRef}>
      <div
        id={id}
        style={{ backgroundColor: isOpen ? previewColor : selectedColor }}
        className="border border-dotted border-1 border-black h-10 w-24 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div
          ref={pickerPopoverRef}
          className="absolute z-[9999] left-0"
          style={{
            ...(openAbove ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" }),
          }}
        >
          <div className="p-3 bg-white rounded-lg shadow-lg border border-mydarkgrey/20">
            <HexColorPicker
              color={previewColor}
              onChange={handlePreviewChange}
              className="!w-[200px] !h-[200px]"
            />

            <div className="mt-3 flex justify-between gap-2">
              <button
                className="flex-1 px-3 py-1.5 text-sm text-mydarkgrey hover:text-black border border-mydarkgrey/20 rounded hover:bg-mydarkgrey/10"
                onClick={() => {
                  setPreviewColor(selectedColor);
                  setIsOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-3 py-1.5 text-sm bg-myorange text-white hover:bg-myorange/80 rounded"
                onClick={handleConfirmColor}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

//const ColorPicker = ({ id, defaultColor, onColorChange, skipTailwind }: ColorPickerProps) => {
//  const [displayColorPicker, setDisplayColorPicker] = useState(false);
//  const [color, setColor] = useState(getComputedColor(defaultColor));
//  const lastSelectedColor = useRef(getComputedColor(defaultColor));
//  const colorPickerRef = useRef<HTMLDivElement>(null);
//  const { openAbove } = useDropdownDirection(colorPickerRef);
//
//  useEffect(() => {
//    const computedColor = getComputedColor(defaultColor);
//    setColor(computedColor);
//    lastSelectedColor.current = computedColor;
//  }, [defaultColor]);
//
//  const handleClick = useCallback(() => {
//    setDisplayColorPicker((prev) => !prev);
//  }, []);
//
//  const handleClose = useCallback(() => {
//    setDisplayColorPicker(false);
//    if (color !== lastSelectedColor.current) {
//      setColor(lastSelectedColor.current);
//      if (skipTailwind) {
//        onColorChange(lastSelectedColor.current);
//      } else {
//        const closestColor = findClosestTailwindColor(lastSelectedColor.current);
//        if (closestColor) {
//          onColorChange(`${closestColor.name}-${closestColor.shade}`);
//        } else {
//          const customColorEntry = Object.entries(customColors).find(
//            ([, value]) => getComputedColor(value) === lastSelectedColor.current
//          );
//          onColorChange(customColorEntry ? customColorEntry[0] : lastSelectedColor.current);
//        }
//      }
//    }
//  }, [color, onColorChange, skipTailwind]);
//
//  const handleColorChange = useCallback(
//    (newColor: string) => {
//      setColor(newColor);
//      lastSelectedColor.current = newColor;
//
//      if (skipTailwind) {
//        onColorChange(newColor);
//        return;
//      }
//
//      const customColorEntry = Object.entries(customColors).find(
//        ([, value]) => getComputedColor(value) === newColor
//      );
//
//      if (customColorEntry) {
//        onColorChange(customColorEntry[0]);
//      } else {
//        const closestColor = findClosestTailwindColor(newColor);
//        if (closestColor) {
//          onColorChange(`${closestColor.name}-${closestColor.shade}`);
//        } else {
//          onColorChange(newColor);
//        }
//      }
//    },
//    [onColorChange, skipTailwind]
//  );
//
//  const debouncedHandleColorChange = useCallback(
//    debounce((newColor: string) => {
//      handleColorChange(newColor);
//      setDisplayColorPicker(false);
//    }, 300),
//    [handleColorChange]
//  );
//
//  const popover: CSSProperties = {
//    position: "absolute",
//    zIndex: 2,
//    ...(openAbove ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" }),
//    left: 0,
//  };
//  const cover: CSSProperties = {
//    position: "fixed",
//    top: "0px",
//    right: "0px",
//    bottom: "0px",
//    left: "0px",
//  };
//
//  return (
//    <div className="relative">
//      <div
//        id={id}
//        ref={colorPickerRef}
//        style={{ backgroundColor: color }}
//        className="border border-dotted border-1 border-black h-10 w-24 cursor-pointer"
//        onClick={handleClick}
//      />
//      {displayColorPicker ? (
//        <div style={popover}>
//          <div style={cover} onClick={handleClose} />
//          <HexColorPicker color={color} onChange={debouncedHandleColorChange} />
//        </div>
//      ) : null}
//    </div>
//  );
//};
//
//export default ColorPicker;
