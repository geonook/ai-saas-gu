'use client';

import React, { useState } from 'react';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { Maximize2 } from 'lucide-react';

interface TextCellProps {
  params: GridRenderCellParams;
  fieldName: string;
  onTextPreview: (text: string, fieldName: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const TextCell = ({ params, fieldName, onTextPreview, onContextMenu }: TextCellProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const textValue = params.value;
  
  // Type validation for text value
  if (typeof textValue !== 'string' || !textValue) {
    return (
      <div className="h-full flex items-center px-2">
        <span className="text-sm text-gray-400">無內容</span>
      </div>
    );
  }

  // Determine if text is long enough to show preview button
  const isLongText = textValue.length > 50;
  const displayValue = isLongText ? textValue.substring(0, 50) + '...' : textValue;

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTextPreview(textValue, fieldName);
  };

  return (
    <div 
      className="relative h-full flex items-center px-2 group cursor-pointer hover:bg-gray-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={onContextMenu}
      title={isLongText ? "點擊放大按鈕查看完整內容，右鍵查看選項" : textValue}
    >
      <span className="text-sm text-gray-700 truncate flex-1">
        {displayValue}
      </span>
      
      {/* Magnify button - only show for long text and on hover */}
      {isLongText && (
        <button
          onClick={handlePreviewClick}
          className={`
            absolute top-1 right-1 p-1 rounded bg-white border border-gray-300 
            shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200
            ${isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'}
          `}
          title="查看完整內容"
        >
          <Maximize2 className="h-3 w-3 text-gray-600" />
        </button>
      )}
    </div>
  );
};