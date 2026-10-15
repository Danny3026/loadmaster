import React, { useState } from 'react';

interface DocumentPreviewProps {
  url: string;
  type: string;
  name: string;
  isLoading?: boolean;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  url,
  type,
  name,
  isLoading = false,
}) => {
  const [zoom, setZoom] = useState(100);
  const [hasError, setHasError] = useState(false);

  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
        <div className="flex flex-col items-center">
          <svg className="w-10 h-10 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="mt-4 text-sm text-gray-500 font-medium">Loading preview...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-96 bg-red-50 rounded-lg flex flex-col items-center justify-center border border-red-100">
        <svg className="w-12 h-12 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-red-700 font-medium">Failed to load preview</span>
        <span className="text-sm text-red-500 mt-1">The file might be corrupted or unsupported.</span>
      </div>
    );
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg border border-gray-200 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2 truncate">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
        </div>
        
        {isImage && (
          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
            <button onClick={handleZoomOut} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded" title="Zoom Out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
            </button>
            <span className="text-xs font-medium text-gray-600 px-2 w-12 text-center">{zoom}%</span>
            <button onClick={handleZoomIn} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded" title="Zoom In">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </button>
            <button onClick={handleResetZoom} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded ml-1" title="Reset Zoom">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-gray-100/50">
        {isImage ? (
          <img
            src={url}
            alt={name}
            className="max-w-none transition-transform duration-200 ease-in-out shadow-sm border border-gray-200 bg-white"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
            onError={() => setHasError(true)}
          />
        ) : isPdf ? (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full rounded-md shadow-sm border border-gray-200 bg-white"
            title={name}
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200 max-w-sm">
             <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-600 font-medium text-sm">Preview not available for this file type.</p>
            <a href={url} download={name} className="mt-4 inline-block px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
