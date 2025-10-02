'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { AirtableBase, AirtableTable, AirtableField, AirtableRecord } from '@/types/airtable';
import { getBasesFromAPI, getTablesFromAPI, getFieldsFromAPI, getRecordsFromAPI, updateRecordAPI } from '@/lib/airtable';
import { fieldsToColumns, processRecordForGrid } from '@/lib/field-mapping';
import { DataGrid, GridColDef, GridRowModel, GridRenderCellParams, GridRenderEditCellParams } from '@mui/x-data-grid';
import { Database, RefreshCw, Table, X, Play } from 'lucide-react';

// Image preview modal component
const ImagePreviewModal = ({ 
  imageUrl, 
  filename, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string; 
  filename: string; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  console.log('🖼️ ImagePreviewModal render:', { imageUrl, filename, isOpen });
  
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white rounded-full p-2 shadow-lg hover:bg-opacity-90 hover:scale-110 hover:shadow-xl active:scale-95 active:bg-opacity-100 transition-all duration-150"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt={filename}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
        {filename && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 rounded-b-lg">
            <p className="text-sm truncate">{filename}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// Video preview modal component
const VideoPreviewModal = ({ 
  videoUrl, 
  filename, 
  isOpen, 
  onClose 
}: { 
  videoUrl: string; 
  filename: string; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  console.log('🎥 VideoPreviewModal render:', { videoUrl, filename, isOpen });
  
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] bg-black rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-70 text-white rounded-full p-2 shadow-lg hover:bg-opacity-90 hover:scale-110 hover:shadow-xl active:scale-95 active:bg-opacity-100 transition-all duration-150"
        >
          <X className="h-5 w-5" />
        </button>
        <video
          src={videoUrl}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[90vh] rounded-lg"
          style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        >
          Your browser does not support the video tag.
        </video>
        {filename && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 rounded-b-lg">
            <p className="text-sm truncate">{filename}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// Advanced Airtable-style date/datetime picker with popup calendar and time selector
const CustomDateTimeEditCell = ({ params, fieldsData }: { 
  params: GridRenderEditCellParams, 
  fieldsData: AirtableField[] 
}) => {
  const currentField = fieldsData.find(f => f.id === params.field);
  const isDateTime = currentField?.type === 'dateTime';
  
  console.log('🗓️ CustomDateTimeEditCell rendered for field:', currentField?.name, currentField?.type);
  console.log('🗓️ Initial params.value:', params.value);
  const [isOpen] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(() => {
    if (params.value) {
      const date = new Date(params.value as string);
      console.log('🗓️ Parsed initial date:', date, 'isValid:', !isNaN(date.getTime()));
      return isNaN(date.getTime()) ? null : date;
    }
    console.log('🗓️ No initial value, setting selectedDate to null');
    return null;
  });
  const [selectedTime, setSelectedTime] = React.useState(() => {
    if (params.value && isDateTime) {
      const date = new Date(params.value as string);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }
    return '00:00';
  });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [popupPosition, setPopupPosition] = React.useState({ top: 0, left: 0 });

  // Format display value
  const displayValue = React.useMemo(() => {
    console.log('📅 formatDisplayValue called:', { selectedDate, selectedTime, isDateTime });
    if (!selectedDate) return '';
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const year = selectedDate.getFullYear();
    
    const formattedValue = isDateTime 
      ? `${month}/${day}/${year} ${selectedTime}`
      : `${month}/${day}/${year}`;
    
    console.log('📅 Formatted value:', formattedValue);
    return formattedValue;
  }, [selectedDate, selectedTime, isDateTime]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const now = new Date();
    const currentMonth = selectedDate ? selectedDate.getMonth() : now.getMonth();
    const currentYear = selectedDate ? selectedDate.getFullYear() : now.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Generate time options
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeStr);
      }
    }
    return times;
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const currentMonth = selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  const currentYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    updateValue(date, selectedTime);
    
    // If it's a date-only field, close the picker after selecting date
    if (!isDateTime) {
      setTimeout(() => {
        params.api.stopCellEditMode({ id: params.id, field: params.field });
      }, 50);
    }
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    updateValue(selectedDate, time);
    
    // Close the picker after selecting time for datetime fields
    setTimeout(() => {
      params.api.stopCellEditMode({ id: params.id, field: params.field });
    }, 50);
  };

  // Handle clear action
  const handleClear = () => {
    setSelectedDate(null);
    setSelectedTime('00:00');
    updateValue(null, '00:00');
    
    // Close the picker after clearing
    setTimeout(() => {
      params.api.stopCellEditMode({ id: params.id, field: params.field });
    }, 50);
  };

  // Update the grid value
  const updateValue = (date: Date | null, time: string) => {
    let value: string | null = null;
    
    console.log('🔄 updateValue called:', { date, time, isDateTime });
    
    if (date) {
      if (isDateTime) {
        const [hours, minutes] = time.split(':');
        const finalDate = new Date(date);
        finalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        value = finalDate.toISOString();
      } else {
        // For date-only fields, use YYYY-MM-DD format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        value = `${year}-${month}-${day}`;
      }
    }
    
    console.log('📤 Setting cell value:', { 
      id: params.id, 
      field: params.field, 
      value: value 
    });
    
    params.api.setEditCellValue({
      id: params.id,
      field: params.field,
      value: value
    });
  };

  // Handle month navigation
  const navigateMonth = (direction: number) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  // Calculate popup position
  React.useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      });
    }
  }, []);

  // Handle clicks outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both the input and the popup
      const target = event.target as Node;
      const isOutsideInput = containerRef.current && !containerRef.current.contains(target);
      const isOutsidePopup = !document.querySelector('[style*="z-index: 9999"]')?.contains(target);
      
      if (isOutsideInput && isOutsidePopup) {
        params.api.stopCellEditMode({ id: params.id, field: params.field });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [params]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      params.api.stopCellEditMode({ id: params.id, field: params.field });
    } else if (e.key === 'Escape') {
      params.api.stopCellEditMode({ id: params.id, field: params.field, ignoreModifications: true });
    }
  };

  // Fix date picker text color with JavaScript
  React.useEffect(() => {
    const fixDatePickerText = () => {
      const observer = new MutationObserver(() => {
        // Look for date picker elements with our custom z-index
        const datePickerElements = document.querySelectorAll('[style*="z-index: 9999"]');
        datePickerElements.forEach(element => {
          // Force black text on all input and text elements within
          const textElements = element.querySelectorAll('input, span, div, button, label');
          textElements.forEach(textEl => {
            if (textEl instanceof HTMLElement) {
              // Don't override selected dates (blue background)
              if (!textEl.classList.contains('bg-blue-500')) {
                textEl.style.setProperty('color', '#000000', 'important');
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      return () => observer.disconnect();
    };

    const cleanup = fixDatePickerText();
    return cleanup;
  }, []);

  const popupContent = isOpen ? (
    <div 
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-[280px]" 
      style={{ 
        top: popupPosition.top, 
        left: popupPosition.left, 
        zIndex: 9999 
      }}
    >
      {/* Date input field */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={displayValue}
          readOnly
          className="flex-1 px-3 py-2 border border-blue-400 rounded text-sm"
          placeholder={isDateTime ? "mm/dd/yyyy hh:mm" : "mm/dd/yyyy"}
        />
        <button
          onClick={handleClear}
          className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded border border-gray-300 hover:border-red-300 transition-colors"
          title="Clear date/time"
        >
          Clear
        </button>
      </div>

      {/* Calendar */}
      <div className="mb-4">
        {/* Month/Year header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <div className="font-medium">
            {months[currentMonth]} {currentYear}
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {generateCalendarDays().map((date, index) => {
            const isSelected = selectedDate && 
              date.getDate() === selectedDate.getDate() && 
              date.getMonth() === selectedDate.getMonth() && 
              date.getFullYear() === selectedDate.getFullYear();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                className={`
                  text-sm py-1 px-1 rounded hover:bg-blue-100 transition-colors
                  ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                  ${isToday && !isSelected ? 'bg-blue-50 font-semibold' : ''}
                `}
                style={{
                  color: isSelected ? 'white' : '#000000'
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time selector (only for datetime fields) */}
      {isDateTime && (
        <div>
          <div className="text-sm font-medium mb-2">Time</div>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
            {generateTimeOptions().map(time => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={`
                  w-full text-left px-3 py-1 text-sm hover:bg-blue-50 transition-colors text-gray-900
                  ${selectedTime === time ? 'bg-blue-100 text-blue-800' : ''}
                `}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div ref={containerRef} className="w-full h-full">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          readOnly
          onKeyDown={handleKeyDown}
          className="w-full h-full p-2 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
          style={{
            fontFamily: 'inherit',
            fontSize: '13px',
          }}
          placeholder={isDateTime ? "mm/dd/yyyy hh:mm" : "mm/dd/yyyy"}
        />
      </div>
      
      {typeof document !== 'undefined' && popupContent && createPortal(popupContent, document.body)}
    </>
  );
};

// Custom button display component for Airtable button fields
const CustomButtonCell = ({ params }: { params: GridRenderCellParams }) => {
  const buttonData = params.value as any;
  
  console.log('🔘 CustomButtonCell - params.value:', params.value);
  console.log('🔘 CustomButtonCell - buttonData:', buttonData);
  
  if (!buttonData || typeof buttonData !== 'object') {
    return <span className="text-gray-500">-</span>;
  }

  const { label, url } = buttonData;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    if (url) {
      console.log('🔘 Button clicked, opening popup for URL:', url);
      const popup = window.open(
        url, 
        'popup', 
        'width=1000,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );
      
      if (!popup || popup.closed || typeof popup.closed == 'undefined') {
        console.log('⚠️ Popup was blocked by browser, falling back to new tab');
        window.open(url, '_blank');
      } else {
        console.log('✅ Popup opened successfully');
      }
    }
  };

  if (!label && !url) {
    return <span className="text-gray-500">-</span>;
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-900 active:bg-black transition-colors duration-150 font-medium"
      title={url ? `Click to open: ${url}` : 'Button'}
      disabled={!url}
    >
      {label || '🔗'}
    </button>
  );
};

// Custom attachment display component
const CustomAttachmentCell = ({ 
  params, 
  onImagePreview,
  onVideoPreview
}: { 
  params: GridRenderCellParams;
  onImagePreview: (imageUrl: string, filename: string) => void;
  onVideoPreview: (videoUrl: string, filename: string) => void;
}) => {
  const attachments = params.value as any[];
  
  console.log('📎 CustomAttachmentCell - params.value:', params.value);
  console.log('📎 CustomAttachmentCell - attachments:', attachments);
  console.log('📎 CustomAttachmentCell - isArray:', Array.isArray(attachments));
  
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return <span className="text-gray-500">No files</span>;
  }

  // Handle image double click to open preview modal
  const handleImageDoubleClick = (imageUrl: string, filename: string) => {
    console.log('🖼️ Double click detected, calling onImagePreview:', { imageUrl, filename });
    onImagePreview(imageUrl, filename);
  };

  // Handle video double click to open preview modal
  const handleVideoDoubleClick = (videoUrl: string, filename: string) => {
    console.log('🎥 Double click detected, calling onVideoPreview:', { videoUrl, filename });
    onVideoPreview(videoUrl, filename);
  };

  // Check if any attachment is an image
  const imageAttachments = attachments.filter((attachment: any) => {
    return attachment?.type?.startsWith('image/') || 
           attachment?.filename?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  });

  // Check if any attachment is a video
  const videoAttachments = attachments.filter((attachment: any) => {
    return attachment?.type?.startsWith('video/') || 
           attachment?.filename?.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i);
  });

  // Prioritize images first, then videos
  if (imageAttachments.length > 0) {
    const firstImage = imageAttachments[0];
    const imageUrl = firstImage.url || firstImage.thumbnails?.large?.url || firstImage.thumbnails?.small?.url;
    
    return (
      <div className="flex items-center gap-2 h-full py-1">
        <img 
          src={firstImage.url || firstImage.thumbnails?.small?.url} 
          alt={firstImage.filename || 'Attachment'}
          className="h-8 w-8 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity"
          style={{ maxHeight: '32px', maxWidth: '32px' }}
          onDoubleClick={() => handleImageDoubleClick(imageUrl, firstImage.filename)}
          title={`Double-click to preview: ${firstImage.filename || 'Image'}`}
        />
        {attachments.length > 1 && (
          <span className="text-xs text-gray-600">
            +{attachments.length - 1} more
          </span>
        )}
      </div>
    );
  }

  // Handle video attachments
  if (videoAttachments.length > 0) {
    const firstVideo = videoAttachments[0];
    const videoUrl = firstVideo.url;
    
    return (
      <div className="flex items-center gap-2 h-full py-1">
        <div 
          className="h-8 w-8 bg-black bg-opacity-80 rounded border cursor-pointer hover:opacity-75 transition-opacity flex items-center justify-center"
          style={{ maxHeight: '32px', maxWidth: '32px' }}
          onDoubleClick={() => handleVideoDoubleClick(videoUrl, firstVideo.filename)}
          title={`Double-click to play: ${firstVideo.filename || 'Video'}`}
        >
          <Play className="h-4 w-4 text-white fill-white" />
        </div>
        {attachments.length > 1 && (
          <span className="text-xs text-gray-600">
            +{attachments.length - 1} more
          </span>
        )}
      </div>
    );
  }

  // For non-image/video attachments, show file count and first filename
  const firstFile = attachments[0];
  return (
    <div className="flex items-center gap-1 h-full">
      <span className="text-xs text-gray-700 truncate" title={firstFile?.filename}>
        📎 {firstFile?.filename || 'File'}
      </span>
      {attachments.length > 1 && (
        <span className="text-xs text-gray-500">
          +{attachments.length - 1}
        </span>
      )}
    </div>
  );
};

// Simple and reliable text edit component
const CustomTextEditCell = ({ params, fieldsData }: { 
  params: GridRenderEditCellParams, 
  fieldsData: AirtableField[] 
}) => {
  const currentField = fieldsData.find(f => f.id === params.field);
  const isMultiline = currentField?.type === 'multilineText';
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    params.api.setEditCellValue({
      id: params.id,
      field: params.field,
      value: e.target.value
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isMultiline) {
      params.api.stopCellEditMode({ id: params.id, field: params.field });
    } else if (e.key === 'Escape') {
      params.api.stopCellEditMode({ id: params.id, field: params.field, ignoreModifications: true });
    }
  };

  // Basic inline editing - simple and reliable
  if (isMultiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={params.value || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full h-full p-2 border border-blue-400 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
        style={{
          fontFamily: 'inherit',
          fontSize: '13px',
          lineHeight: '1.3',
          minHeight: '60px',
          backgroundColor: 'white',
        }}
        placeholder="Enter text..."
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={params.value || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="w-full h-full p-2 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
      style={{
        fontFamily: 'inherit',
        fontSize: '13px',
        backgroundColor: 'white',
      }}
      placeholder="Enter text..."
    />
  );
};


export default function AirtablePage() {
  const [bases, setBases] = useState<AirtableBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [fields, setFields] = useState<AirtableField[]>([]);
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; filename: string } | null>(null);

  const fetchBases = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedBases = await getBasesFromAPI();
      setBases(fetchedBases);
      if (fetchedBases.length > 0 && !selectedBaseId) {
        setSelectedBaseId(fetchedBases[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bases';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedBaseId]);

  const fetchTables = useCallback(async (baseId: string) => {
    if (!baseId) return;
    
    setTablesLoading(true);
    // Reset table-related state when switching bases
    setSelectedTableId('');
    setFields([]);
    setRecords([]);
    setColumns([]);
    
    try {
      const fetchedTables = await getTablesFromAPI(baseId);
      setTables(fetchedTables);
      if (fetchedTables.length > 0) {
        setSelectedTableId(fetchedTables[0].id);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBases();
  }, [fetchBases]);

  useEffect(() => {
    if (selectedBaseId) {
      fetchTables(selectedBaseId);
    }
  }, [selectedBaseId, fetchTables]);

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      console.log('🔄 Processing row update:', { newRow, oldRow });
      console.log('🔄 Fields comparison:');
      Object.keys(newRow).forEach(key => {
        if (newRow[key] !== oldRow[key]) {
          console.log(`  📝 ${key}: ${oldRow[key]} -> ${newRow[key]}`);
        }
      });
      
      if (!selectedBaseId || !selectedTableId) {
        throw new Error('Base ID or Table ID not selected');
      }

      // Extract the record ID
      const recordId = newRow.id as string;
      
      // Define read-only field types that cannot be updated
      const readOnlyFieldTypes = [
        'formula',
        'rollup',
        'lookup', 
        'count',
        'createdTime',
        'lastModifiedTime',
        'createdBy',
        'lastModifiedBy',
        'autoNumber'
      ];
      
      // Only include fields that have actually changed and are editable
      const updatedFields: Record<string, unknown> = {};
      
      fields.forEach(field => {
        // Skip read-only field types
        if (readOnlyFieldTypes.includes(field.type)) {
          console.log(`⏭️ Skipping read-only field: ${field.name} (${field.type})`);
          return;
        }
        
        // Check if the field value has actually changed
        if (newRow[field.id] !== oldRow[field.id]) {
          updatedFields[field.name] = newRow[field.id];
          console.log(`📝 Field changed: ${field.name} = ${newRow[field.id]}`);
        }
      });

      // If no fields actually changed, don't make an API call
      if (Object.keys(updatedFields).length === 0) {
        console.log('ℹ️ No editable fields changed, skipping update');
        return newRow;
      }

      console.log('📡 Sending update request with fields:', updatedFields);

      // Call the update API
      const updatedRecord = await updateRecordAPI(
        selectedBaseId,
        selectedTableId,
        recordId,
        updatedFields
      );

      // Update the local state with the response from Airtable
      const updatedRecords = records.map((record) => 
        record.id === recordId ? updatedRecord : record
      );
      setRecords(updatedRecords);
      
      console.log('✅ Row update completed successfully');
      return newRow;
      
    } catch (error) {
      console.error('❌ Error updating row:', error);
      
      // Show error to user and revert the change
      const errorMessage = error instanceof Error ? error.message : 'Failed to update record';
      alert(`Update failed: ${errorMessage}`);
      
      // Return the original row to revert the change in the grid
      return oldRow;
    }
  };

  const fetchTableData = useCallback(async (baseId: string, tableId: string) => {
    if (!baseId || !tableId) return;
    
    console.log('🚀 fetchTableData called with:', { baseId, tableId });
    setDataLoading(true);
    try {
      // Fetch fields and records in parallel
      console.log('📡 Starting parallel API calls...');
      const [fieldsData, recordsData] = await Promise.all([
        getFieldsFromAPI(baseId, tableId),
        getRecordsFromAPI(baseId, tableId, { pageSize: 100 })
      ]);

      setFields(fieldsData);
      setRecords(recordsData.records);

      // Generate columns based on fields
      const selectedTable = tables.find(t => t.id === tableId);
      const generatedColumns = fieldsToColumns(fieldsData, selectedTable?.primaryFieldId);
      

      // Customize columns with custom renderers
      const customizedColumns = generatedColumns.map(column => {
        const field = fieldsData.find(f => f.id === column.field);
        
        // Debug log for all field types to find attachment fields
        console.log(`🔍 Field: ${field?.name}, Type: ${field?.type}, ID: ${field?.id}`);
        
        // Debug log for date fields
        if (['date', 'dateTime'].includes(field?.type || '')) {
          console.log(`📅 Found date field: ${field?.name} (${field?.type}), editable: ${column.editable}`);
        }
        
        // Apply custom button cell renderer for button fields
        if (field?.type === 'button') {
          console.log(`🔘 Found button field: ${field?.name}, applying custom renderer`);
          return {
            ...column,
            renderCell: (params: GridRenderCellParams) => (
              <CustomButtonCell params={params} />
            ),
          };
        }
        
        // Apply custom attachment cell renderer for attachment fields
        if (field?.type === 'multipleAttachments') {
          console.log(`📎 Found attachment field: ${field?.name}, applying custom renderer`);
          return {
            ...column,
            renderCell: (params: GridRenderCellParams) => (
              <CustomAttachmentCell 
                params={params} 
                onImagePreview={(url, filename) => {
                  console.log('🖼️ Main component received image preview request:', { url, filename });
                  setPreviewImage({ url, filename });
                }}
                onVideoPreview={(url, filename) => {
                  console.log('🎥 Main component received video preview request:', { url, filename });
                  setPreviewVideo({ url, filename });
                }}
              />
            ),
          };
        }
        
        if (field?.type === 'checkbox') {
          return {
            ...column,
            renderCell: (params: GridRenderCellParams) => (
              <div className="flex items-center justify-center">
                {Boolean(params.value) ? (
                  <div className="w-4 h-4 bg-blue-600 border border-blue-600 rounded flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-4 h-4 border-2 border-gray-300 rounded bg-white"></div>
                )}
              </div>
            ),
            renderEditCell: (params: GridRenderEditCellParams) => (
              <input
                type="checkbox"
                checked={Boolean(params.value)}
                onChange={(e) => params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: e.target.checked
                })}
                className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
            ),
          };
        }
        
        // Apply custom date/datetime edit cell to date field types (only for editable fields)
        if (['date', 'dateTime'].includes(field?.type || '') && column.editable) {
          return {
            ...column,
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CustomDateTimeEditCell params={params} fieldsData={fieldsData} />
            ),
          };
        }

        // Apply custom text edit cell to text field types
        if (['singleLineText', 'multilineText', 'richText', 'email', 'url', 'phoneNumber'].includes(field?.type || '')) {
          return {
            ...column,
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CustomTextEditCell params={params} fieldsData={fieldsData} />
            ),
          };
        }

        // Apply MUI X native singleSelect type for dropdown fields
        if (field?.type === 'singleSelect') {
          const options = Array.isArray(field.options?.choices) ? field.options.choices : [];
          const valueOptions = options.map((option: { name: string }) => option.name);
          
          console.log(`🔧 Setting up singleSelect column for field: ${field.name}`, {
            fieldId: field.id,
            valueOptions,
            editable: true
          });
          
          return {
            ...column,
            type: 'singleSelect' as const, // Use MUI X built-in singleSelect type
            valueOptions: valueOptions, // Provide dropdown options
            editable: true, // Enable editing with built-in behavior
          };
        }
        
        return column;
      });
      
      setColumns(customizedColumns);
    } catch (err) {
      console.error('Error fetching table data:', err);
      setFields([]);
      setRecords([]);
      setColumns([]);
    } finally {
      setDataLoading(false);
    }
  }, [tables]);

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { 
      selectedBaseId, 
      selectedTableId, 
      tablesCount: tables.length,
      tableIds: tables.map(t => t.id)
    });
    
    if (selectedBaseId && selectedTableId && tables.length > 0) {
      // Verify that the selected table exists in the current tables array
      const tableExists = tables.some(table => table.id === selectedTableId);
      console.log('🔍 Table exists check:', { selectedTableId, tableExists });
      
      if (tableExists) {
        console.log('✅ Calling fetchTableData...');
        fetchTableData(selectedBaseId, selectedTableId);
      } else {
        console.log('❌ Table does not exist in current tables array');
      }
    }
  }, [selectedBaseId, selectedTableId, tables, fetchTableData]);

  // Force fix manage columns text color with JavaScript
  useEffect(() => {
    const fixColumnsManagementText = () => {
      const observer = new MutationObserver(() => {
        // Look for any manage columns dialog elements
        const managementElements = document.querySelectorAll('[class*="columnsManagement"], [class*="MuiDataGrid-columnsManagement"]');
        managementElements.forEach(element => {
          // Force black text on all text elements within
          const textElements = element.querySelectorAll('span, label, .MuiTypography-root, .MuiFormControlLabel-label');
          textElements.forEach(textEl => {
            if (textEl instanceof HTMLElement) {
              textEl.style.setProperty('color', '#000000', 'important');
              textEl.style.setProperty('font-weight', '600', 'important');
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });

      return () => observer.disconnect();
    };

    const cleanup = fixColumnsManagementText();
    return cleanup;
  }, []);

  const selectedTable = tables.find(table => table.id === selectedTableId);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Database className="h-6 w-6 text-primary" />
            <select
              value={selectedBaseId}
              onChange={(e) => setSelectedBaseId(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none"
              disabled={loading}
            >
              <option value="">Select a base...</option>
              {bases.map((base) => (
                <option key={base.id} value={base.id}>
                  {base.name}
                </option>
              ))}
            </select>
          </div>
          <Button 
            onClick={() => {
              if (selectedBaseId && selectedTableId) {
                fetchTableData(selectedBaseId, selectedTableId);
              } else {
                fetchBases();
              }
            }} 
            disabled={loading || dataLoading}
            variant="outline"
            size="sm"
          >
            {(loading || dataLoading) ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20">
          <p className="text-sm text-destructive">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Tables Horizontal Bar */}
      <div className="border-b bg-muted/30 p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tablesLoading ? (
            <div className="flex items-center py-2">
              <LoadingSpinner size="sm" className="mr-2" />
              <span className="text-sm text-muted-foreground">Loading tables...</span>
            </div>
          ) : (
            <>
              {tables.map((table) => (
                <Button
                  key={table.id}
                  variant={selectedTableId === table.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTableId(table.id)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Table className="h-4 w-4" />
                  {table.name}
                </Button>
              ))}
              {tables.length === 0 && selectedBaseId && (
                <p className="text-sm text-muted-foreground py-2">
                  No tables found in this base
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {!selectedBaseId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Base Selected</h3>
              <p className="text-muted-foreground">
                Select a base from the dropdown above to view its tables
              </p>
            </div>
          </div>
        ) : !selectedTableId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Table className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Table Selected</h3>
              <p className="text-muted-foreground">
                Select a table from the tabs above to view its data
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  {selectedTable?.name || 'Table Data'}
                  {dataLoading && <LoadingSpinner size="sm" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {dataLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <LoadingSpinner className="mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading table data...</p>
                    </div>
                  </div>
                ) : records.length > 0 && columns.length > 0 ? (
                  <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
                    <DataGrid
                      rows={records.map(record => processRecordForGrid(record, fields))}
                      columns={columns}
                      editMode="cell"
                      processRowUpdate={processRowUpdate}
                      onProcessRowUpdateError={(error) => {
                        console.error('🚨 DataGrid processRowUpdate error:', error);
                      }}
                      pagination
                      pageSizeOptions={[25, 50, 100]}
                      initialState={{
                        pagination: {
                          paginationModel: { page: 0, pageSize: 25 },
                        },
                      }}
                      checkboxSelection={false}
                      disableRowSelectionOnClick
                      disableColumnFilter={false}
                      disableColumnMenu={false}
                      sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                          borderBottom: '1px solid var(--border)',
                        },
                        '& .MuiDataGrid-columnHeaders': {
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: 'var(--muted)',
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <div className="text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                      <p className="text-sm">
                        {fields.length === 0 ? 'No fields found in this table' : 'No records found in this table'}
                      </p>
                      {selectedTable && (
                        <div className="mt-4 text-xs space-y-1">
                          <p><strong>Table ID:</strong> {selectedTable.id}</p>
                          <p><strong>Primary Field:</strong> {selectedTable.primaryFieldId}</p>
                          {selectedTable.description && (
                            <p><strong>Description:</strong> {selectedTable.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.url}
          filename={previewImage.filename}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
      
      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          videoUrl={previewVideo.url}
          filename={previewVideo.filename}
          isOpen={!!previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </div>
  );
}