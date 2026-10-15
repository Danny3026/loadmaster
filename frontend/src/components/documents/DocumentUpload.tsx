import React, { useCallback, useState } from 'react';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  acceptedFileTypes?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  isUploading = false,
  acceptedFileTypes = '.pdf,.png,.jpg,.jpeg',
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        setDraggedFiles(files);
        onUpload(files);
      }
    },
    [onUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        setDraggedFiles(files);
        onUpload(files);
      }
    },
    [onUpload]
  );

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all duration-200 ease-in-out ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="text-center">
        <svg
          className={`mx-auto h-16 w-16 mb-4 ${
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
          >
            <span>Upload a file</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              multiple
              accept={acceptedFileTypes}
              onChange={handleFileInput}
              disabled={isUploading}
            />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs leading-5 text-gray-500 mt-2">
          PDF, PNG, JPG up to 10MB
        </p>
      </div>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-xl">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm font-medium text-gray-900">
              Uploading...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
