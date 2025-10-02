# YouTube Channel Optimization - Database Setup Guide

## 資料庫架構概覽

這個 YouTube Channel Optimization 系統需要建立 6 個主要的資料表，以支援完整的頻道分析和優化功能。

## 📊 資料表結構說明

### 1. `youtube_channels` - YouTube 頻道
**用途**: 儲存用戶匯入的 YouTube 頻道資訊

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `user_id` | UUID | 關聯到 Supabase auth.users |
| `channel_id` | VARCHAR(50) | YouTube 頻道 ID (UC...) |
| `channel_name` | VARCHAR(255) | 頻道名稱 |
| `channel_url` | VARCHAR(500) | 頻道 URL |
| `is_owned` | BOOLEAN | 是否為用戶自己的頻道 |
| `subscriber_count` | BIGINT | 訂閱者數量 |
| `video_count` | INTEGER | 影片數量 |
| `last_scraped_at` | TIMESTAMPTZ | 最後同步時間 |

### 2. `youtube_videos` - YouTube 影片
**用途**: 儲存從頻道同步的影片資料和分析結果

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `channel_id` | UUID | 關聯到 youtube_channels |
| `video_id` | VARCHAR(50) | YouTube 影片 ID |
| `title` | VARCHAR(500) | 影片標題 |
| `description` | TEXT | 影片描述 |
| `view_count` | BIGINT | 觀看次數 |
| `like_count` | INTEGER | 按讚數 |
| `performance_score` | INTEGER | 表現分數 (0-100) |
| `is_high_performing` | BOOLEAN | 是否為高表現影片 |
| `transcript` | TEXT | 影片字幕 |

### 3. `optimization_suggestions` - 優化建議
**用途**: 儲存 AI 生成的優化建議

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `user_id` | UUID | 用戶 ID |
| `video_id` | UUID | 關聯到 youtube_videos |
| `suggestion_type` | VARCHAR(20) | 建議類型 (title/thumbnail/description/tags) |
| `current_value` | TEXT | 目前的值 |
| `suggested_value` | TEXT | 建議的值 |
| `reasoning` | TEXT | AI 分析原因 |
| `confidence_score` | INTEGER | 信心度 (0-100) |
| `status` | VARCHAR(20) | 狀態 (pending/applied/rejected) |
| `external_titles_used` | TEXT[] | 使用的外部成功標題 |
| `internal_titles_used` | TEXT[] | 使用的內部高表現標題 |

### 4. `thumbnail_styles` - 縮圖風格分析
**用途**: 分析縮圖視覺風格和表現

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `video_id` | UUID | 關聯到 youtube_videos |
| `thumbnail_url` | VARCHAR(500) | 縮圖 URL |
| `layout_type` | VARCHAR(20) | 佈局類型 |
| `dominant_colors` | TEXT[] | 主要顏色 |
| `has_text_overlay` | BOOLEAN | 是否有文字覆蓋 |
| `has_faces` | BOOLEAN | 是否有人臉 |
| `click_through_rate` | DECIMAL(5,4) | 點擊率 |

### 5. `optimization_sessions` - 優化工作階段
**用途**: 追蹤批次優化作業

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `user_id` | UUID | 用戶 ID |
| `channel_id` | UUID | 關聯到 youtube_channels |
| `session_name` | VARCHAR(255) | 工作階段名稱 |
| `target_keywords` | TEXT[] | 目標關鍵字 |
| `video_count` | INTEGER | 處理的影片數量 |
| `suggestions_generated` | INTEGER | 生成的建議數量 |
| `status` | VARCHAR(20) | 狀態 (active/completed/paused) |

### 6. `reference_data` - 參考資料
**用途**: 儲存從 Airtable 匯入的參考標題和資料

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `user_id` | UUID | 用戶 ID |
| `source_type` | VARCHAR(20) | 資料來源 (airtable/manual/imported) |
| `title` | TEXT | 參考標題 |
| `keywords` | TEXT[] | 關鍵字 |
| `performance_metrics` | JSONB | 表現指標 |
| `quality_score` | INTEGER | 品質分數 |

## 🚀 安裝步驟

### Step 1: 基礎資料庫架構

1. 登入你的 Supabase 專案
2. 前往 SQL Editor
3. 複製 `database-schema.sql` 中的內容
4. 執行 SQL 指令

### Step 2: 進階動態評分系統 (必須)

為了啟用完整的影片表現分析功能，執行進階評分系統：

1. 在 SQL Editor 中複製 `complete-dynamic-scoring.sql` 中的內容
2. 執行 SQL 指令

**重要**: 這個評分系統提供：
- ✅ **智能評分演算法** - 15-100 分動態範圍
- ✅ **百分位統計** - P25, P50, P75, P90 分析
- ✅ **自動重算機制** - 新增/刪除/更新影片時自動重新計算
- ✅ **相對與絕對評分** - 結合全域表現與頻道內表現
- ✅ **詳細 JSONB 資料** - 完整的分析數據存儲

### Step 3: 驗證資料表建立

執行以下 SQL 來確認資料表已正確建立：

```sql
-- 檢查所有資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'youtube_%' 
OR table_name IN ('optimization_suggestions', 'thumbnail_styles', 'reference_data');

-- 檢查 RLS 政策
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'youtube_%';

-- 驗證評分系統函數
SELECT proname, prosrc IS NOT NULL as has_source 
FROM pg_proc 
WHERE proname IN ('recalculate_channel_complete', 'before_insert_video', 'after_insert_video');

-- 檢查觸發器
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'youtube_videos' 
AND trigger_name LIKE '%youtube_video%';
```

### Step 4: 檢查環境變數

✅ **Supabase 設定已完成** - 你已經有正確的 Supabase 配置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`

🔧 **需要添加的新環境變數** (如果還沒有的話)：

```bash
# YouTube Data API (for Channel Optimization)
YOUTUBE_API_KEY=your_youtube_data_api_key

# Apify 配置 (可選，作為 YouTube API 的備用方案)
APIFY_API_KEY=your_apify_api_key
APIFY_YOUTUBE_SCRAPER_ACTOR_ID=your_apify_actor_id

# 現有的 YouTube Analytics 和 n8n 設定應該已經存在：
# NEXT_PUBLIC_YOUTUBE_ANALYTICS_BASE_ID=...
# NEXT_PUBLIC_YOUTUBE_ANALYTICS_TABLE_ID=...
# NEXT_PUBLIC_N8N_WEBHOOK_URL=...
# NEXT_PUBLIC_N8N_CREATE_TITLE_WEBHOOK_URL=...
# NEXT_PUBLIC_N8N_SUMMARY_WEBHOOK_URL=...
```

## 📈 重要特性

### 1. Row Level Security (RLS)
- 所有資料表都啟用了 RLS
- 用戶只能存取自己的資料
- 透過 `user_id` 進行權限控制

### 2. 自動觸發器
- **自動更新時間戳**: 所有資料表的 `updated_at` 會自動更新
- **智能評分系統**: 使用 `complete-dynamic-scoring.sql` 的進階評分邏輯
  - **絕對分數** (0-70分): 基於觀看數與參與度的全域表現
  - **相對分數** (0-25分): 基於頻道內百分位的相對表現  
  - **加成分數** (0-15分): 頂尖表現的額外獎勵
  - **自動重算**: INSERT/UPDATE/DELETE 影片時整個頻道重新計算

### 3. 索引優化
- 針對常用查詢欄位建立索引
- 提升資料查詢效能

### 4. 資料完整性
- 外鍵約束確保資料一致性
- CHECK 約束確保資料格式正確

## 🔄 資料流程

1. **頻道匯入**: 用戶在前端匯入 YouTube 頻道 → 資料儲存到 `youtube_channels`
2. **影片同步**: 系統爬取頻道影片 → 資料儲存到 `youtube_videos`
3. **智能評分**: 觸發器自動執行 `recalculate_channel_complete()` 函數
   - 計算頻道統計 (平均值、中位數、百分位)
   - 為每個影片計算絕對、相對、加成分數
   - 更新 `performance_score`、`engagement_rate`、`performance_metrics`
4. **優化建議生成**: AI 分析後 → 建議儲存到 `optimization_suggestions`
5. **縮圖分析**: 分析縮圖風格 → 結果儲存到 `thumbnail_styles`

## 🔍 實用查詢範例

### 取得用戶的高表現影片
```sql
SELECT v.title, v.view_count, v.performance_score, c.channel_name
FROM youtube_videos v
JOIN youtube_channels c ON v.channel_id = c.id
WHERE c.user_id = auth.uid()
AND v.is_high_performing = true
ORDER BY v.performance_score DESC;
```

### 取得待處理的優化建議
```sql
SELECT os.suggestion_type, os.suggested_value, os.confidence_score, v.title
FROM optimization_suggestions os
JOIN youtube_videos v ON os.video_id = v.id
WHERE os.user_id = auth.uid()
AND os.status = 'pending'
ORDER BY os.confidence_score DESC;
```

### 頻道表現統計
```sql
SELECT * FROM channel_performance_summary 
WHERE id IN (
  SELECT id FROM youtube_channels WHERE user_id = auth.uid()
);
```

## 💡 進階評分系統詳解

### 評分算法 (15-100分範圍)

#### 1. 絕對分數 (0-70分)
- **觀看數分數** (0-50分): 根據全域觀看數級別評分
  - 1M+ 觀看 = 50分 (百萬級)
  - 500K+ 觀看 = 45分 (50萬級)
  - 100K+ 觀看 = 40分 (10萬級)
  - 以此類推...
- **參與度分數** (0-20分): 基於 (按讚數 + 留言數) / 觀看數
  - 6%+ 參與度 = 20分 (神級)
  - 5%+ 參與度 = 18分 (頂尖)
  - 以此類推...

#### 2. 相對分數 (0-25分)
- **頻道內觀看數排名** (0-15分): 基於頻道內百分位
  - P90 (前10%) = 15分
  - P75 (前25%) = 12分
  - P50 (前50%) = 9分
- **頻道內參與度排名** (0-10分): 基於頻道內參與度百分位

#### 3. 加成分數 (0-15分)
- **雙料冠軍**: 同時在觀看數和參與度都是頻道頂尖 = +15分
- **觀看冠軍**: 觀看數頻道頂尖 = +10分  
- **互動冠軍**: 參與度頻道頂尖 = +8分
- **全域頂尖**: 絕對分數達到全域優秀標準 = +5~10分

### 自動化特性

- **實時重算**: 新增/刪除/更新影片時，整個頻道自動重新計算
- **智能觸發**: 只有當觀看數、按讚數、留言數變化時才重算
- **批次最佳化**: 大量數據插入時使用批次處理
- **詳細記錄**: 所有計算結果儲存在 `performance_metrics` JSONB 欄位中

這個資料庫架構為 YouTube Channel Optimization 系統提供了完整的數據支援，包括用戶權限管理、智能自動化分析、和高效能查詢。