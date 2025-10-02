# YouTube API 整合完成 - 測試指南

## ✅ 已完成的整合

我已經成功將你的 Channel Optimization 系統連接到真實的 YouTube Data API 和 Supabase 資料庫。

## 🔑 前置要求

確保你的 `.env.local` 中有：
```bash
# YouTube Data API
YOUTUBE_API_KEY=your_youtube_data_api_key

# Supabase (已存在)
NEXT_PUBLIC_SUPABASE_URL=https://xgiviyrrnpbcgembqyuf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🚀 如何測試

### 1. 確認資料庫表格已建立
在 Supabase 中確認這些表格存在：
- `youtube_channels`
- `youtube_videos`  
- `optimization_suggestions`
- `thumbnail_styles`
- `optimization_sessions`
- `reference_data`

### 2. 測試頻道匯入
1. 前往 `/channel-optimization`
2. 點擊 "Add Channel" 
3. 輸入 YouTube 頻道 URL，例如：
   - `https://www.youtube.com/@channelname`
   - `https://www.youtube.com/channel/UC...`
   - `https://www.youtube.com/c/channelname`
4. 選擇是否為你自己的頻道
5. 點擊 "Add Channel"

**預期結果**：
- 系統會調用 YouTube API 獲取頻道資訊
- 頻道會儲存到 Supabase `youtube_channels` 表格
- 你會看到頻道卡片顯示真實的統計數據

### 3. 測試影片同步
1. 選擇已匯入的頻道
2. 點擊 "Sync Videos"
3. 配置同步選項：
   - 最大影片數量 (25/50/100/200/500)
   - 是否包含 Shorts
   - 選擇 "YouTube API" (不要選 Apify，因為還沒實作)
4. 點擊 "Start Sync"

**預期結果**：
- 系統會調用 YouTube API 獲取頻道的所有影片
- 影片會儲存到 Supabase `youtube_videos` 表格
- 你會看到影片列表顯示真實的統計數據
- 高表現影片會自動標記 (performance_score >= 70)

## 📊 支援的功能

### YouTube API 整合功能：
- ✅ **頻道資訊獲取**: 名稱、描述、訂閱者數、影片數、頭像
- ✅ **影片資訊獲取**: 標題、描述、縮圖、統計數據
- ✅ **多種 URL 格式支援**: @handle, /channel/, /c/, /user/
- ✅ **影片過濾**: 自動過濾 Shorts (如果設定)
- ✅ **表現分析**: 自動計算 performance_score
- ✅ **高表現影片標記**: 自動標記優秀影片

### 資料庫功能：
- ✅ **用戶權限控制**: RLS 確保數據安全
- ✅ **自動觸發器**: 自動計算表現分數
- ✅ **同步狀態追蹤**: 追蹤爬取進度和錯誤
- ✅ **關聯資料**: 完整的外鍵關係

## 🔍 除錯資訊

### 檢查 API 日誌
在瀏覽器開發者工具的 Console 中，你會看到：
```
🚀 Starting video scraping for channel: [Channel Name]
📺 Using YouTube Data API for scraping
✅ Record updated successfully: [Video ID]
```

### 檢查資料庫
在 Supabase Dashboard 中：
1. 前往 Table Editor
2. 查看 `youtube_channels` - 確認頻道已儲存
3. 查看 `youtube_videos` - 確認影片已儲存

### 常見錯誤
1. **"YouTube API key not configured"**: 檢查 `YOUTUBE_API_KEY` 環境變數
2. **"Channel not found"**: 確認 YouTube URL 格式正確
3. **"Unauthorized"**: 確認你已登入

## 🎯 API 配額注意事項

YouTube Data API v3 的免費配額：
- **每日配額**: 10,000 units
- **頻道資訊查詢**: ~5 units  
- **影片列表查詢**: ~5 units
- **影片詳細資料**: ~5 units per 50 videos

**估算**：
- 匯入 1 個頻道: ~5 units
- 同步 50 個影片: ~15 units
- 總計每個頻道約 20 units

**建議**：
- 一天可以處理約 500 個頻道或同步 25,000 個影片
- 建議先用少量影片測試 (25-50 個)

## 🔄 下一步

測試完成後，你可以：
1. **優化建議**: 測試 AI 建議生成功能
2. **Apify 整合**: 如果需要更多數據，可以實作 Apify
3. **批次處理**: 添加背景任務處理大量數據
4. **快取機制**: 減少 API 調用次數

## 🆘 需要幫助？

如果遇到問題：
1. 檢查瀏覽器 Console 的錯誤訊息
2. 檢查 Supabase Logs
3. 確認 YouTube API key 有效且有配額
4. 確認頻道 URL 格式正確

現在你可以開始測試真實的 YouTube 數據抓取功能了！ 🎉