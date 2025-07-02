'use client';

import { useState, useEffect } from 'react';

// Base32 sortable character set for TID generation
const BASE32_CHARS = '234567abcdefghijklmnopqrstuvwxyz';

// Generate a TID from the current timestamp
function generateTID(): string {
  const timestamp = BigInt(Date.now()) * BigInt(1000);
  const timestampBits = timestamp & ((BigInt(1) << BigInt(53)) - BigInt(1));
  const clockId = BigInt(Math.floor(Math.random() * 1024));
  const tidInt = (timestampBits << BigInt(10)) | clockId;
  
  let tid = '';
  let value = tidInt;
  
  for (let i = 0; i < 13; i++) {
    const index = Number(value & BigInt(31));
    tid = BASE32_CHARS[index] + tid;
    value = value >> BigInt(5);
  }
  
  return tid;
}

export default function TidClock() {
  // Start with a placeholder to avoid hydration mismatch
  const [currentTid, setCurrentTid] = useState('-------------');
  const [isClient, setIsClient] = useState(false);

  // Set isClient flag and generate initial TID after hydration
  useEffect(() => {
    setIsClient(true);
    setCurrentTid(generateTID());
  }, []);

  // Update TID every second
  useEffect(() => {
    if (!isClient) return;
    
    const intervalId = setInterval(() => {
      setCurrentTid(generateTID());
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isClient]);

  return (
    <div className="mb-2 flex items-center justify-center">
      <span>TID 'o Clock: </span>
      <span className="font-mono text-blue-500 inline-block w-[6.5rem] transition-opacity duration-75">
        {currentTid}
      </span>
    </div>
  );
} 