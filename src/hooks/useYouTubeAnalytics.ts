'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAirtableOperations } from './useAirtableOperations';
import { useModalStates } from './useModalStates';
import { useToast } from '@/components/ui/toast';
import { createKeywordFilter, extractTitlesFromFiltered } from '@/lib/keyword-utils';

export const useYouTubeAnalytics = () => {
  // Environment variables
  const YOUTUBE_ANALYTICS_BASE_ID = process.env.NEXT_PUBLIC_YOUTUBE_ANALYTICS_BASE_ID || '';
  const YOUTUBE_ANALYTICS_TABLE_ID = process.env.NEXT_PUBLIC_YOUTUBE_ANALYTICS_TABLE_ID || '';
  const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
  const N8N_CREATE_TITLE_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CREATE_TITLE_WEBHOOK_URL || '';
  const N8N_SUMMARY_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_SUMMARY_WEBHOOK_URL || '';

  // Local states
  const [query, setQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [deletingRecords, setDeletingRecords] = useState<Set<string>>(new Set());

  // Use custom hooks
  const airtableOperations = useAirtableOperations();
  const modalStates = useModalStates();
  const { successToast, errorToast, infoToast } = useToast();
  
  // Update keyword filter when records or fields change
  useEffect(() => {
    if (airtableOperations.records.length > 0 && airtableOperations.fields.length > 0) {
      const newKeywordFilter = createKeywordFilter(
        airtableOperations.records,
        airtableOperations.fields,
        modalStates.keywordFilter.selectedKeywords
      );
      modalStates.setKeywordFilter(newKeywordFilter);
    }
  }, [airtableOperations.records, airtableOperations.fields]);

  // Initialize - fetch tables on mount
  useEffect(() => {
    if (!YOUTUBE_ANALYTICS_BASE_ID) {
      setError('YouTube Analytics Base ID not configured');
      return;
    }
    
    // Set loading state immediately when starting initialization
    airtableOperations.setDataLoading(true);
    
    const initializeData = async () => {
      await airtableOperations.fetchTables(YOUTUBE_ANALYTICS_BASE_ID, 'youtube-analytics');
    };
    
    initializeData();
  }, [YOUTUBE_ANALYTICS_BASE_ID]);

  // Set table ID after tables are loaded
  useEffect(() => {
    if (airtableOperations.tables.length > 0 && !airtableOperations.selectedTableId) {
      // Use specified table ID if available, otherwise use first table
      if (YOUTUBE_ANALYTICS_TABLE_ID && airtableOperations.tables.some(t => t.id === YOUTUBE_ANALYTICS_TABLE_ID)) {
        airtableOperations.setSelectedTableId(YOUTUBE_ANALYTICS_TABLE_ID);
      } else {
        airtableOperations.setSelectedTableId(airtableOperations.tables[0].id);
      }
    }
  }, [airtableOperations.tables, airtableOperations.selectedTableId, YOUTUBE_ANALYTICS_TABLE_ID]);

  // Fetch data when table is selected
  useEffect(() => {
    if (YOUTUBE_ANALYTICS_BASE_ID && airtableOperations.selectedTableId) {
      const fetchData = async () => {
        await airtableOperations.fetchFields(YOUTUBE_ANALYTICS_BASE_ID, airtableOperations.selectedTableId, 'youtube-analytics');
        await airtableOperations.fetchRecords(YOUTUBE_ANALYTICS_BASE_ID, airtableOperations.selectedTableId, 'youtube-analytics');
      };
      
      fetchData();
    }
  }, [YOUTUBE_ANALYTICS_BASE_ID, airtableOperations.selectedTableId]);

  // Search functionality
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    if (!N8N_WEBHOOK_URL) {
      setError('n8n webhook URL is not configured');
      return;
    }
    
    airtableOperations.setLoading(true);
    setError(null);
    
    const webhookPayload = {
      q: query.trim()
    };
    
    console.log('Sending request to n8n webhook...', {
      url: N8N_WEBHOOK_URL,
      payload: webhookPayload
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout
    
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000'
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`網路錯誤: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('n8n webhook response:', result);
      
      // Update search history
      setSearchHistory(prev => {
        const newHistory = [query.trim(), ...prev.filter(item => item !== query.trim())];
        return newHistory.slice(0, 10); // Keep only last 10 searches
      });
      
      // Refresh data after search
      if (YOUTUBE_ANALYTICS_BASE_ID && airtableOperations.selectedTableId) {
        await airtableOperations.fetchRecords(YOUTUBE_ANALYTICS_BASE_ID, airtableOperations.selectedTableId);
      }
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Search error:', error);
      
      if (error.name === 'AbortError') {
        setError('請求超時，請稍後再試。如果問題持續存在，請聯繫技術支援。');
      } else if (error.message === 'Failed to fetch') {
        setError('網路連線錯誤，請檢查您的網路連線後重試。');
      } else {
        setError(`搜尋失敗: ${error.message}`);
      }
    } finally {
      airtableOperations.setLoading(false);
    }
  }, [query, N8N_WEBHOOK_URL, YOUTUBE_ANALYTICS_BASE_ID, airtableOperations]);

  // Create title functionality
  const handleCreateTitle = useCallback(async (selectedKeywords: string[] = []) => {
    if (!N8N_CREATE_TITLE_WEBHOOK_URL) {
      setError('Create title webhook URL is not configured');
      return;
    }
    
    if (!modalStates.form.currentTitle.trim() || !modalStates.form.description.trim()) {
      setError('Current title and description are required');
      return;
    }
    
    modalStates.setCreateTitleLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout
    
    try {
      // 根據用戶選擇的 keywords 更新過濾器並收集標題
      const extractFilteredTitles = () => {
        if (!airtableOperations.records || airtableOperations.records.length === 0) {
          console.warn('⚠️ [數據收集] 沒有可用的記錄數據');
          return [];
        }

        // 使用傳入的 selectedKeywords 創建新的過濾器
        const updatedFilter = createKeywordFilter(
          airtableOperations.records,
          airtableOperations.fields,
          selectedKeywords
        );
        
        // 從過濾器中提取標題
        const titles = extractTitlesFromFiltered(updatedFilter.filteredTitles);
        
        console.log('📊 [數據收集] 根據選擇的 keywords 提取標題:', {
          selectedKeywords,
          filteredTitlesCount: updatedFilter.filteredTitles.length,
          titlesCount: titles.length,
          totalRecords: airtableOperations.records.length,
          sampleTitles: titles.slice(0, 3).map(t => t.substring(0, 50) + (t.length > 50 ? '...' : ''))
        });
        
        return titles;
      };

      const titles = extractFilteredTitles();
      
      // 檢查是否成功提取到標題數據
      if (titles.length === 0) {
        console.warn('⚠️ [數據警告] 沒有提取到任何標題，可能的原因:', {
          recordsCount: airtableOperations.records.length,
          fieldsCount: airtableOperations.fields.length,
          selectedKeywords,
          fieldsPreview: airtableOperations.fields.slice(0, 5).map(f => ({ name: f.name, type: f.type }))
        });
      }
      
      // 驗證用日誌：記錄傳送到 webhook 的資料
      const webhookData = {
        currentTitle: modalStates.form.currentTitle.trim(),
        description: modalStates.form.description.trim(),
        transcript: modalStates.form.transcript.trim(),
        specialInstructions: modalStates.form.specialInstructions.trim(),
        titles: titles // 新增：包含 DataGrid 中的所有標題
      };
      
      console.log('🚀 [Webhook 驗證] 準備發送到 n8n webhook:', {
        currentTitle: webhookData.currentTitle,
        description: webhookData.description,
        transcriptLength: webhookData.transcript.length,
        transcriptPreview: webhookData.transcript.substring(0, 100) + (webhookData.transcript.length > 100 ? '...' : ''),
        hasTranscript: !!webhookData.transcript,
        specialInstructionsLength: webhookData.specialInstructions.length,
        hasSpecialInstructions: !!webhookData.specialInstructions,
        titlesCount: webhookData.titles.length,
        titlesPreview: webhookData.titles.slice(0, 3).map(t => t.substring(0, 30) + (t.length > 30 ? '...' : '')),
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch(N8N_CREATE_TITLE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000'
        },
        body: JSON.stringify(webhookData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📨 [Webhook 響應] Create title response:', {
        response: result,
        payloadTitlesCount: titles.length,
        responseType: typeof result,
        hasRecommendedTitles: !!(result.recommendedTitles || (Array.isArray(result) && result.length > 0)),
        timestamp: new Date().toISOString()
      });
      
      // Parse recommended titles from different response formats
      let recommendedTitles: string[] = [];
      
      if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
        recommendedTitles = result;
      } else if (result.recommendedTitles && Array.isArray(result.recommendedTitles)) {
        recommendedTitles = result.recommendedTitles;
      } else if (Array.isArray(result) && result.length > 0 && result[0].message) {
        const content = result[0].message.content;
        if (content && content.recommendedTitles && Array.isArray(content.recommendedTitles)) {
          recommendedTitles = content.recommendedTitles;
        }
      }
      
      if (recommendedTitles.length === 0) {
        throw new Error('No recommended titles received from the API');
      }
      
      modalStates.setRecommendedTitles(recommendedTitles);
      modalStates.setModalStage('results');
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Create title error:', error);
      
      if (error.name === 'AbortError') {
        setError('請求超時，請稍後再試。');
      } else if (error.message === 'Failed to fetch') {
        setError('網路連線錯誤，請檢查網路連線。');
      } else {
        setError(`生成標題失敗: ${error.message}`);
      }
    } finally {
      modalStates.setCreateTitleLoading(false);
    }
  }, [N8N_CREATE_TITLE_WEBHOOK_URL, modalStates, setError, airtableOperations, createKeywordFilter, extractTitlesFromFiltered]);

  // Delete record functionality with optimistic updates
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    if (!YOUTUBE_ANALYTICS_BASE_ID || !airtableOperations.selectedTableId) {
      setError('Missing configuration for delete operation');
      return;
    }
    
    // 1. 立即關閉視窗 (樂觀更新)
    modalStates.closeDeleteConfirm();
    
    // 2. 標記為正在刪除狀態
    setDeletingRecords(prev => new Set([...prev, recordId]));
    
    // 3. 儲存被刪除的記錄以便錯誤時恢復
    const deletedRecord = airtableOperations.records.find(r => r.id === recordId);
    
    // 4. 立即從 UI 移除記錄
    airtableOperations.setRecords(prev => prev.filter(record => record.id !== recordId));
    
    // 5. 在背景執行實際刪除
    try {
      const success = await airtableOperations.deleteRecord(
        YOUTUBE_ANALYTICS_BASE_ID, 
        airtableOperations.selectedTableId, 
        recordId,
        'youtube-analytics'
      );
      
      if (!success) {
        throw new Error('Delete operation failed');
      }
      
      // 顯示成功通知
      successToast.recordDeleted();
    } catch (error) {
      // 6. 如果失敗，恢復記錄並顯示錯誤
      if (deletedRecord) {
        airtableOperations.setRecords(prev => [...prev, deletedRecord]);
      }
      
      // 顯示錯誤通知
      errorToast.deleteRecordError();
      setError('Failed to delete record');
      console.error('Delete record failed:', error);
    } finally {
      // 7. 移除刪除狀態標記
      setDeletingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  }, [YOUTUBE_ANALYTICS_BASE_ID, airtableOperations, modalStates, successToast, errorToast]);

  // Generate summary functionality
  const handleGenerateSummary = useCallback(async (recordId: string, transcript: string) => {
    if (!N8N_SUMMARY_WEBHOOK_URL) {
      setError('Summary webhook URL is not configured');
      return;
    }
    
    if (!transcript || transcript.trim().length === 0) {
      setError('Transcript is required for summary generation');
      return;
    }
    
    airtableOperations.setLoading(true);
    setError(null);
    
    // Show processing toast
    infoToast.processing();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout
    
    try {
      const response = await fetch(N8N_SUMMARY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000'
        },
        body: JSON.stringify({
          recordId,
          transcript: transcript.trim()
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }
      
      // Check if response has content
      const responseText = await response.text();
      console.log('Summary generation raw response:', responseText);
      
      let result;
      if (responseText.trim() === '') {
        throw new Error('Empty response from webhook - this may indicate a server error');
      } else {
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          console.warn('Failed to parse JSON response, treating as plain text:', responseText);
          result = { message: responseText, Status: "Error" };
        }
      }
      
      console.log('Summary generation parsed result:', result);
      
      // Check if webhook reported success
      if (result.Status !== "Success") {
        throw new Error(`Webhook failed: ${result.message || 'Unknown error'}`);
      }
      
      // Show success toast
      successToast.summaryTranscriptSuccess();
      
      // Refresh data after summary generation
      if (YOUTUBE_ANALYTICS_BASE_ID && airtableOperations.selectedTableId) {
        await airtableOperations.fetchRecords(YOUTUBE_ANALYTICS_BASE_ID, airtableOperations.selectedTableId);
      }
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Summary generation error:', error);
      
      let errorMessage = '';
      if (error.name === 'AbortError') {
        errorMessage = '請求超時，請稍後再試。';
      } else if (error.message === 'Failed to fetch') {
        errorMessage = '網路連線錯誤，請檢查網路連線。';
      } else {
        errorMessage = `生成摘要失敗: ${error.message}`;
      }
      
      setError(errorMessage);
      errorToast.summaryTranscriptError(errorMessage);
    } finally {
      airtableOperations.setLoading(false);
    }
  }, [N8N_SUMMARY_WEBHOOK_URL, YOUTUBE_ANALYTICS_BASE_ID, airtableOperations, setError, successToast, errorToast, infoToast]);

  // Keyword selection functionality
  const handleKeywordSelection = useCallback((selectedKeywords: string[]) => {
    const updatedFilter = createKeywordFilter(
      airtableOperations.records,
      airtableOperations.fields,
      selectedKeywords
    );
    modalStates.setKeywordFilter(updatedFilter);
    
    console.log('🏷️ [Keyword Selection] 更新過濾器:', {
      selectedKeywords,
      filteredTitlesCount: updatedFilter.filteredTitles.length,
      availableKeywordsCount: updatedFilter.availableKeywords.length
    });
  }, [airtableOperations.records, airtableOperations.fields, modalStates]);

  return {
    // Environment variables
    YOUTUBE_ANALYTICS_BASE_ID,
    YOUTUBE_ANALYTICS_TABLE_ID,
    N8N_WEBHOOK_URL,
    N8N_CREATE_TITLE_WEBHOOK_URL,
    N8N_SUMMARY_WEBHOOK_URL,
    
    // Local states
    query,
    setQuery,
    error,
    setError,
    searchHistory,
    deletingRecords,
    
    // Airtable operations
    ...airtableOperations,
    
    // Modal states
    ...modalStates,
    
    // Actions
    handleSearch,
    handleCreateTitle,
    handleDeleteRecord,
    handleGenerateSummary,
    handleKeywordSelection,
  };
};