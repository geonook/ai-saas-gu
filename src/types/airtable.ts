export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: 'read' | 'comment' | 'edit' | 'create';
}

export interface AirtableBasesResponse {
  bases: AirtableBase[];
  offset?: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  description?: string;
  fields?: AirtableField[];
}

export interface AirtableTablesResponse {
  tables: AirtableTable[];
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface AirtableFieldsResponse {
  success: boolean;
  fields: AirtableField[];
}

export interface AirtableRecordsResponse {
  success: boolean;
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableError {
  error: {
    type: string;
    message: string;
  };
}