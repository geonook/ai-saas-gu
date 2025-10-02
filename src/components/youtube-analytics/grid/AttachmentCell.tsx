'use client';

import React, { useRef } from 'react';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { AttachmentType } from '@/types/youtube-analytics';

interface AttachmentCellProps {
  params: GridRenderCellParams;
  onImagePreview?: (imageUrl: string, filename: string) => void;
  onGenerateThumbnail?: (originalImageUrl?: string, thumbnailDescription?: string, recordId?: string) => void;
  record?: any; // Full record data to extract thumbnail description
}

export const AttachmentCell = ({ 
  params, 
  onImagePreview,
  onGenerateThumbnail,
  record
}: AttachmentCellProps) => {
  const attachments = params.value as AttachmentType[];
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle single click with delay (for generate thumbnail)
  const handleSingleClick = (firstImage: AttachmentType) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      if (onGenerateThumbnail) {
        // Get the image URL for the thumbnail generation
        const imageUrl = firstImage?.url || firstImage?.thumbnails?.large?.url || firstImage?.thumbnails?.small?.url || null;
        
        // Extract thumbnail description from the record
        const record = params.row;
        
        // Debug: Show all record fields to find the correct field
        console.log('📋 [AttachmentCell] Record field mapping:', {
          recordKeys: Object.keys(record),
          recordValues: Object.entries(record).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'string' ? value.substring(0, 100) : value;
            return acc;
          }, {} as any)
        });
        
        // Try multiple possible field names and IDs
        const thumbnailDescription = 
          record['Thumbnail Description'] || 
          record['thumbnail_description'] || 
          record['description'] || 
          record['Description'] ||
          // Add more field IDs as we discover them
          record['fldXDd4YqdflQJgbK'] || // Last field in the array - might be it
          record['fld7uYfyLrJOFUTJ6'] || // Second to last
          record['fldGGFhUb1xYxIhJP'] || // Third to last
          '';
        
        const recordId = record.id || '';
        
        console.log('🖼️ [AttachmentCell] Generating thumbnail with data:', {
          imageUrl: imageUrl,
          thumbnailDescription: thumbnailDescription,
          recordId: recordId
        });
        
        if (imageUrl) {
          onGenerateThumbnail(imageUrl, thumbnailDescription, recordId);
        } else {
          console.warn('❌ [AttachmentCell] No valid image URL found for thumbnail generation');
        }
      }
      clickTimeoutRef.current = null;
    }, 300); // 300ms delay to detect double click
  };

  // Handle double click (for image preview)
  const handleDoubleClick = (imageUrl: string, filename: string) => {
    // Clear single click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    if (onImagePreview && imageUrl) {
      onImagePreview(imageUrl, filename);
    }
  };
  
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return <span className="text-gray-500">No image</span>;
  }

  // Check if any attachment is an image
  const imageAttachments = attachments.filter((attachment: AttachmentType) => {
    return attachment?.type?.startsWith('image/') || 
           attachment?.filename?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  });

  if (imageAttachments.length > 0) {
    const firstImage = imageAttachments[0];
    const imageUrl = firstImage.url || firstImage.thumbnails?.large?.url || firstImage.thumbnails?.small?.url;
    
    return (
      <div className="flex items-center justify-center h-full py-1">
        <img 
          src={firstImage.url || firstImage.thumbnails?.small?.url} 
          alt={firstImage.filename || 'Thumbnail'}
          className="h-10 w-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
          style={{ maxHeight: '40px', maxWidth: '64px' }}
          onClick={() => handleSingleClick(firstImage)}
          onDoubleClick={() => imageUrl && handleDoubleClick(imageUrl, firstImage.filename || 'Image')}
          title={`Click: Generate AI thumbnail | Double-click: Preview image (${firstImage.filename || 'Image'})`}
        />
      </div>
    );
  }

  // For non-image attachments, show file icon
  const firstFile = attachments[0];
  return (
    <div className="flex items-center justify-center h-full">
      <span className="text-xs text-gray-700 truncate" title={firstFile?.filename}>
        📎 {firstFile?.filename || 'File'}
      </span>
    </div>
  );
};