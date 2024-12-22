import React, { useEffect, useState } from "react";

export type SwitchProps = {
  leftText?: string;
  rightText?: string;
  checked: boolean;
  onSwitch?: (checked: boolean) => void;
};

export const Switch = (props: SwitchProps) => {
  const [isChecked, setIsChecked] = useState(props.checked);

  useEffect(() => {
    if (isChecked !== props.checked) {
      setIsChecked(!isChecked);
    }
  }, [props.checked]);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
    if (props.onSwitch) {
      props.onSwitch(isChecked);
    }
  };

  return (
    <>
      <label className="themeSwitcherTwo relative inline-flex cursor-pointer select-none items-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="sr-only"
        />
        <span className="label flex items-center text-sm font-medium text-black">
          {props.leftText}
        </span>
        <span
          className={`slider mx-4 flex h-8 w-[60px] items-center rounded-full p-1 duration-200 ${
            isChecked ? "bg-[#212b36]" : "bg-[#CCCCCE]"
          }`}
        >
          <span
            className={`dot h-6 w-6 rounded-full bg-white duration-200 ${
              isChecked ? "translate-x-[28px]" : ""
            }`}
          ></span>
        </span>
        <span className="label flex items-center text-sm font-medium text-black">
          {props.rightText}
        </span>
      </label>
    </>
  );
};
