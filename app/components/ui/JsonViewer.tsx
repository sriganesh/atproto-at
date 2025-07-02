'use client';

import CopyButton from './CopyButton';
import { highlightJson } from './json-highlighter';
import JsonToImage from './JsonToImage';

interface JsonViewerProps {
  title?: string;
  data: any;
  maxHeight?: string;
  apiUrl?: string;
  uri?: string;
}

export function JsonViewer({ 
  title = 'Raw Data', 
  data, 
  maxHeight = '',
  apiUrl,
  uri
}: JsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-medium">{title}</h3>
        <div className="flex gap-2">
          <CopyButton 
            textToCopy={jsonString}
            buttonText="Copy JSON"
            iconOnly={false}
          />
          <JsonToImage data={data} uri={uri} />
        </div>
      </div>
      {apiUrl && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Source: <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ wordBreak: 'break-all' }}>{apiUrl}</a>
        </div>
      )}
      <div className={`bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm font-mono overflow-x-auto ${maxHeight}`}>
        <pre className="whitespace-pre-wrap break-words">{highlightJson(jsonString)}</pre>
      </div>
    </div>
  );
} 