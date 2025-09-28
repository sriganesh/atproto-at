'use client';

import React, { useState } from 'react';

interface AnimatedTaprootLogoProps {
  capitalizeFirst?: boolean;
}

export default function AnimatedTaprootLogo({
  capitalizeFirst = true
}: AnimatedTaprootLogoProps) {
  const [showTaproot, setShowTaproot] = useState(false);

  const handleClick = () => {
    setShowTaproot(!showTaproot);
  };

  return (
    <h1
      className="text-4xl font-bold mb-2 select-none cursor-pointer transition-all duration-300"
      onClick={handleClick}
    >
      <span className="transition-all duration-300">
        {showTaproot ? 'taproot' : 'atproto'}
      </span>
      <span className="text-blue-500">
        .at://
      </span>
    </h1>
  );
}