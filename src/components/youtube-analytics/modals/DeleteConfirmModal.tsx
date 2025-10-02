'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Youtube, Calendar, Eye, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordIdentifier } from '@/types/youtube-analytics';

interface DeleteConfirmModalProps {
  recordId: string;
  recordInfo: RecordIdentifier;
  isOpen: boolean;
  onConfirm: (recordId: string) => void;
  onCancel: () => void;
}

export const DeleteConfirmModal = ({ 
  recordId, 
  recordInfo, 
  isOpen, 
  onConfirm, 
  onCancel 
}: DeleteConfirmModalProps) => {
  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]"
      onClick={handleBackgroundClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Record</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete this YouTube video record?
          </p>
          
          {/* Video Information Display */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {recordInfo.title && (
              <div className="flex items-start gap-3">
                <Youtube className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Video Title</p>
                  <p className="font-medium text-gray-900 break-words">{recordInfo.title}</p>
                </div>
              </div>
            )}
            
            {recordInfo.channel && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-400 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-600">Channel</p>
                  <p className="font-medium text-gray-900">{recordInfo.channel}</p>
                </div>
              </div>
            )}
            
            {recordInfo.keywords && (
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {recordInfo.keywords.split(',').slice(0, 5).map((keyword, index) => (
                      <span 
                        key={index} 
                        className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full border border-blue-200"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                    {recordInfo.keywords.split(',').length > 5 && (
                      <span className="inline-block px-2 py-1 text-xs text-gray-500">
                        +{recordInfo.keywords.split(',').length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-6">
              {recordInfo.publishDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Published</p>
                    <p className="text-sm font-medium text-gray-700">{recordInfo.publishDate}</p>
                  </div>
                </div>
              )}
              
              {recordInfo.viewCount && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-sm font-medium text-gray-700">{recordInfo.viewCount}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Fallback display if no meaningful data is available */}
            {!recordInfo.title && !recordInfo.channel && recordInfo.fallbackName && (
              <div className="flex items-center gap-3">
                <Trash2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Record ID</p>
                  <p className="font-mono text-sm text-gray-700">{recordInfo.fallbackName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            className="px-4 h-12 bg-gray-400 text-white hover:bg-gray-500 border border-gray-400 hover:border-gray-500 text-lg flex items-center justify-center"
          >
            取消
          </Button>
          <Button
            onClick={() => onConfirm(recordId)}
            className="px-4 h-12 bg-red-600 text-white hover:bg-red-700 border border-red-600 hover:border-red-700 transition-colors duration-200 text-lg flex items-center justify-center"
          >
            確定刪除
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};