-- ============================================
-- 完整動態評分系統 - 新增/刪除時自動重算所有統計
-- ============================================
-- 確保新增或刪除影片時，所有相關統計都會重新計算

-- 清理舊的觸發器和函數
DROP TRIGGER IF EXISTS calculate_youtube_video_performance ON youtube_videos;
DROP TRIGGER IF EXISTS recalculate_channel_scores ON youtube_videos;
DROP TRIGGER IF EXISTS recalculate_channel_after_delete ON youtube_videos;
DROP TRIGGER IF EXISTS recalculate_channel_after_update ON youtube_videos;
DROP FUNCTION IF EXISTS calculate_video_performance_score();
DROP FUNCTION IF EXISTS recalculate_channel_after_insert();
DROP FUNCTION IF EXISTS recalculate_channel_after_delete();
DROP FUNCTION IF EXISTS recalculate_channel_after_update();
DROP FUNCTION IF EXISTS recalculate_channel_videos(UUID);
DROP FUNCTION IF EXISTS calculate_single_video_score(BIGINT,INTEGER,INTEGER,DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL,INTEGER);
DROP FUNCTION IF EXISTS build_video_metrics(BIGINT,INTEGER,INTEGER,DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL,DECIMAL,INTEGER);

-- ============================================
-- 1. 核心重算函數 - 計算並更新整個頻道
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_channel_complete(target_channel_id UUID)
RETURNS TABLE (
  updated_videos INTEGER,
  channel_stats JSONB,
  top_score INTEGER,
  high_performing_count INTEGER
) AS $$
DECLARE
  video_record RECORD;
  
  -- 頻道統計變數
  ch_avg_views DECIMAL;
  ch_median_views DECIMAL;
  ch_p25_views DECIMAL;
  ch_p75_views DECIMAL;
  ch_p90_views DECIMAL;
  ch_max_views BIGINT;
  ch_min_views BIGINT;
  
  ch_avg_engagement DECIMAL;
  ch_median_engagement DECIMAL;
  ch_p25_engagement DECIMAL;  
  ch_p75_engagement DECIMAL;
  ch_p90_engagement DECIMAL;
  ch_max_engagement DECIMAL;
  
  ch_video_count INTEGER;
  updated_count INTEGER := 0;
  high_performing_videos INTEGER := 0;
  max_score INTEGER := 0;
  
  -- 單一影片變數
  v_engagement DECIMAL;
  v_absolute_score INTEGER;
  v_relative_score INTEGER;
  v_relative_score_normalized INTEGER;  -- 正規化後的相對分數 (0-100)
  v_bonus_score INTEGER;
  v_final_score INTEGER;
  
BEGIN
  -- ============================================
  -- Step 1: 計算頻道完整統計數據
  -- ============================================
  SELECT 
    -- 觀看數統計
    AVG(view_count)::DECIMAL,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY view_count)::DECIMAL,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY view_count)::DECIMAL,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY view_count)::DECIMAL,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY view_count)::DECIMAL,
    MAX(view_count),
    MIN(view_count),
    
    -- 參與度統計
    AVG(CASE WHEN view_count > 0 THEN (like_count::DECIMAL + comment_count::DECIMAL) / view_count ELSE 0 END)::DECIMAL,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 
      CASE WHEN view_count > 0 THEN (like_count::DECIMAL + comment_count::DECIMAL) / view_count ELSE 0 END
    )::DECIMAL,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY 
      CASE WHEN view_count > 0 THEN (like_count::DECIMAL + comment_count::DECIMAL) / view_count ELSE 0 END
    )::DECIMAL,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY 
      CASE WHEN view_count > 0 THEN (like_count::DECIMAL + comment_count::DECIMAL) / view_count ELSE 0 END
    )::DECIMAL,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY 
      CASE WHEN view_count > 0 THEN (like_count::DECIMAL + comment_count::DECIMAL) / view_count ELSE 0 END
    )::DECIMAL,
    MAX(CASE WHEN view_count > 0 THEN (like_count::DECIMAL + comment_count::DECIMAL) / view_count ELSE 0 END)::DECIMAL,
    
    COUNT(*)::INTEGER
  INTO 
    ch_avg_views, ch_median_views, ch_p25_views, ch_p75_views, ch_p90_views, ch_max_views, ch_min_views,
    ch_avg_engagement, ch_median_engagement, ch_p25_engagement, ch_p75_engagement, ch_p90_engagement, ch_max_engagement,
    ch_video_count
  FROM youtube_videos 
  WHERE channel_id = target_channel_id 
    AND view_count IS NOT NULL;

  -- ============================================
  -- Step 2: 為每個影片重新計算分數
  -- ============================================
  FOR video_record IN 
    SELECT id, view_count, like_count, comment_count
    FROM youtube_videos 
    WHERE channel_id = target_channel_id 
      AND view_count IS NOT NULL
    ORDER BY view_count DESC  -- 先處理高觀看數影片
  LOOP
    -- 計算參與度
    IF video_record.view_count > 0 THEN
      v_engagement := (video_record.like_count::DECIMAL + video_record.comment_count::DECIMAL) / video_record.view_count::DECIMAL;
    ELSE
      v_engagement := 0;
    END IF;
    
    -- ============================================
    -- 絕對分數計算 (0-50分) - 調整為符合實際創作者生態
    -- ============================================
    v_absolute_score := CASE 
      WHEN video_record.view_count >= 100000 THEN 50    -- 10萬級=頂尖
      WHEN video_record.view_count >= 50000 THEN 47     -- 5萬級=優秀
      WHEN video_record.view_count >= 25000 THEN 44     -- 2.5萬級=良好  
      WHEN video_record.view_count >= 15000 THEN 41     -- 1.5萬級=不錯
      WHEN video_record.view_count >= 10000 THEN 38     -- 1萬級=平均以上
      WHEN video_record.view_count >= 7000 THEN 35      -- 7千級=平均
      WHEN video_record.view_count >= 5000 THEN 32      -- 5千級=平均
      WHEN video_record.view_count >= 3000 THEN 28      -- 3千級=可接受
      WHEN video_record.view_count >= 2000 THEN 24      -- 2千級=需努力
      WHEN video_record.view_count >= 1000 THEN 20      -- 1千級=起步
      WHEN video_record.view_count >= 500 THEN 15       -- 500級=新手
      ELSE 10                                           -- <500=練習
    END;
    
    -- 參與度加分 (0-20分) - 調整為更合理的標準
    v_absolute_score := v_absolute_score + CASE
      WHEN v_engagement >= 0.05 THEN 20   -- 5%+ 病毒級
      WHEN v_engagement >= 0.03 THEN 18   -- 3%+ 優秀
      WHEN v_engagement >= 0.02 THEN 15   -- 2%+ 良好
      WHEN v_engagement >= 0.015 THEN 12  -- 1.5%+ 不錯
      WHEN v_engagement >= 0.01 THEN 8    -- 1%+ 平均
      WHEN v_engagement >= 0.008 THEN 6   -- 0.8%+ 略低
      WHEN v_engagement >= 0.005 THEN 4   -- 0.5%+ 偏低
      ELSE 2
    END;
    
    -- ============================================
    -- 相對分數計算 (0-25分) - 基於頻道百分位
    -- ============================================
    v_relative_score := 0;
    
    IF ch_video_count >= 3 THEN
      -- 觀看數相對表現 (0-15分)
      IF video_record.view_count >= ch_p90_views THEN
        v_relative_score := v_relative_score + 15;  -- 前10% 
      ELSIF video_record.view_count >= ch_p75_views THEN
        v_relative_score := v_relative_score + 12;  -- 前25%
      ELSIF video_record.view_count >= ch_median_views THEN
        v_relative_score := v_relative_score + 9;   -- 前50%
      ELSIF video_record.view_count >= ch_p25_views THEN
        v_relative_score := v_relative_score + 6;   -- 前75%
      ELSE
        v_relative_score := v_relative_score + 3;   -- 後25%
      END IF;
      
      -- 參與度相對表現 (0-10分)
      IF ch_avg_engagement > 0 THEN
        IF v_engagement >= ch_p90_engagement THEN
          v_relative_score := v_relative_score + 10;  -- 前10%
        ELSIF v_engagement >= ch_p75_engagement THEN
          v_relative_score := v_relative_score + 8;   -- 前25%
        ELSIF v_engagement >= ch_median_engagement THEN
          v_relative_score := v_relative_score + 6;   -- 前50%
        ELSIF v_engagement >= ch_p25_engagement THEN
          v_relative_score := v_relative_score + 4;   -- 前75%
        ELSE
          v_relative_score := v_relative_score + 2;   -- 後25%
        END IF;
      END IF;
    ELSE
      -- 影片數不足，給予基礎相對分數
      v_relative_score := 8;
    END IF;
    
    -- ============================================
    -- 頂尖表現加成 (0-15分)
    -- ============================================
    v_bonus_score := 0;
    
    IF ch_video_count >= 5 THEN
      -- 頻道之星：同時在觀看和互動都是頂尖
      IF video_record.view_count >= ch_p90_views AND v_engagement >= ch_p75_engagement THEN
        v_bonus_score := v_bonus_score + 15;  -- 雙料冠軍
      -- 觀看之王：觀看數頂尖
      ELSIF video_record.view_count >= ch_p90_views THEN
        v_bonus_score := v_bonus_score + 10;  -- 觀看冠軍
      -- 互動之王：參與度頂尖
      ELSIF v_engagement >= ch_p90_engagement AND video_record.view_count >= ch_p75_views THEN
        v_bonus_score := v_bonus_score + 8;   -- 互動冠軍
      -- 平衡表現：各方面都不錯
      ELSIF video_record.view_count >= ch_p75_views AND v_engagement >= ch_p75_engagement THEN
        v_bonus_score := v_bonus_score + 6;   -- 均衡優秀
      END IF;
      
      -- 絕對表現加成：在全域也很優秀
      IF v_absolute_score >= 50 THEN
        v_bonus_score := v_bonus_score + 10;  -- 全域頂尖
      ELSIF v_absolute_score >= 40 THEN
        v_bonus_score := v_bonus_score + 5;   -- 全域優秀
      END IF;
    END IF;
    
    -- ============================================
    -- 最終分數計算
    -- ============================================
    -- 將相對分數正規化為100分制 (原本是25分制)
    v_relative_score_normalized := ROUND((v_relative_score::DECIMAL / 25) * 100);
    
    v_final_score := LEAST(100, GREATEST(15, v_absolute_score + v_relative_score + v_bonus_score));
    
    -- 更新影片記錄
    UPDATE youtube_videos 
    SET 
      performance_score = v_final_score,
      engagement_rate = v_engagement,
      is_high_performing = v_final_score >= 70,
      performance_metrics = jsonb_build_object(
        'absolute_score', v_absolute_score,
        'relative_score', v_relative_score_normalized,  -- 使用正規化後的分數
        'relative_score_raw', v_relative_score,  -- 保留原始分數供參考
        'bonus_score', v_bonus_score,
        'final_score', v_final_score,
        'engagement_rate_percent', ROUND(v_engagement * 100, 2),
        'channel_stats', jsonb_build_object(
          'avg_views', ROUND(ch_avg_views),
          'median_views', ROUND(ch_median_views),
          'p75_views', ROUND(ch_p75_views),
          'p90_views', ROUND(ch_p90_views),
          'avg_engagement_percent', ROUND(ch_avg_engagement * 100, 2),
          'p75_engagement_percent', ROUND(ch_p75_engagement * 100, 2),
          'p90_engagement_percent', ROUND(ch_p90_engagement * 100, 2),
          'total_videos', ch_video_count
        ),
        'percentiles', jsonb_build_object(
          'view_percentile', 
            CASE 
              WHEN video_record.view_count >= ch_p90_views THEN 90
              WHEN video_record.view_count >= ch_p75_views THEN 75
              WHEN video_record.view_count >= ch_median_views THEN 50
              WHEN video_record.view_count >= ch_p25_views THEN 25
              ELSE 10
            END,
          'engagement_percentile',
            CASE 
              WHEN v_engagement >= ch_p90_engagement THEN 90
              WHEN v_engagement >= ch_p75_engagement THEN 75
              WHEN v_engagement >= ch_median_engagement THEN 50
              WHEN v_engagement >= ch_p25_engagement THEN 25
              ELSE 10
            END,
          'view_vs_median_ratio', 
            CASE WHEN ch_median_views > 0 THEN ROUND(video_record.view_count::DECIMAL / ch_median_views, 2) ELSE 0 END,
          'engagement_vs_avg_ratio',
            CASE WHEN ch_avg_engagement > 0 THEN ROUND(v_engagement / ch_avg_engagement, 2) ELSE 1 END
        )
      ),
      updated_at = NOW()
    WHERE id = video_record.id;
    
    -- 統計計數
    updated_count := updated_count + 1;
    IF v_final_score >= 70 THEN
      high_performing_videos := high_performing_videos + 1;
    END IF;
    IF v_final_score > max_score THEN
      max_score := v_final_score;
    END IF;
    
  END LOOP;
  
  -- 返回更新結果
  RETURN QUERY SELECT 
    updated_count,
    jsonb_build_object(
      'total_videos', ch_video_count,
      'avg_views', ROUND(ch_avg_views),
      'median_views', ROUND(ch_median_views),
      'p75_views', ROUND(ch_p75_views),
      'p90_views', ROUND(ch_p90_views),
      'avg_engagement', ROUND(ch_avg_engagement * 100, 2),
      'p75_engagement', ROUND(ch_p75_engagement * 100, 2),
      'p90_engagement', ROUND(ch_p90_engagement * 100, 2)
    ),
    max_score,
    high_performing_videos;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. 觸發器函數
-- ============================================

-- 插入前觸發器：給新影片臨時分數
CREATE OR REPLACE FUNCTION before_insert_video()
RETURNS TRIGGER AS $$
BEGIN
  NEW.performance_score := 50;  -- 臨時分數
  NEW.engagement_rate := CASE 
    WHEN NEW.view_count > 0 THEN (NEW.like_count::DECIMAL + NEW.comment_count::DECIMAL) / NEW.view_count
    ELSE 0 
  END;
  NEW.is_high_performing := FALSE;
  NEW.performance_metrics := jsonb_build_object('status', 'pending_recalculation');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 插入後觸發器：重算整個頻道
CREATE OR REPLACE FUNCTION after_insert_video()
RETURNS TRIGGER AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- 重新計算整個頻道
  SELECT * FROM recalculate_channel_complete(NEW.channel_id) 
  INTO result_record;
  
  -- 記錄日誌（可選）
  INSERT INTO youtube_videos_log (channel_id, action, video_count, created_at)
  VALUES (NEW.channel_id, 'INSERT_RECALCULATED', result_record.updated_videos, NOW())
  ON CONFLICT DO NOTHING;  -- 如果沒有日誌表就忽略
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 刪除後觸發器：重算整個頻道
CREATE OR REPLACE FUNCTION after_delete_video()
RETURNS TRIGGER AS $$
DECLARE
  remaining_videos INTEGER;
  result_record RECORD;
BEGIN
  -- 檢查是否還有影片
  SELECT COUNT(*) INTO remaining_videos
  FROM youtube_videos 
  WHERE channel_id = OLD.channel_id AND view_count IS NOT NULL;
  
  -- 如果還有影片，重新計算
  IF remaining_videos > 0 THEN
    SELECT * FROM recalculate_channel_complete(OLD.channel_id) 
    INTO result_record;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 更新後觸發器：只在關鍵數據變化時重算
CREATE OR REPLACE FUNCTION after_update_video()
RETURNS TRIGGER AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- 只有當關鍵數據改變時才重算
  IF (OLD.view_count IS DISTINCT FROM NEW.view_count) OR
     (OLD.like_count IS DISTINCT FROM NEW.like_count) OR
     (OLD.comment_count IS DISTINCT FROM NEW.comment_count) THEN
    
    SELECT * FROM recalculate_channel_complete(NEW.channel_id) 
    INTO result_record;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 創建所有觸發器
-- ============================================

CREATE TRIGGER before_insert_youtube_video
  BEFORE INSERT ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION before_insert_video();

CREATE TRIGGER after_insert_youtube_video
  AFTER INSERT ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION after_insert_video();

CREATE TRIGGER after_delete_youtube_video
  AFTER DELETE ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION after_delete_video();

CREATE TRIGGER after_update_youtube_video
  AFTER UPDATE OF view_count, like_count, comment_count ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION after_update_video();

-- ============================================
-- 4. 創建可選的日誌表（用於記錄重算歷史）
-- ============================================
CREATE TABLE IF NOT EXISTS youtube_videos_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  video_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 立即重新計算所有現有頻道
-- ============================================
DO $$
DECLARE
  channel_record RECORD;
  result_record RECORD;
  total_channels INTEGER := 0;
  total_videos INTEGER := 0;
BEGIN
  FOR channel_record IN 
    SELECT DISTINCT channel_id 
    FROM youtube_videos 
    WHERE view_count IS NOT NULL
  LOOP
    SELECT * FROM recalculate_channel_complete(channel_record.channel_id) 
    INTO result_record;
    
    total_channels := total_channels + 1;
    total_videos := total_videos + result_record.updated_videos;
    
    RAISE NOTICE 'Channel % completed: % videos updated, top score: %, high performing: %', 
      channel_record.channel_id, result_record.updated_videos, 
      result_record.top_score, result_record.high_performing_count;
  END LOOP;
  
  RAISE NOTICE 'Complete! Updated % channels, % total videos', total_channels, total_videos;
END $$;

-- ============================================
-- 6. 檢查系統狀態
-- ============================================
SELECT 
  'Dynamic scoring system ready!' as status,
  COUNT(DISTINCT channel_id) as channels,
  COUNT(*) as total_videos,
  COUNT(CASE WHEN is_high_performing THEN 1 END) as high_performing,
  MAX(performance_score) as max_score,
  ROUND(AVG(performance_score)) as avg_score
FROM youtube_videos 
WHERE view_count IS NOT NULL;