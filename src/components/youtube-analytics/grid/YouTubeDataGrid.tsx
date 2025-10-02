'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Trash2, Youtube, FileText } from 'lucide-react';
import { AirtableRecord, AirtableField, AirtableTable } from '@/types/airtable';
import { RecordIdentifier } from '@/types/youtube-analytics';
import { fieldsToColumns, processRecordForGrid } from '@/lib/field-mapping';
import { AttachmentCell } from './AttachmentCell';
import { ButtonCell } from './ButtonCell';
import { TextCell } from './TextCell';
import { LoadingSpinner } from '@/components/common/loading-spinner';

interface YouTubeDataGridProps {
  records: AirtableRecord[];
  fields: AirtableField[];
  tables: AirtableTable[];
  selectedTableId: string;
  loading: boolean;
  onImagePreview: (imageUrl: string, filename: string) => void;
  onDeleteRecord: (recordId: string, recordInfo: RecordIdentifier) => void;
  onGenerateSummary: (recordId: string, transcript: string) => Promise<void>;
  onTextPreview: (text: string, fieldName: string) => void;
  onGenerateThumbnail: (originalImageUrl?: string, thumbnailDescription?: string, recordId?: string) => void;
}

export const YouTubeDataGrid = ({
  records,
  fields,
  tables,
  selectedTableId,
  loading,
  onImagePreview,
  onDeleteRecord,
  onGenerateSummary,
  onTextPreview,
  onGenerateThumbnail
}: YouTubeDataGridProps) => {
  
  // Helper function to extract meaningful record information
  const getRecordIdentifier = useMemo(() => (record: AirtableRecord): RecordIdentifier => {
    const fieldMap = fields.reduce((acc, field) => {
      acc[field.name.toLowerCase()] = field.name;
      return acc;
    }, {} as Record<string, string>);
    
    // Common field name patterns for YouTube data
    const titleField = fieldMap['title'] || fieldMap['video title'] || fieldMap['name'] || 
                      fields.find(f => f.name.toLowerCase().includes('title'))?.name;
    const channelField = fieldMap['channel'] || fieldMap['channel name'] || fieldMap['author'] ||
                        fields.find(f => f.name.toLowerCase().includes('channel'))?.name;
    const dateField = fieldMap['publish date'] || fieldMap['published'] || fieldMap['date'] ||
                     fields.find(f => f.name.toLowerCase().includes('date') || f.name.toLowerCase().includes('publish'))?.name;
    const viewField = fieldMap['views'] || fieldMap['view count'] || fieldMap['viewcount'] ||
                     fields.find(f => f.name.toLowerCase().includes('view'))?.name;
    const keywordField = fieldMap['keywords'] || fieldMap['keyword'] || fieldMap['tags'] || fieldMap['tag'] ||
                        fields.find(f => f.name.toLowerCase().includes('keyword') || f.name.toLowerCase().includes('tag'))?.name;
    
    // Extract values
    const title = titleField ? String(record.fields[titleField] || '').trim() : '';
    const channel = channelField ? String(record.fields[channelField] || '').trim() : '';
    const publishDate = dateField ? String(record.fields[dateField] || '').trim() : '';
    const viewCount = viewField ? String(record.fields[viewField] || '').trim() : '';
    const keywords = keywordField ? String(record.fields[keywordField] || '').trim() : '';
    
    // Format view count if it's a number
    const formattedViewCount = viewCount && !isNaN(Number(viewCount)) 
      ? Number(viewCount).toLocaleString() 
      : viewCount;
    
    // Use primary field as fallback
    const primaryFieldId = tables.find(t => t.id === selectedTableId)?.primaryFieldId;
    const fallbackName = primaryFieldId ? String(record.fields[primaryFieldId] || record.id) : record.id;
    
    return {
      title: title || undefined,
      channel: channel || undefined,
      publishDate: publishDate || undefined,
      viewCount: formattedViewCount || undefined,
      keywords: keywords || undefined,
      fallbackName
    };
  }, [fields, tables, selectedTableId]);
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    recordId: string;
    transcript: string;
  } | null>(null);

  // Handle context menu close
  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Handle outside click to close context menu
  useEffect(() => {
    const handleClick = () => handleContextMenuClose();
    if (contextMenu) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Handle summary generation
  const handleSummaryGeneration = async () => {
    if (contextMenu) {
      await onGenerateSummary(contextMenu.recordId, contextMenu.transcript);
      handleContextMenuClose();
    }
  };
  // Generate columns from fields
  const columns = useMemo(() => {
    if (fields.length === 0) return [];
    
    const baseColumns = fieldsToColumns(fields);
    
    
    // Override columns with custom renderers and formatting
    return baseColumns.map(column => {
      const field = fields.find(f => f.id === column.field);
      
      // Handle Transcript field with context menu and text preview
      if (field?.name?.toLowerCase().includes('transcript')) {
        return {
          ...column,
          renderCell: (params: GridRenderCellParams) => {
            const record = records.find(r => r.id === params.row.id);
            const transcriptValue = record?.fields[field.name];
            
            // Type validation for transcript value
            if (typeof transcriptValue !== 'string') {
              return (
                <div className="h-full flex items-center px-2">
                  <span className="text-sm text-gray-400">No transcript</span>
                </div>
              );
            }
            
            return (
              <TextCell
                params={params}
                fieldName={field.name}
                onTextPreview={onTextPreview}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (transcriptValue && transcriptValue.trim().length > 0) {
                    setContextMenu({
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                      recordId: params.row.id,
                      transcript: transcriptValue
                    });
                  }
                }}
              />
            );
          },
        };
      }
      
      // Handle attachment columns
      if (field?.type === 'multipleAttachments') {
        return {
          ...column,
          renderCell: (params: GridRenderCellParams) => (
            <AttachmentCell 
              params={params} 
              onImagePreview={onImagePreview}
              onGenerateThumbnail={onGenerateThumbnail}
            />
          ),
        };
      }
      
      // Handle button columns
      if (field?.type === 'button') {
        return {
          ...column,
          editable: false,
          renderCell: (params: GridRenderCellParams) => (
            <ButtonCell params={params} />
          ),
        };
      }

      // Handle string type columns (short text / long text)
      if (field?.type === 'singleLineText' || field?.type === 'multilineText' || field?.type === 'richText') {
        return {
          ...column,
          renderCell: (params: GridRenderCellParams) => (
            <TextCell
              params={params}
              fieldName={field.name}
              onTextPreview={onTextPreview}
            />
          ),
        };
      }
      
      // Handle Key_Ratio field with conditional styling
      if (field?.name === 'Key_Ratio' || column.field === 'Key_Ratio') {
        return {
          ...column,
          type: 'number',
          editable: false,
          align: 'right' as const,
          headerAlign: 'right' as const,
          cellClassName: (params: { value: unknown }) => {
            const value = parseFloat(String(params.value));
            return value >= 0.5 ? 'key-ratio-highlight' : '';
          },
          valueFormatter: (value: unknown) => {
            if (value == null || isNaN(parseFloat(String(value)))) {
              return '-';
            }
            return parseFloat(String(value)).toFixed(2);
          },
        } as GridColDef;
      }
      
      return column;
    });
  }, [fields, onImagePreview, onTextPreview, onGenerateThumbnail]);

  // Create delete column
  const deleteColumn: GridColDef = useMemo(() => ({
    field: 'delete',
    headerName: '',
    width: 80,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: (params: GridRenderCellParams) => {
      const record = records.find(r => r.id === params.row.id);
      const recordInfo = record ? getRecordIdentifier(record) : { fallbackName: params.row.id };
      
      return (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRecord(params.row.id, recordInfo);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-red-50 text-red-600 hover:text-red-800 transition-colors"
            title="Delete record"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  }), [records, getRecordIdentifier, onDeleteRecord]);

  // Process records for grid display
  const processedRows = useMemo(() => 
    records.map(record => processRecordForGrid(record, fields)),
    [records, fields]
  );

  // Combine columns
  const gridColumns = useMemo(() => 
    [deleteColumn, ...columns], 
    [deleteColumn, columns]
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">載入 YouTube 影片資料中...</p>
        </div>
      </div>
    );
  }

  if (processedRows.length === 0 || gridColumns.length === 0) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <div className="text-muted-foreground">
          <Youtube className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-semibold mb-2">暫無影片資料</h3>
          <p className="text-sm">
            資料庫中目前沒有 YouTube 影片資料，請使用爬取影片資料功能。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
      <DataGrid
        rows={processedRows}
        columns={gridColumns}
        pagination
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
          columns: {
            columnVisibilityModel: {
              'fldi64UrtkPvvPkf3': false, // Hide Video ID column
              'fldlcSPs5jqN5ZfOn': false, // Hide Youtube Url column
            },
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
          '& .key-ratio-highlight': {
            backgroundColor: '#dcfce7',
            color: '#166534',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 8px',
            height: '100%',
            textAlign: 'right',
          },
        }}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            zIndex: 1000,
          }}
          className="bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            onClick={handleSummaryGeneration}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Summary Transcript
          </button>
        </div>
      )}
    </div>
  );
};