'use client';

import { useState, useCallback } from 'react';
import { 
  YouTubeChannel, 
  YouTubeVideo, 
  OptimizationSuggestion, 
  ChannelOptimizationForm,
  VideoScrapingOptions,
  TitleSuggestionRequest,
  ChannelPerformanceStats,
} from '@/types/channel-optimization';

export const useChannelOptimization = () => {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelPerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false });
  const [error, setError] = useState<string | null>(null);

  // 獲取所有頻道
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/channels');
      
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      
      const data = await response.json();
      setChannels(data.channels || []);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  }, []);

  // 添加新頻道
  const addChannel = useCallback(async (channelData: ChannelOptimizationForm) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(channelData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add channel');
      }
      
      const data = await response.json();
      setChannels(prev => [...prev, data.channel]);
      
      return data.channel;
    } catch (err) {
      console.error('Error adding channel:', err);
      setError(err instanceof Error ? err.message : 'Failed to add channel');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 獲取頻道影片 (初始加載)
  const fetchChannelVideos = useCallback(async (channelId: string, options?: { page?: number; limit?: number }) => {
    setLoading(true);
    setError(null);
    
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 50;
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      const url = `/api/channels/${channelId}/videos?${queryParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const data = await response.json();
      
      // 重置影片列表（初始加載）
      setVideos(data.videos || []);
      
      // 更新頻道統計（如果有雙重評分數據）
      if (data.channelStats) {
        setChannelStats(data.channelStats);
      }
      
      // 更新分頁資訊
      if (data.pagination) {
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          hasMore: data.pagination.page < data.pagination.totalPages
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加載更多影片 (分頁加載)
  const loadMoreVideos = useCallback(async (channelId: string) => {
    if (!pagination.hasMore || loadingMore) {
      return;
    }
    
    setLoadingMore(true);
    setError(null);
    
    try {
      const nextPage = pagination.page + 1;
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', nextPage.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      const url = `/api/channels/${channelId}/videos?${queryParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to load more videos');
      }
      
      const data = await response.json();
      
      // 追加新影片到現有列表
      setVideos(prev => [...prev, ...(data.videos || [])]);
      
      // 更新分頁資訊
      if (data.pagination) {
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
          hasMore: data.pagination.page < data.pagination.totalPages
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error loading more videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more videos');
    } finally {
      setLoadingMore(false);
    }
  }, [pagination, loadingMore]);

  // 爬取頻道影片
  const scrapeChannelVideos = useCallback(async (channelId: string, options: VideoScrapingOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/channels/${channelId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        throw new Error('Failed to scrape videos');
      }
      
      const data = await response.json();
      
      // 重新獲取影片列表，確保包含計算後的 performance 資料
      console.log('🔄 Re-fetching videos after scraping to get updated performance data');
      await fetchChannelVideos(channelId);
      
      return data;
    } catch (err) {
      console.error('Error scraping videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to scrape videos');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchChannelVideos]);

  // 生成優化建議
  const generateOptimizationSuggestions = useCallback(async (
    videoId: string, 
    options?: {
      targetKeywords?: string[];
      specialInstructions?: string;
    }
  ) => {
    if (!selectedChannel) {
      throw new Error('No channel selected');
    }

    setLoading(true);
    setError(null);
    
    try {
      const video = videos.find(v => v.id === videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // 準備參考上下文
      const referenceContext = await prepareReferenceContext(selectedChannel.id);
      
      const requestData: TitleSuggestionRequest = {
        videoId,
        currentTitle: video.title,
        description: video.description,
        transcript: video.transcript,
        targetKeywords: options?.targetKeywords,
        referenceContext,
        specialInstructions: options?.specialInstructions,
      };

      console.log('🎯 Generating suggestions with reference context:', {
        videoId,
        currentTitle: video.title,
        externalTitlesCount: referenceContext.externalTitles.length,
        ownTopTitlesCount: referenceContext.ownTopTitles.length,
      });

      const response = await fetch('/api/optimization/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }
      
      const data = await response.json();
      setSuggestions(prev => [...prev, ...data.suggestions]);
      
      return data;
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedChannel, videos]);

  // 準備參考上下文 (結合外部和內部數據)
  const prepareReferenceContext = useCallback(async (channelId: string) => {
    try {
      // 獲取外部成功標題 (來自 YouTube Analytics database)
      const externalTitles = await fetchExternalSuccessfulTitles();
      
      // 獲取用戶自己頻道的高表現標題
      const ownTopTitles = await fetchOwnTopPerformingTitles(channelId);

      return {
        externalTitles,
        ownTopTitles,
      };
    } catch (err) {
      console.error('Error preparing reference context:', err);
      // 返回空的上下文以避免阻塞
      return {
        externalTitles: [],
        ownTopTitles: [],
      };
    }
  }, []);

  // 從 YouTube Analytics database 獲取成功標題
  const fetchExternalSuccessfulTitles = useCallback(async (): Promise<string[]> => {
    try {
      // 使用現有的 YouTube Analytics 系統
      const YOUTUBE_ANALYTICS_BASE_ID = process.env.NEXT_PUBLIC_YOUTUBE_ANALYTICS_BASE_ID || '';
      const YOUTUBE_ANALYTICS_TABLE_ID = process.env.NEXT_PUBLIC_YOUTUBE_ANALYTICS_TABLE_ID || '';
      
      if (!YOUTUBE_ANALYTICS_BASE_ID || !YOUTUBE_ANALYTICS_TABLE_ID) {
        console.warn('YouTube Analytics configuration not found, skipping external titles');
        return [];
      }

      const response = await fetch(
        `/api/airtable/bases/${YOUTUBE_ANALYTICS_BASE_ID}/tables/${YOUTUBE_ANALYTICS_TABLE_ID}/records?pageSize=100`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch external titles');
      }
      
      const data = await response.json();
      
      // 提取標題 (假設標題欄位名稱為 'Title' 或 'title')
      const titles = data.records
        ?.map((record: any) => record.fields?.Title || record.fields?.title)
        ?.filter((title: string) => title && title.length > 0) || [];

      console.log('📊 Fetched external successful titles:', titles.length);
      return titles.slice(0, 50); // 限制為 50 個標題
    } catch (err) {
      console.error('Error fetching external titles:', err);
      return [];
    }
  }, []);

  // 獲取用戶自己頻道的高表現標題
  const fetchOwnTopPerformingTitles = useCallback(async (channelId: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/channels/${channelId}/videos?isHighPerforming=true&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch own top performing videos');
      }
      
      const data = await response.json();
      const titles = data.videos?.map((video: YouTubeVideo) => video.title).filter(Boolean) || [];

      console.log('🏆 Fetched own top performing titles:', titles.length);
      return titles;
    } catch (err) {
      console.error('Error fetching own top titles:', err);
      return [];
    }
  }, []);

  // 獲取建議
  const fetchSuggestions = useCallback(async (videoId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (videoId) queryParams.append('videoId', videoId);
      
      const url = `/api/optimization/suggestions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      
      return data;
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  // 雙重評分系統的排序和篩選功能
  const filterVideosByTier = useCallback((
    videos: YouTubeVideo[], 
    tier: 'absolute' | 'relative', 
    tierValue: string
  ) => {
    if (tier === 'absolute') {
      return videos.filter(video => video.absoluteTier === tierValue);
    } else {
      return videos.filter(video => video.relativeTier === tierValue);
    }
  }, []);

  const sortVideosByScore = useCallback((
    videos: YouTubeVideo[], 
    scoreType: 'absolute' | 'relative' | 'legacy'
  ) => {
    return [...videos].sort((a, b) => {
      if (scoreType === 'absolute' && a.absoluteScore !== undefined && b.absoluteScore !== undefined) {
        return b.absoluteScore - a.absoluteScore;
      }
      if (scoreType === 'relative' && a.relativeScore !== undefined && b.relativeScore !== undefined) {
        return b.relativeScore - a.relativeScore;
      }
      if (scoreType === 'legacy' && a.performanceScore !== undefined && b.performanceScore !== undefined) {
        return b.performanceScore - a.performanceScore;
      }
      // Fallback to view count
      return (b.viewCount || 0) - (a.viewCount || 0);
    });
  }, []);

  const getVideosByPerformance = useCallback((
    performance: 'channel-stars' | 'youtube-top' | 'high-performing' | 'all'
  ) => {
    switch (performance) {
      case 'channel-stars':
        return videos.filter(video => video.relativeTier === 'channel-star');
      case 'youtube-top':
        return videos.filter(video => video.absoluteTier === 'youtube-top' || video.absoluteTier === 'youtube-high');
      case 'high-performing':
        return videos.filter(video => video.isHighPerforming);
      default:
        return videos;
    }
  }, [videos]);

  return {
    // State
    channels,
    selectedChannel,
    videos,
    suggestions,
    channelStats,
    loading,
    loadingMore,
    pagination,
    error,
    
    // Actions
    setSelectedChannel,
    fetchChannels,
    addChannel,
    fetchChannelVideos,
    loadMoreVideos,
    scrapeChannelVideos,
    generateOptimizationSuggestions,
    fetchSuggestions,
    
    // Dual scoring utilities
    filterVideosByTier,
    sortVideosByScore,
    getVideosByPerformance,
    
    // Utilities
    setError,
  };
};