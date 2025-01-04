import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import DevicePhoneMobileIcon from "@heroicons/react/24/outline/DevicePhoneMobileIcon";
import DeviceTabletIcon from "@heroicons/react/24/outline/DeviceTabletIcon";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";
import { useLayoutEffect, useState } from "react";
import { SvgBreaks } from "../../../../utils/designs/shapes";

interface Props {
  viewport: "mobile" | "tablet" | "desktop";
  selectedImage: string;
  onChange: (image: string) => void;
}

export default function PaneBreakShapeSelector({ viewport, selectedImage, onChange }: Props) {
  const normalizedSelectedImage = selectedImage === "none" ? "none" : `kCz${selectedImage}`;

  const availableShapes = ["none", ...Object.keys(SvgBreaks).map((key) => key.replace("kCz", ""))];

  const Icon =
    viewport === "mobile"
      ? DevicePhoneMobileIcon
      : viewport === "tablet"
        ? DeviceTabletIcon
        : ComputerDesktopIcon;

  const renderShapePreview = (shape: string) => {
    if (shape === "none") return null;

    const fullShapeName = `kCz${shape}`;
    if (!SvgBreaks[fullShapeName]) return null;

    const svgData = SvgBreaks[fullShapeName];
    return (
      <div className="w-[150px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgData.viewBox[0]} ${svgData.viewBox[1]}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={svgData.path} fill="currentColor" />
        </svg>
      </div>
    );
  };

  return (
    <div className="relative flex items-center space-x-2">
      <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
      <Combobox value={selectedImage} onChange={onChange}>
        <div className="relative mt-1 flex-grow">
          <div className="flex items-center w-full border border-mydarkgrey rounded-md shadow-sm focus-within:border-myblue focus-within:ring-myblue">
            <Combobox.Input
              className="w-full border-0 rounded-l-md py-2 pl-3 pr-0 focus:ring-0 xs:text-sm"
              displayValue={(image: string) => image}
            />
            <div className="pr-8 py-2">{renderShapePreview(selectedImage)}</div>
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
            </Combobox.Button>
          </div>
        </div>
        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm">
          {availableShapes.map((shape) => (
            <Combobox.Option
              key={shape}
              value={shape}
              className={({ active }) =>
                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                  active ? "bg-myorange text-white" : "text-black"
                } flex items-center`
              }
            >
              {({ selected, active }) => (
                <>
                  <span className={`block truncate mr-2 ${selected ? "font-bold" : "font-normal"}`}>
                    {shape}
                  </span>
                  {renderShapePreview(shape)}
                  {selected ? (
                    <span
                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                        active ? "text-white" : "text-myorange"
                      }`}
                    >
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox>
    </div>
  );
}
