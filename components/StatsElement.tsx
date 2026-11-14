import React from "react";
import { FaArrowUp, FaCube } from "react-icons/fa6";

interface StatsElementProps {
  title?: string;
  value?: string | number;
  change?: string;
  icon?: React.ReactNode;
}

const StatsElement: React.FC<StatsElementProps> = ({
  title = "Sản Phẩm In 3D",
  value = "128",
  change = "12.5% so với tháng trước",
  icon = <FaCube className="text-xl text-[#E06D53]" />,
}) => {
  return (
    <div className="flex-1 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-gray-500">{title}</span>
        <p className="text-2xl font-extrabold text-[#1E2229] mt-1">{value}</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-2">
          <FaArrowUp className="text-[9px]" /> {change}
        </span>
      </div>
      <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-gray-100 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
};

export default StatsElement;