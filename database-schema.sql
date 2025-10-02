-- YouTube Channel Optimization Database Schema
-- 基於 Supabase PostgreSQL

-- ==================================
-- 1. YouTube Channels Table (YouTube 頻道)
-- ==================================
CREATE TABLE youtube_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- 關聯到 Supabase auth users
  
  -- YouTube 頻道基本資訊
  channel_id VARCHAR(50) UNIQUE NOT NULL, -- YouTube 頻道 ID (例如 UC...)
  channel_name VARCHAR(255) NOT NULL,
  channel_url VARCHAR(500) NOT NULL,
  custom_name VARCHAR(255), -- 用戶自定義名稱
  description TEXT,
  
  -- 頻道統計數據
  subscriber_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  
  -- 頻道視覺資料
  avatar_url VARCHAR(500),
  banner_url VARCHAR(500),
  
  -- 頻道分類和狀態
  is_owned BOOLEAN DEFAULT FALSE NOT NULL, -- 是否為用戶自己的頻道
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- 同步狀態
  last_scraped_at TIMESTAMPTZ,
  scraping_status VARCHAR(20) DEFAULT 'pending' CHECK (scraping_status IN ('pending', 'syncing', 'completed', 'error')),
  scraping_error TEXT,
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_youtube_channels_user_id ON youtube_channels(user_id);
CREATE INDEX idx_youtube_channels_channel_id ON youtube_channels(channel_id);
CREATE INDEX idx_youtube_channels_is_owned ON youtube_channels(is_owned);
CREATE INDEX idx_youtube_channels_updated_at ON youtube_channels(updated_at);

-- ==================================
-- 2. YouTube Videos Table (YouTube 影片)
-- ==================================
CREATE TABLE youtube_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE NOT NULL,
  
  -- YouTube 影片基本資訊
  video_id VARCHAR(50) UNIQUE NOT NULL, -- YouTube 影片 ID
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  
  -- 影片詳細資訊
  duration VARCHAR(20), -- 格式: "10:35"
  published_at TIMESTAMPTZ NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  category VARCHAR(50),
  tags TEXT[], -- PostgreSQL array for tags
  
  -- 影片統計數據
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- 表現分析
  performance_score INTEGER DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 100),
  is_high_performing BOOLEAN DEFAULT FALSE,
  engagement_rate DECIMAL(5,4) DEFAULT 0, -- 參與度 (like_count / view_count)
  
  -- 內容分析
  transcript TEXT,
  has_transcript BOOLEAN DEFAULT FALSE,
  video_type VARCHAR(20) DEFAULT 'regular' CHECK (video_type IN ('regular', 'short', 'live')),
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_youtube_videos_channel_id ON youtube_videos(channel_id);
CREATE INDEX idx_youtube_videos_video_id ON youtube_videos(video_id);
CREATE INDEX idx_youtube_videos_is_high_performing ON youtube_videos(is_high_performing);
CREATE INDEX idx_youtube_videos_published_at ON youtube_videos(published_at);
CREATE INDEX idx_youtube_videos_performance_score ON youtube_videos(performance_score);

-- ==================================
-- 3. Optimization Suggestions Table (優化建議)
-- ==================================
CREATE TABLE optimization_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE NOT NULL,
  
  -- 建議類型和內容
  suggestion_type VARCHAR(20) NOT NULL CHECK (suggestion_type IN ('title', 'thumbnail', 'description', 'tags')),
  current_value TEXT NOT NULL, -- 目前的值
  suggested_value TEXT NOT NULL, -- 建議的值
  reasoning TEXT NOT NULL, -- AI 分析原因
  
  -- 參考資料
  reference_video_ids UUID[], -- 參考影片的 IDs
  external_titles_used TEXT[], -- 使用的外部成功標題
  internal_titles_used TEXT[], -- 使用的內部高表現標題
  keywords_used TEXT[], -- 使用的關鍵字
  
  -- 建議品質和狀態
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'archived')),
  
  -- AI 生成相關
  ai_model_used VARCHAR(50), -- 使用的 AI 模型
  generation_method VARCHAR(20) DEFAULT 'webhook' CHECK (generation_method IN ('webhook', 'fallback', 'manual')),
  webhook_response JSONB, -- n8n webhook 的完整回應
  
  -- 應用追蹤
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_optimization_suggestions_user_id ON optimization_suggestions(user_id);
CREATE INDEX idx_optimization_suggestions_video_id ON optimization_suggestions(video_id);
CREATE INDEX idx_optimization_suggestions_type ON optimization_suggestions(suggestion_type);
CREATE INDEX idx_optimization_suggestions_status ON optimization_suggestions(status);
CREATE INDEX idx_optimization_suggestions_confidence ON optimization_suggestions(confidence_score);

-- ==================================
-- 4. Thumbnail Styles Table (縮圖風格分析)
-- ==================================
CREATE TABLE thumbnail_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE NOT NULL,
  
  -- 縮圖基本資訊
  thumbnail_url VARCHAR(500) NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 顏色分析
  dominant_colors TEXT[], -- 主要顏色 (hex codes)
  color_temperature VARCHAR(10) CHECK (color_temperature IN ('warm', 'cool', 'neutral')),
  brightness_level VARCHAR(10) CHECK (brightness_level IN ('dark', 'medium', 'bright')),
  
  -- 佈局分析
  layout_type VARCHAR(20) DEFAULT 'unknown' CHECK (layout_type IN ('face-focused', 'text-heavy', 'scene-based', 'split-screen', 'product-focused', 'unknown')),
  face_count INTEGER DEFAULT 0,
  has_text_overlay BOOLEAN DEFAULT FALSE,
  text_size VARCHAR(10) CHECK (text_size IN ('small', 'medium', 'large')),
  
  -- 視覺元素
  has_arrows BOOLEAN DEFAULT FALSE,
  has_circles BOOLEAN DEFAULT FALSE,
  has_highlights BOOLEAN DEFAULT FALSE,
  has_emojis BOOLEAN DEFAULT FALSE,
  has_numbers BOOLEAN DEFAULT FALSE,
  contrast_level VARCHAR(10) CHECK (contrast_level IN ('low', 'medium', 'high')),
  
  -- 表現指標
  click_through_rate DECIMAL(5,4),
  impressions BIGINT DEFAULT 0,
  
  -- AI 分析結果
  style_tags TEXT[], -- AI 識別的風格標籤
  similarity_score DECIMAL(5,4), -- 與成功縮圖的相似度
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(video_id) -- 每個影片只有一個縮圖風格分析
);

-- 建立索引
CREATE INDEX idx_thumbnail_styles_video_id ON thumbnail_styles(video_id);
CREATE INDEX idx_thumbnail_styles_layout_type ON thumbnail_styles(layout_type);
CREATE INDEX idx_thumbnail_styles_click_through_rate ON thumbnail_styles(click_through_rate);

-- ==================================
-- 5. Optimization Sessions Table (優化工作階段)
-- ==================================
CREATE TABLE optimization_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE NOT NULL,
  
  -- 工作階段資訊
  session_name VARCHAR(255),
  description TEXT,
  
  -- 優化配置
  target_keywords TEXT[],
  optimization_goals JSONB, -- 優化目標 (JSON 格式)
  
  -- 批次處理
  video_count INTEGER DEFAULT 0,
  suggestions_generated INTEGER DEFAULT 0,
  suggestions_applied INTEGER DEFAULT 0,
  
  -- 狀態追蹤
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- 結果統計
  average_confidence DECIMAL(5,2),
  total_processing_time INTEGER, -- 總處理時間（秒）
  
  -- 時間戳記
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_optimization_sessions_user_id ON optimization_sessions(user_id);
CREATE INDEX idx_optimization_sessions_channel_id ON optimization_sessions(channel_id);
CREATE INDEX idx_optimization_sessions_status ON optimization_sessions(status);

-- ==================================
-- 6. Performance Metrics 欄位 (用於進階評分系統)
-- ==================================
-- 新增 performance_metrics 欄位來存儲詳細的評分數據
ALTER TABLE youtube_videos 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_youtube_videos_performance_metrics 
ON youtube_videos USING GIN (performance_metrics);

-- ==================================
-- 7. Reference Data Table (參考資料)
-- ==================================
CREATE TABLE reference_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 資料來源
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('airtable', 'manual', 'imported')),
  source_id VARCHAR(100), -- 來源 ID (例如 Airtable record ID)
  
  -- 內容資訊
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  performance_metrics JSONB, -- 表現指標 (JSON 格式)
  
  -- 分類和標籤
  category VARCHAR(50),
  tags TEXT[],
  language VARCHAR(10) DEFAULT 'en',
  
  -- 有效性
  is_active BOOLEAN DEFAULT TRUE,
  quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_reference_data_user_id ON reference_data(user_id);
CREATE INDEX idx_reference_data_source_type ON reference_data(source_type);
CREATE INDEX idx_reference_data_category ON reference_data(category);
CREATE INDEX idx_reference_data_is_active ON reference_data(is_active);

-- ==================================
-- Row Level Security (RLS) Policies
-- ==================================

-- Enable RLS on all tables
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnail_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_data ENABLE ROW LEVEL SECURITY;

-- YouTube Channels policies
CREATE POLICY "Users can view their own channels" ON youtube_channels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channels" ON youtube_channels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels" ON youtube_channels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels" ON youtube_channels
  FOR DELETE USING (auth.uid() = user_id);

-- YouTube Videos policies (通過 channel 關聯)
CREATE POLICY "Users can view videos from their channels" ON youtube_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM youtube_channels 
      WHERE youtube_channels.id = youtube_videos.channel_id 
      AND youtube_channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert videos to their channels" ON youtube_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM youtube_channels 
      WHERE youtube_channels.id = youtube_videos.channel_id 
      AND youtube_channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update videos from their channels" ON youtube_videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM youtube_channels 
      WHERE youtube_channels.id = youtube_videos.channel_id 
      AND youtube_channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete videos from their channels" ON youtube_videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM youtube_channels 
      WHERE youtube_channels.id = youtube_videos.channel_id 
      AND youtube_channels.user_id = auth.uid()
    )
  );

-- Optimization Suggestions policies
CREATE POLICY "Users can view their own suggestions" ON optimization_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestions" ON optimization_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions" ON optimization_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions" ON optimization_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- Thumbnail Styles policies (通過 video 關聯)
CREATE POLICY "Users can view thumbnail styles from their videos" ON thumbnail_styles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM youtube_videos 
      JOIN youtube_channels ON youtube_channels.id = youtube_videos.channel_id
      WHERE youtube_videos.id = thumbnail_styles.video_id 
      AND youtube_channels.user_id = auth.uid()
    )
  );

-- Similar policies for other operations on thumbnail_styles...

-- Optimization Sessions policies
CREATE POLICY "Users can view their own sessions" ON optimization_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON optimization_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON optimization_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON optimization_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Reference Data policies
CREATE POLICY "Users can view their own reference data" ON reference_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reference data" ON reference_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reference data" ON reference_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reference data" ON reference_data
  FOR DELETE USING (auth.uid() = user_id);

-- ==================================
-- 觸發器 (Triggers) 和函數
-- ==================================

-- 自動更新 updated_at 欄位的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 為所有表格建立 updated_at 觸發器
CREATE TRIGGER update_youtube_channels_updated_at BEFORE UPDATE ON youtube_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_youtube_videos_updated_at BEFORE UPDATE ON youtube_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optimization_suggestions_updated_at BEFORE UPDATE ON optimization_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_thumbnail_styles_updated_at BEFORE UPDATE ON thumbnail_styles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optimization_sessions_updated_at BEFORE UPDATE ON optimization_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reference_data_updated_at BEFORE UPDATE ON reference_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================
-- 注意：影片評分觸發器和函數
-- ==================================
-- 影片評分系統已移至 complete-dynamic-scoring.sql
-- 該文件提供更完整的動態評分功能，包括：
-- - 百分位計算 (P25, P50, P75, P90)
-- - 相對評分系統
-- - 自動重算機制 (INSERT/UPDATE/DELETE)
-- - 詳細的 performance_metrics JSONB 數據
-- 
-- 請執行 complete-dynamic-scoring.sql 來啟用進階評分系統

-- ==================================
-- 初始化資料和視圖
-- ==================================

-- 建立有用的視圖
CREATE VIEW channel_performance_summary AS
SELECT 
  yc.id,
  yc.channel_name,
  yc.is_owned,
  COUNT(yv.id) as total_videos,
  COUNT(CASE WHEN yv.is_high_performing THEN 1 END) as high_performing_videos,
  AVG(yv.performance_score) as avg_performance_score,
  SUM(yv.view_count) as total_views,
  SUM(yv.like_count) as total_likes,
  MAX(yv.published_at) as latest_video_date
FROM youtube_channels yc
LEFT JOIN youtube_videos yv ON yc.id = yv.channel_id
GROUP BY yc.id, yc.channel_name, yc.is_owned;

-- 優化建議統計視圖
CREATE VIEW optimization_stats AS
SELECT 
  os.user_id,
  COUNT(*) as total_suggestions,
  COUNT(CASE WHEN os.status = 'applied' THEN 1 END) as applied_suggestions,
  COUNT(CASE WHEN os.status = 'pending' THEN 1 END) as pending_suggestions,
  AVG(os.confidence_score) as avg_confidence,
  MAX(os.created_at) as last_suggestion_date
FROM optimization_suggestions os
GROUP BY os.user_id;