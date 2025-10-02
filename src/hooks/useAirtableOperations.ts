'use client';

import { useState, useCallback } from 'react';
import { AirtableTable, AirtableField, AirtableRecord } from '@/types/airtable';
import { getTablesFromAPI, getFieldsFromAPI, getRecordsFromAPI, deleteRecordAPI } from '@/lib/airtable';

export const useAirtableOperations = () => {
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [fields, setFields] = useState<AirtableField[]>([]);
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');

  const fetchTables = useCallback(async (baseId: string, source?: string) => {
    if (!baseId) return;
    
    setLoading(true);
    try {
      const tablesData = await getTablesFromAPI(baseId, source);
      setTables(tablesData);
      console.log('Tables loaded:', tablesData.length);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFields = useCallback(async (baseId: string, tableId: string, source?: string) => {
    if (!baseId || !tableId) return;
    
    setLoading(true);
    try {
      const fieldsData = await getFieldsFromAPI(baseId, tableId, source);
      setFields(fieldsData);
      console.log('Fields loaded:', fieldsData.length);
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecords = useCallback(async (baseId: string, tableId: string, source?: string) => {
    if (!baseId || !tableId) return;
    
    setDataLoading(true);
    try {
      const recordsData = await getRecordsFromAPI(baseId, tableId, { source });
      setRecords(recordsData.records || recordsData);
      console.log('Records loaded:', Array.isArray(recordsData) ? recordsData.length : recordsData.records?.length || 0);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const deleteRecord = useCallback(async (baseId: string, tableId: string, recordId: string, source?: string) => {
    try {
      await deleteRecordAPI(baseId, tableId, recordId, source);
      // Note: Record removal from local state is now handled by the calling component for optimistic updates
      console.log('Record deleted successfully:', recordId);
      return true;
    } catch (error) {
      console.error('Failed to delete record:', error);
      return false;
    }
  }, []);

  const searchRecords = useCallback((query: string) => {
    if (!query.trim()) return records;
    
    const searchTerm = query.toLowerCase();
    return records.filter(record => {
      // Search through all field values
      return Object.values(record.fields || {}).some(value => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm);
        }
        if (Array.isArray(value)) {
          return value.some(item => 
            typeof item === 'string' && item.toLowerCase().includes(searchTerm)
          );
        }
        return false;
      });
    });
  }, [records]);

  const resetData = useCallback(() => {
    setTables([]);
    setFields([]);
    setRecords([]);
    setSelectedTableId('');
    setLoading(false);
    setDataLoading(false);
  }, []);

  return {
    // States
    tables,
    fields,
    records,
    loading,
    dataLoading,
    selectedTableId,
    
    // Actions
    setSelectedTableId,
    setLoading,
    setDataLoading,
    setRecords,
    fetchTables,
    fetchFields,
    fetchRecords,
    deleteRecord,
    searchRecords,
    resetData,
  };
};