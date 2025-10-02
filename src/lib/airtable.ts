import { AirtableBasesResponse, AirtableBase, AirtableError, AirtableTablesResponse, AirtableTable, AirtableField, AirtableRecord } from '@/types/airtable';

// Server-side function to fetch bases directly from Airtable API
export async function fetchAirtableBases(): Promise<AirtableBase[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Airtable API key is not configured');
  }

  try {
    const response = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: AirtableError = await response.json();
      throw new Error(`Airtable API Error: ${errorData.error.message}`);
    }

    const data: AirtableBasesResponse = await response.json();
    return data.bases;
  } catch (error) {
    console.error('Error fetching Airtable bases:', error);
    throw error;
  }
}

// Server-side function to get bases (for API routes)
export async function getAirtableBases(): Promise<AirtableBase[]> {
  return fetchAirtableBases();
}

// Server-side function to fetch tables for a specific base
export async function fetchAirtableTables(baseId: string): Promise<AirtableTable[]> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Airtable API key is not configured');
  }

  try {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: AirtableError = await response.json();
      throw new Error(`Airtable API Error: ${errorData.error.message}`);
    }

    const data: AirtableTablesResponse = await response.json();
    return data.tables;
  } catch (error) {
    console.error('Error fetching Airtable tables:', error);
    throw error;
  }
}

// Server-side function to get tables (for API routes)
export async function getAirtableTables(baseId: string): Promise<AirtableTable[]> {
  return fetchAirtableTables(baseId);
}

// Client-side function to get bases (calls API route)
export async function getBasesFromAPI(): Promise<AirtableBase[]> {
  const response = await fetch('/api/airtable/bases');
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch bases: ${error}`);
  }
  
  const data = await response.json();
  return data.bases;
}

// Client-side function to get tables (calls API route)
export async function getTablesFromAPI(baseId: string, source?: string): Promise<AirtableTable[]> {
  const url = `/api/airtable/bases/${baseId}/tables${source ? `?source=${source}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch tables: ${error}`);
  }
  
  const data = await response.json();
  return data.tables;
}

// Client-side function to get table fields (calls API route)
export async function getFieldsFromAPI(baseId: string, tableId: string, source?: string): Promise<AirtableField[]> {
  const url = `/api/airtable/bases/${baseId}/tables/${tableId}/fields${source ? `?source=${source}` : ''}`;
  console.log('🔍 Fetching fields from URL:', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Fields API error:', error);
    throw new Error(`Failed to fetch fields: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Fields response:', data);
  return data.fields;
}

// Client-side function to get table records (calls API route)
export async function getRecordsFromAPI(
  baseId: string, 
  tableId: string, 
  options?: {
    pageSize?: number;
    offset?: string;
    sort?: string;
    filterByFormula?: string;
    source?: string;
  }
): Promise<{ records: AirtableRecord[]; offset?: string }> {
  const queryParams = new URLSearchParams();
  
  if (options?.pageSize) queryParams.append('pageSize', options.pageSize.toString());
  if (options?.offset) queryParams.append('offset', options.offset);
  if (options?.sort) queryParams.append('sort', options.sort);
  if (options?.filterByFormula) queryParams.append('filterByFormula', options.filterByFormula);
  if (options?.source) queryParams.append('source', options.source);

  const url = `/api/airtable/bases/${baseId}/tables/${tableId}/records${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;
  
  console.log('🔍 Fetching records from URL:', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Records API error:', error);
    throw new Error(`Failed to fetch records: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Records response:', { recordCount: data.records?.length, hasOffset: !!data.offset });
  return { records: data.records, offset: data.offset };
}

// Client-side function to update a record (calls API route)
export async function updateRecordAPI(
  baseId: string,
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const url = `/api/airtable/bases/${baseId}/tables/${tableId}/records`;
  
  console.log('🔄 Updating record via API:', { recordId, fields });
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recordId,
      fields,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Update API error:', error);
    throw new Error(`Failed to update record: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Record updated successfully:', data.record.id);
  return data.record;
}

// Client-side function to delete a record (calls API route)
export async function deleteRecordAPI(
  baseId: string,
  tableId: string,
  recordId: string,
  source?: string
): Promise<{ success: boolean; id: string }> {
  const url = `/api/airtable/bases/${baseId}/tables/${tableId}/records/${recordId}${source ? `?source=${source}` : ''}`;
  
  console.log('🗑️ Deleting record via API:', { baseId, tableId, recordId, source });
  
  const response = await fetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Delete API error:', error);
    throw new Error(`Failed to delete record: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Record deleted successfully:', data.id);
  return data;
}