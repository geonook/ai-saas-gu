// YouTube Channel Optimization 相關類型定義

export interface YouTubeChannel {
  id: string;
  channelId: string; // YouTube channel ID (e.g., UC...)
  channelName: string;
  channelUrl: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  avatar?: string;
  banner?: string;
  isOwned: boolean; // 是否為用戶自己的頻道
  createdAt: string;
  updatedAt: string;
  lastScrapedAt?: string;
}

export interface PerformanceMetrics {
  absolute_score: number;
  relative_score: number;
  view_score: number;
  engagement_score: number;
  comment_score: number;
  relative_view_ratio: number;
  relative_engagement_ratio: number;
  channel_median_views: number;
  channel_avg_engagement: number;
}

export interface YouTubeVideo {
  id: string;
  videoId: string; // YouTube video ID
  channelId: string; // 關聯到 YouTubeChannel
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string;
  publishedAt: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  tags?: string[];
  category?: string;
  language?: string;
  transcript?: string;
  isHighPerforming?: boolean; // 是否為高表現影片 (舊版，保留向後兼容)
  performanceScore?: number; // 舊版分數 (保留向後兼容)
  // 新的雙重評分系統
  absoluteScore?: number; // 0-100 based on YouTube universal standards
  relativeScore?: number; // 0-100 compared to channel's own performance
  absoluteTier?: 'youtube-top' | 'youtube-high' | 'youtube-medium' | 'youtube-normal' | 'needs-improvement';
  relativeTier?: 'channel-star' | 'above-average' | 'near-average' | 'below-average';
  relativeRatio?: number; // e.g., 2.5 means 2.5x above channel median
  performanceMetrics?: PerformanceMetrics; // Raw JSONB data from database
  createdAt: string;
  updatedAt: string;
}

export interface ScoreTier {
  tier: string;
  label: string;
  color: string;
  range: [number, number];
}

export interface AbsoluteTier extends ScoreTier {
  tier: 'youtube-top' | 'youtube-high' | 'youtube-medium' | 'youtube-normal' | 'needs-improvement';
}

export interface RelativeTier extends ScoreTier {
  tier: 'channel-star' | 'above-average' | 'near-average' | 'below-average';
}

// Dual scoring utilities and constants - 調整為更合理的區間
export const ABSOLUTE_TIER_CONFIG: Record<AbsoluteTier['tier'], AbsoluteTier> = {
  'youtube-top': { tier: 'youtube-top', label: 'YouTube頂尖', color: '#dc2626', range: [85, 100] },
  'youtube-high': { tier: 'youtube-high', label: 'YouTube優秀', color: '#ea580c', range: [70, 84] },
  'youtube-medium': { tier: 'youtube-medium', label: 'YouTube良好', color: '#ca8a04', range: [55, 69] },
  'youtube-normal': { tier: 'youtube-normal', label: 'YouTube中等', color: '#65a30d', range: [40, 54] },
  'needs-improvement': { tier: 'needs-improvement', label: '需要改善', color: '#6b7280', range: [0, 39] },
};

export const RELATIVE_TIER_CONFIG: Record<RelativeTier['tier'], RelativeTier> = {
  'channel-star': { tier: 'channel-star', label: '頻道之星', color: '#7c2d12', range: [70, 100] },
  'above-average': { tier: 'above-average', label: '平均以上', color: '#a16207', range: [50, 69] },
  'near-average': { tier: 'near-average', label: '接近平均', color: '#4d7c0f', range: [30, 49] },
  'below-average': { tier: 'below-average', label: '低於平均', color: '#6b7280', range: [0, 29] },
};

export interface ChannelPerformanceStats {
  avgViews: number;
  medianViews: number;
  avgEngagement: number;
  totalVideos: number;
  highPerformingCount: number;
  channelStarCount: number;
}

export interface OptimizationSuggestion {
  id: string;
  videoId: string; // 目標影片
  type: 'title' | 'thumbnail' | 'description' | 'tags';
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
  referenceVideos: string[]; // 參考影片 IDs
  confidence: number; // 信心度 0-100
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface TitleSuggestionRequest {
  videoId: string;
  currentTitle: string;
  description?: string;
  transcript?: string;
  targetKeywords?: string[];
  referenceContext: {
    externalTitles: string[]; // 來自 YouTube Analytics database 的成功標題
    ownTopTitles: string[]; // 用戶自己頻道的高表現標題
  };
  specialInstructions?: string;
}

export interface ThumbnailStyleReference {
  id: string;
  videoId: string;
  thumbnailUrl: string;
  style: {
    colorScheme: string[];
    layout: 'face-focused' | 'text-heavy' | 'scene-based' | 'split-screen' | 'other';
    textElements: {
      hasTitle: boolean;
      hasNumbers: boolean;
      hasEmojis: boolean;
      fontSize: 'small' | 'medium' | 'large';
    };
    visualElements: {
      hasFaces: boolean;
      hasArrows: boolean;
      hasHighlight: boolean;
      hasContrast: boolean;
    };
  };
  performanceMetrics: {
    clickThroughRate?: number;
    viewCount: number;
    engagement: number;
  };
}

export interface ChannelOptimizationForm {
  channelUrl: string;
  isOwned: boolean;
  customName?: string;
}

export interface VideoScrapingOptions {
  maxVideos?: number;
  dateRange?: {
    from: string;
    to: string;
  };
  includeShorts?: boolean;
  includeTranscripts?: boolean;
  useApify?: boolean; // 是否使用 Apify 而不是 YouTube API
  syncMode?: 'full' | 'incremental'; // 同步模式：完整同步或增量同步
  // New preset-based approach
  preset?: 'daily-update' | 'full-refresh' | 'initial-setup' | 'quick-test' | 'custom';
}

// Preset configurations for better UX
export interface SyncPreset {
  id: 'daily-update' | 'full-refresh' | 'initial-setup' | 'quick-test' | 'custom';
  name: string;
  description: string;
  icon: string;
  syncMode: 'incremental' | 'full';
  maxVideos: number;
  estimatedTime: string;
  useCase: string;
  isRecommended?: boolean;
  warningMessage?: string;
}

export interface ScrapingProgress {
  total: number;
  completed: number;
  current: string;
  status: 'idle' | 'scraping' | 'completed' | 'error';
  error?: string;
}

export interface ChannelOptimizationState {
  channels: YouTubeChannel[];
  selectedChannel?: YouTubeChannel;
  videos: YouTubeVideo[];
  suggestions: OptimizationSuggestion[];
  scrapingProgress: ScrapingProgress;
  loading: boolean;
  error?: string;
}

export interface ApifyScraperConfig {
  apiKey: string;
  actorId: string; // Apify YouTube Scraper actor ID
  options: {
    channelUrls: string[];
    maxVideos: number;
    includeChannelInfo: boolean;
    includeVideoDetails: boolean;
    includeTranscripts: boolean;
  };
}

export interface YouTubeAPIConfig {
  apiKey: string;
  quota: {
    remaining: number;
    resetTime: string;
  };
}

// 與現有 YouTube Analytics 系統的整合
export interface OptimizationContext {
  externalReferences: {
    baseId: string;
    tableId: string;
    successfulTitles: string[];
    topKeywords: string[];
  };
  internalReferences: {
    channelId: string;
    topPerformingVideos: YouTubeVideo[];
    bestTitles: string[];
    successPatterns: string[];
  };
  webhookConfig: {
    n8nTitleWebhookUrl: string;
    enhancedPayload: boolean; // 是否發送增強的 payload
  };
}