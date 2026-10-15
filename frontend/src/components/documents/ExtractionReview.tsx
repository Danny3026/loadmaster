import React, { useState } from 'react';

export interface ExtractedDataField {
  key: string;
  label: string;
  value: string;
  confidence: number;
}

interface ExtractionReviewProps {
  fields: ExtractedDataField[];
  onSave: (fields: ExtractedDataField[]) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const ExtractionReview: React.FC<ExtractionReviewProps> = ({
  fields: initialFields,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const [fields, setFields] = useState<ExtractedDataField[]>(initialFields);
  const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set());

  const handleChange = (key: string, newValue: string) => {
    setEditedKeys((previous) => new Set(previous).add(key));
    setFields((prevFields) =>
      prevFields.map((field) =>
        field.key === key ? { ...field, value: newValue } : field
      )
    );
  };

  const blockedFields = fields.filter((field) => field.confidence < 0.85 && !editedKeys.has(field.key));

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full max-h-[800px]">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">Extracted Data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Review and correct the extracted information below.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving || blockedFields.length > 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(fields)}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : blockedFields.length > 0 ? (
              `Review ${blockedFields.length} low-confidence field${blockedFields.length === 1 ? '' : 's'}`
            ) : (
              'Save Data'
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {fields.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No fields were extracted from this document.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.key} className="group flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getConfidenceColor(
                      field.confidence
                    )}`}
                    title={`Confidence: ${(field.confidence * 100).toFixed(1)}%`}
                  >
                    {(field.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name={field.key}
                    id={field.key}
                    value={field.value}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border transition-colors ${
                      field.confidence < 0.85 ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' : ''
                    }`}
                  />
                  {field.confidence < 0.85 && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                 {field.confidence < 0.85 && (
                   <p className="text-xs text-yellow-600">Below 85% confidence. Edit this value to confirm it before saving.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
