import React from 'react';
import CopyButton from './CopyButton';

type CopyableFieldProps = {
  label: string;
  value: string;
  fieldName: string;
  copiedField: string | null;
  onCopy: (value: string, fieldName: string) => void;
  labelWidth?: string;
};

export default function CopyableField({ 
  label, 
  value, 
  fieldName, 
  copiedField, 
  onCopy,
  labelWidth = 'w-24' 
}: CopyableFieldProps) {
  return (
    <div className="flex items-start">
      <span className={`font-medium text-gray-500 ${labelWidth}`}>{label}</span> 
      <span className="break-all flex-1">{value}</span>
      <CopyButton 
        textToCopy={value}
        onCopy={() => onCopy(value, fieldName)}
        title={`Copy ${label}`}
        iconOnly={true}
        buttonClassName="ml-2 p-1 text-gray-500 hover:text-blue-500 transition-colors"
      />
    </div>
  );
} 