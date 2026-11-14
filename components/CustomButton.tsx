import React from "react";

interface CustomButtonProps {
  paddingX?: number;
  paddingY?: number;
  text: string;
  buttonType?: "submit" | "reset" | "button";
  customWidth?: string;
  textSize?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const CustomButton = ({
  text,
  buttonType = "button",
  customWidth = "full",
  className = "",
  disabled = false,
  onClick,
}: CustomButtonProps) => {
  return (
    <button
      type={buttonType}
      disabled={disabled}
      onClick={onClick}
      className={`w-${customWidth} py-3 px-4 rounded-xl font-bold text-sm bg-[#1E2229] text-white hover:bg-[#E06D53] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm ${className}`}
    >
      {text}
    </button>
  );
};

export default CustomButton;