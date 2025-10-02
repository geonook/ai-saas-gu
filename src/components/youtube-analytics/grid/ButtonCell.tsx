'use client';

import React from 'react';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { ButtonType } from '@/types/youtube-analytics';

interface ButtonCellProps {
  params: GridRenderCellParams;
}

export const ButtonCell = ({ params }: ButtonCellProps) => {
  const buttonData = params.value as ButtonType;
  
  if (!buttonData || typeof buttonData !== 'object') {
    return <span className="text-gray-500">-</span>;
  }

  const { label, url } = buttonData;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    if (url) {
      const popup = window.open(
        url, 
        'popup', 
        'width=1000,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup blocked, fallback to new tab
        window.open(url, '_blank');
      }
    }
  };

  if (!label && !url) {
    return <span className="text-gray-500">-</span>;
  }

  const displayLabel = () => {
    if (!label) return '🔗';
    if (label.toLowerCase() === 'button') return 'Open';
    return label;
  };

  return (
    <div className="flex items-center justify-center h-full">
      <button
        onClick={handleClick}
        className="px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-900 active:bg-black transition-colors duration-150 font-medium"
        title={url ? `Click to open: ${url}` : 'Button'}
        disabled={!url}
      >
        {displayLabel()}
      </button>
    </div>
  );
};