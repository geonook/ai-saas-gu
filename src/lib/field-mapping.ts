import { GridColDef } from '@mui/x-data-grid';
import { AirtableField, AirtableRecord } from '@/types/airtable';

export interface ColumnMapping {
  field: string;
  headerName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'singleSelect';
  width: number;
  editable?: boolean;
  valueOptions?: string[];
}

/**
 * Maps Airtable field types to MUI DataGrid column definitions
 */
export function airtableFieldToColumn(field: AirtableField, isPrimary: boolean = false): GridColDef {
  // Define read-only field types that cannot be edited
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
  
  // Determine if field should be editable
  const isEditable = !readOnlyFieldTypes.includes(field.type);
  
  const baseColumn: GridColDef = {
    field: field.id,
    headerName: field.name || field.id, // Fallback to field.id if name is empty
    width: isPrimary ? 200 : 150,
    editable: isEditable,
    hideable: true, // Enable column hiding/showing
  };

  // Map Airtable field types to DataGrid column types
  switch (field.type) {
    case 'singleLineText':
    case 'multilineText':
    case 'richText':
    case 'email':
    case 'url':
    case 'phoneNumber':
      return {
        ...baseColumn,
        type: 'string',
        width: field.type === 'multilineText' ? 250 : 150,
      };

    case 'number':
    case 'currency':
    case 'percent':
    case 'duration':
    case 'rating':
      return {
        ...baseColumn,
        type: 'number',
        width: 120,
        valueFormatter: (value: number) => {
          if (value == null) return '';
          if (field.type === 'currency') {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value);
          }
          if (field.type === 'percent') {
            return `${(value * 100).toFixed(2)}%`;
          }
          return value.toString();
        },
      };

    case 'checkbox':
      return {
        ...baseColumn,
        type: 'boolean',
        width: 100,
      };

    case 'singleSelect':
      return {
        ...baseColumn,
        type: 'singleSelect',
        width: 150,
        valueOptions: Array.isArray(field.options?.choices) 
          ? field.options.choices.map((choice: { name: string }) => choice.name) 
          : [],
      };

    case 'multipleSelects':
      return {
        ...baseColumn,
        type: 'string',
        width: 200,
        valueFormatter: (value: unknown[]) => {
          if (!Array.isArray(value)) return '';
          return value.join(', ');
        },
      };

    case 'date':
    case 'dateTime':
      return {
        ...baseColumn,
        type: 'date',
        width: 150,
        valueGetter: (value: string) => {
          return value ? new Date(value) : null;
        },
        valueFormatter: (value: Date) => {
          if (!value) return '';
          // Ensure value is a Date object
          const date = value instanceof Date ? value : new Date(value);
          if (isNaN(date.getTime())) return '';
          
          if (field.type === 'date') {
            return date.toLocaleDateString();
          } else {
            // Use 24-hour format for datetime
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${month}/${day}/${year} ${hours}:${minutes}`;
          }
        },
      };

    case 'multipleAttachments':
      return {
        ...baseColumn,
        type: 'string',
        width: 150,
        valueFormatter: (value: unknown[]) => {
          if (!Array.isArray(value)) return '';
          return `${value.length} file(s)`;
        },
        // Will be overridden with custom renderCell in the main component
      };

    case 'multipleRecordLinks':
      return {
        ...baseColumn,
        type: 'string',
        width: 180,
        valueFormatter: (value: unknown[]) => {
          if (!Array.isArray(value)) return '';
          return `${value.length} record(s)`;
        },
      };

    case 'formula':
    case 'rollup':
    case 'lookup':
      return {
        ...baseColumn,
        type: 'string',
        width: 150,
        valueFormatter: (value: unknown) => {
          if (value == null) return '';
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value);
        },
      };

    case 'count':
      return {
        ...baseColumn,
        type: 'number',
        width: 100,
      };

    case 'createdTime':
    case 'lastModifiedTime':
      return {
        ...baseColumn,
        type: 'date',
        width: 160,
        valueGetter: (value: string) => {
          return value ? new Date(value) : null;
        },
        valueFormatter: (value: Date) => {
          if (!value) return '';
          // Ensure value is a Date object
          const date = value instanceof Date ? value : new Date(value);
          if (isNaN(date.getTime())) return '';
          
          // Use 24-hour format for datetime
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${month}/${day}/${year} ${hours}:${minutes}`;
        },
      };

    case 'button':
      return {
        ...baseColumn,
        type: 'string',
        width: 100,
        editable: false, // Button fields are not editable
        sortable: false, // Button fields are not sortable
        valueFormatter: (value: any) => {
          if (!value || typeof value !== 'object') return '';
          return value.label || '🔗';
        },
        // Will be overridden with custom renderCell in the main component
      };

    default:
      // Fallback for unknown field types
      return {
        ...baseColumn,
        type: 'string',
        width: 150,
        valueFormatter: (value: unknown) => {
          if (value == null) return '';
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value);
        },
      };
  }
}

/**
 * Converts Airtable fields array to DataGrid columns array
 */
export function fieldsToColumns(fields: AirtableField[], primaryFieldId?: string): GridColDef[] {
  return fields.map(field => 
    airtableFieldToColumn(field, field.id === primaryFieldId)
  );
}

/**
 * Processes Airtable record data for DataGrid consumption
 */
export function processRecordForGrid(record: AirtableRecord, fields: AirtableField[]) {
  const processedRecord: Record<string, unknown> = {
    id: record.id,
    createdTime: record.createdTime,
  };

  // Map each field value
  fields.forEach(field => {
    const value = record.fields[field.name];
    processedRecord[field.id] = value;
  });

  return processedRecord;
}