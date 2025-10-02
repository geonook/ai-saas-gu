# 🔐 Supabase 認證系統完整指南

## 📋 目錄
1. [初始設置](#初始設置)
2. [SMTP 郵件設置](#smtp-郵件設置)
3. [測試認證功能](#測試認證功能)
4. [常見問題解決](#常見問題解決)
5. [生產環境部署](#生產環境部署)

---

## 🚀 初始設置

### 1. Supabase 專案設置

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 建立新專案或選擇現有專案
3. 到 **Settings > API** 取得以下資訊：
   - Project URL
   - Anon/Public Key
   - Service Role Key

### 2. 環境變數配置

在 `.env.local` 文件中設置：

```bash
# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://你的專案ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

### 3. 資料庫設置

在 Supabase Dashboard 的 SQL Editor 中執行：

```sql
-- Create profiles_saas table
CREATE TABLE IF NOT EXISTS public.profiles_saas (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT false,
  registration_method TEXT CHECK (registration_method IN ('email', 'google', 'github'))
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles_saas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles_saas
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles_saas
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger to automatically create profile on signup with OAuth provider detection
-- Note: If updating existing system, first drop old trigger and function:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  detected_provider TEXT;
BEGIN
  -- Detect provider from user metadata
  detected_provider := 'email'; -- Default to email
  
  -- Check user_metadata for explicit registration_method (set by app)
  IF NEW.raw_user_meta_data->>'registration_method' IS NOT NULL THEN
    detected_provider := NEW.raw_user_meta_data->>'registration_method';
  -- Check app_metadata for provider (OAuth users)
  ELSIF NEW.raw_app_meta_data->>'provider' IS NOT NULL THEN
    detected_provider := NEW.raw_app_meta_data->>'provider';
  -- Check user_metadata for issuer (Google/GitHub specific)
  ELSIF NEW.raw_user_meta_data->>'iss' IS NOT NULL THEN
    IF NEW.raw_user_meta_data->>'iss' LIKE '%google%' THEN
      detected_provider := 'google';
    ELSIF NEW.raw_user_meta_data->>'iss' LIKE '%github%' THEN
      detected_provider := 'github';
    END IF;
  -- Check user_metadata for provider_id (some OAuth providers set this)
  ELSIF NEW.raw_user_meta_data->>'provider_id' IS NOT NULL THEN
    -- Try to detect from other metadata fields
    IF NEW.raw_user_meta_data->>'email' LIKE '%@gmail.com' 
       OR NEW.raw_user_meta_data->>'aud' = 'https://accounts.google.com' THEN
      detected_provider := 'google';
    END IF;
  END IF;

  -- Insert profile with proper registration_method for analytics
  INSERT INTO public.profiles_saas (
    id, 
    email, 
    full_name, 
    avatar_url,
    email_verified,
    registration_method,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    CASE 
      WHEN detected_provider IN ('google', 'github', 'email') THEN detected_provider::TEXT
      ELSE 'email'  -- Default to email if no provider detected
    END,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. 重定向 URLs 設置

在 Supabase Dashboard → **Authentication** → **URL Configuration** 中添加：

- `http://localhost:3000/*`
- `http://localhost:3001/*`
- `https://your-production-domain.com/*` (生產環境域名)

---

## 🔑 OAuth 第三方登入設置

### Google OAuth 設置

1. **Google Cloud Console 設定**
   - 前往 [Google Cloud Console](https://console.cloud.google.com/)
   - 創建新專項或選擇現有專案
   - 啟用 Google+ API

2. **OAuth 同意畫面設定** (⭐ 必須先完成)
   - 前往「APIs & Services」→「OAuth 同意畫面」
   - 選擇 User Type：「外部」(External)
   - 填寫應用程式資訊：
     - 應用程式名稱：你的應用名稱
     - 使用者支援電子郵件：你的電子郵件
     - 開發人員聯絡資訊：你的電子郵件
   - **授權網域** (Authorized domains) 添加：
     - `supabase.co`
     - `your-domain.com` (你的生產域名)
   - 範圍 (Scopes)：保持預設即可

3. **憑證設定**
   - 前往「憑證」→「建立憑證」→「OAuth 用戶端 ID」
   - 應用程式類型：Web 應用程式
   - 名稱：輸入描述性名稱 (例如：「Supabase Auth」)
   - **已授權的重新導向 URI** 添加：
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (開發環境，可選)
   - 點擊「建立」
   - 📋 **複製 Client ID 和 Client Secret** (稍後需要填入 Supabase)

4. **Supabase Dashboard 設定**
   - 前往 **Authentication** → **Providers**
   - 找到 **Google** provider
   - 啟用 Google provider
   - 填入從 Google Cloud Console 獲得的：
     - Client ID (用戶端 ID)
     - Client Secret (用戶端密鑰)

### GitHub OAuth 設置

1. **GitHub 設定**
   - 前往 [GitHub Settings](https://github.com/settings/profile)
   - Developer settings → OAuth Apps → New OAuth App
   - 填寫應用程式資訊：
     - Application name: 你的應用名稱
     - Homepage URL: `http://localhost:3000` (開發) 或你的網域
     - **Authorization callback URL**:
       - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - 🔄 **重要注意事項**：GitHub OAuth 無需像 Google 那樣另外設置授權網域

2. **Supabase Dashboard 設定**
   - 前往 **Authentication** → **Providers**
   - 找到 **GitHub** provider
   - 啟用 GitHub provider
   - 填入從 GitHub 獲得的：
     - Client ID
     - Client Secret

### OAuth 登入/註冊分離機制

本專案實施了 **OAuth 登入與註冊分離**，提供更嚴格的用戶管理：

#### 運作方式

1. **登入頁面** (`/auth/login`)
   - OAuth 按鈕只允許**已註冊用戶**登入
   - 新用戶嘗試登入會收到錯誤訊息：「No account found. Please sign up first」
   - 系統會建議用戶前往註冊頁面

2. **註冊頁面** (`/auth/signup`)
   - OAuth 按鈕只允許**新用戶**註冊
   - 已存在用戶嘗試註冊會收到錯誤訊息：「Account already exists. Please login instead」
   - 系統會自動重定向到登入頁面

#### 技術實現

- 使用 `mode` 參數區分登入與註冊意圖
- Callback route 會檢查用戶是否存在
- 資料庫追蹤 `registration_method` 欄位

---

## 📧 SMTP 郵件設置

### 選項 1：使用 Supabase 內建郵件服務（測試用）

1. 登入 Supabase Dashboard
2. 前往 **Authentication** → **Email Templates**
3. 確保 **Enable Custom SMTP** 是 **關閉的**
4. 限制：每小時 4 封郵件

### 選項 2：設置 Gmail SMTP（推薦）

#### 步驟 1：創建 Gmail App Password

1. 啟用 [兩步驟驗證](https://myaccount.google.com/signinoptions/two-step-verification)
2. 前往 [Google App Passwords](https://myaccount.google.com/apppasswords)
3. 選擇「郵件」和「其他（自訂名稱）」
4. 輸入名稱如 "Supabase SMTP"
5. 複製 16 位密碼

#### 步驟 2：在 Supabase 配置

1. 前往 **Authentication** → **Email Templates**
2. 開啟 **Enable Custom SMTP**
3. 填入設定：

```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: [16位 App Password]
Sender email: your-email@gmail.com
Sender name: Your App Name
```

### 選項 3：使用專業 SMTP 服務

#### Resend (推薦)
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: [API Key]
```

#### SendGrid
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [API Key]
```

---

## 🧪 測試認證功能

### 功能測試清單

1. **註冊功能** (`/auth/signup`)
   - [x] 表單驗證
   - [x] 密碼強度檢查
   - [x] 條款同意
   - [x] 郵件驗證
   - [x] Google OAuth 註冊（僅新用戶）
   - [x] GitHub OAuth 註冊（僅新用戶）

2. **登入功能** (`/auth/login`)
   - [x] 郵箱密碼登入
   - [x] 記住我功能
   - [x] 錯誤處理
   - [x] Google OAuth 登入（僅已註冊用戶）
   - [x] GitHub OAuth 登入（僅已註冊用戶）

3. **密碼重設** (`/auth/reset-password`)
   - [x] 發送重設郵件
   - [x] 重設連結處理

4. **個人資料** (`/profile`)
   - [x] 查看資料
   - [x] 編輯資料
   - [x] 修改密碼

5. **路由保護**
   - [x] 未登入重定向
   - [x] 已登入狀態保持

### 測試帳號建議

```
測試郵箱: test@example.com
測試密碼: Test123456!
```

---

## 🔧 常見問題解決

### 問題 1：Error sending recovery email

**原因**：SMTP 未配置或配置錯誤

**解決方案**：
1. 檢查 SMTP 設置（見上方 SMTP 郵件設置）
2. 使用 Supabase 內建郵件服務進行測試
3. 檢查 Supabase Dashboard → Authentication → Logs

### 問題 2：Hydration mismatch 警告

**原因**：瀏覽器擴展（如密碼管理器）注入屬性

**解決方案**：
- 已在表單元素添加 `suppressHydrationWarning`
- 這不影響功能，可忽略開發環境警告

### 問題 3：Profile 頁面無限載入

**原因**：Profile 資料可能為 null

**解決方案**：
- 已修復，現在正確處理 null profile
- 確保資料庫 trigger 正常運作

### 問題 4：Sign out 無反應

**原因**：AuthContext 或事件處理問題

**解決方案**：
- 已修復，現在使用 window.location 強制重定向
- 檢查瀏覽器 console 是否有錯誤

### 問題 5：深色模式文字不可見

**原因**：Input/Textarea 組件顏色設置問題

**解決方案**：
- 已修復，使用主題感知的 `text-foreground` 類

---

## 🚀 生產環境部署

### 1. 環境變數設置

在部署平台（Vercel/Netlify）設置：

```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

### 2. Supabase 設置

1. **升級計劃**（如需要）
   - 免費版：每小時 4 封郵件
   - Pro 版：無限制郵件

2. **設置自定義域名**
   - Authentication → URL Configuration
   - 添加生產環境域名

3. **安全設置**
   - 啟用 RLS (Row Level Security)
   - 設置適當的 CORS 政策
   - 配置 Rate Limiting

### 3. 監控與維護

1. **監控**
   - Supabase Dashboard → Authentication → Logs
   - 檢查登入活動和錯誤

2. **備份**
   - 定期備份資料庫
   - 保存環境變數備份

3. **更新**
   - 定期更新依賴包
   - 關注 Supabase 安全更新

---

## 📚 相關資源

- [Supabase 官方文檔](https://supabase.com/docs)
- [Next.js Authentication 指南](https://nextjs.org/docs/authentication)
- [Supabase Discord 社群](https://discord.supabase.com/)

---

## ✅ 完成狀態

所有認證功能已實作完成：
- ✅ Phase 1: Supabase 基礎設置
- ✅ Phase 2: 認證頁面
- ✅ Phase 3: 路由保護
- ✅ Phase 4: 用戶 Profile 管理
- ✅ Phase 5: Header 整合
- ✅ Phase 6: OAuth 第三方登入（Google & GitHub）
- ✅ Phase 7: OAuth 登入/註冊分離機制
- ✅ 所有 bug 修復和優化

---

## 🔄 現有系統升級

如果你已經有運行中的系統需要升級到最新的認證功能，執行以下 SQL：

```sql
-- 1. 更新觸發器函數（包含改進的 OAuth 偵測）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_saas();

-- 然後執行上面的 handle_new_user() 函數和觸發器

-- 2. 修復現有 NULL registration_method 記錄
UPDATE public.profiles_saas 
SET registration_method = (
  SELECT CASE 
    WHEN auth.users.raw_app_meta_data->>'provider' IN ('google', 'github') 
    THEN auth.users.raw_app_meta_data->>'provider'
    WHEN auth.users.raw_user_meta_data->>'iss' LIKE '%google%'
    THEN 'google'
    WHEN auth.users.raw_user_meta_data->>'iss' LIKE '%github%'
    THEN 'github'
    ELSE 'email'  -- 假設為 email 註冊
  END
  FROM auth.users 
  WHERE auth.users.id = profiles_saas.id
)
WHERE registration_method IS NULL;

-- 3. 驗證修復結果
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN registration_method = 'email' THEN 1 END) as email_users,
  COUNT(CASE WHEN registration_method = 'google' THEN 1 END) as google_users,
  COUNT(CASE WHEN registration_method = 'github' THEN 1 END) as github_users,
  COUNT(CASE WHEN registration_method IS NULL THEN 1 END) as unknown_method
FROM public.profiles_saas;
```

---

最後更新：2025-08-19