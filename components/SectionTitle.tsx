import React from "react";

const SectionTitle = ({ title, path }: { title: string; path: string }) => {
  return (
    <div className="relative overflow-hidden bg-[#1E2229] py-10 sm:py-14 border-b border-[#2D323C] mb-6">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 rounded-full bg-[#E06D53]/10 blur-3xl pointer-events-none" />
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 text-center relative z-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          {title}
        </h1>
        {path && (
          <p className="mt-2 text-xs sm:text-sm text-gray-400 font-medium">
            {path}
          </p>
        )}
      </div>
    </div>
  );
};

export default SectionTitle;