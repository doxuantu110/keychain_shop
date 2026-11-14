import React from "react";

interface CustomButtonProps {
  paddingX?: number;
  paddingY?: number;
  text: string;
  buttonType?: "submit" | "reset" | "button";
  customWidth?: string;
  textSize?: string;
  className?: string;
}

const CustomButton = ({
  text,
  buttonType = "button",
  customWidth = "full",
  className = "",
}: CustomButtonProps) => {
  return (
    <button
      type={buttonType}
      className={`w-${customWidth} py-3 px-4 rounded-xl font-bold text-sm bg-[#1E2229] text-white hover:bg-[#E06D53] transition-all shadow-sm ${className}`}
    >
      {text}
    </button>
  );
};

export default CustomButton;