import React from "react";

const Heading = ({ title }: { title: string }) => {
  return (
    <h2 className="text-[#1E2229] text-2xl sm:text-3xl font-extrabold text-center tracking-tight my-6">
      {title}
    </h2>
  );
};

export default Heading;