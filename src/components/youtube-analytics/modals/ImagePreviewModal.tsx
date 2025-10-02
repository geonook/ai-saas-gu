'use client';

import React, { useEffect, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ImagePreviewModalProps {
  imageUrl: string;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImagePreviewModal = ({ 
  imageUrl, 
  filename, 
  isOpen, 
  onClose 
}: ImagePreviewModalProps) => {
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-none max-h-none w-fit h-fit p-0 overflow-hidden bg-black border-none"
        showCloseButton={false}
        positioning="flex-center"
        style={{
          position: 'fixed',
          inset: '0',
          margin: 'auto',
          width: 'fit-content',
          height: 'fit-content',
          maxWidth: '98vw',
          maxHeight: '98vh',
          transform: 'none'
        }}
      >
        {/* Hidden header for accessibility */}
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>圖片預覽</DialogTitle>
            <DialogDescription>
              {filename ? `預覽圖片：${filename}` : '預覽圖片'}
            </DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white rounded-full p-2 shadow-lg hover:bg-opacity-90 hover:scale-110 hover:shadow-xl active:scale-95 active:bg-opacity-100 transition-all duration-150"
          title="關閉 (ESC)"
          aria-label="關閉圖片預覽"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Image */}
        <div className="relative bg-black" style={{ minWidth: '300px', minHeight: '200px' }}>
          {imageUrl ? (
            <img
              ref={imgRef}
              src={imageUrl}
              alt={filename || '預覽圖片'}
              className="block"
              style={{ 
                maxWidth: 'min(1400px, 94vw)', 
                maxHeight: 'min(900px, 90vh)',
                width: 'auto',
                height: 'auto',
                display: 'block',
                objectFit: 'contain'
              }}
              onLoad={(e) => {
                // Ensure landscape images maintain proper aspect ratio
                const img = e.target as HTMLImageElement;
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                
                // For landscape images (typical YouTube thumbnails are 16:9)
                if (aspectRatio > 1.2) {
                  // Calculate optimal dimensions while respecting viewport constraints
                  const viewportWidth = window.innerWidth;
                  const viewportHeight = window.innerHeight;
                  
                  // Use 90% of viewport for safety margin
                  const maxAllowedWidth = viewportWidth * 0.9;
                  const maxAllowedHeight = viewportHeight * 0.85;
                  
                  // Calculate dimensions based on aspect ratio
                  let targetWidth = Math.min(1400, maxAllowedWidth);
                  let targetHeight = targetWidth / aspectRatio;
                  
                  // If height exceeds max allowed, recalculate based on height
                  if (targetHeight > maxAllowedHeight) {
                    targetHeight = maxAllowedHeight;
                    targetWidth = targetHeight * aspectRatio;
                  }
                  
                  // Apply the calculated dimensions
                  img.style.width = `${targetWidth}px`;
                  img.style.height = `${targetHeight}px`;
                  img.style.maxWidth = 'none';
                  img.style.maxHeight = 'none';
                }
              }}
              onError={(e) => {
                console.error('Image failed to load:', imageUrl);
                // Fallback handling could be added here
              }}
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-lg">無法載入圖片</p>
              <p className="text-sm mt-2 text-gray-400">圖片 URL 無效或為空</p>
            </div>
          )}
          
          {/* Filename overlay */}
          {filename && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
              <p className="text-sm truncate" title={filename}>{filename}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};