# RAG 智能問答平台

基於 RAG（Retrieval-Augmented Generation）技術的智能文件問答系統。上傳 PDF 或 TXT 文件後，系統會自動解析文件內容、建立向量索引，讓使用者可以針對文件內容進行自然語言問答，並標註答案來源。

## 技術棧

### 後端

- **框架**：Next.js 16（App Router）
- **語言**：TypeScript
- **資料庫**：Supabase（PostgreSQL + pgvector 向量搜尋）
- **AI SDK**：Vercel AI SDK 6.x
- **文字生成**：Google Gemini 2.5 Flash（透過 `@ai-sdk/google`）
- **文字向量化**：Google gemini-embedding-001（3072 維度向量）
- **PDF 解析**：unpdf（主要）+ pdf-parse（備援）

### 前端

- **UI 框架**：React 19 + shadcn/ui
- **樣式**：Tailwind CSS v4
- **資料同步**：SWR
- **圖示**：lucide-react
- **主題**：next-themes（支援深色/淺色模式）

## 專案結構

```text
RAG_Live/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # 聊天 API（RAG 問答）
│   │   └── documents/
│   │       ├── route.ts               # 文件列表 GET / 刪除 DELETE
│   │       └── upload/route.ts        # 文件上傳 POST
│   ├── globals.css                    # 全域樣式（含深色模式）
│   ├── layout.tsx                     # 根佈局（ThemeProvider）
│   └── page.tsx                       # 主頁面（左右分欄）
├── components/
│   ├── chat-interface.tsx             # 聊天介面
│   ├── chat-message.tsx               # 訊息渲染（含來源引用）
│   ├── document-list.tsx              # 文件列表（含刪除確認）
│   ├── file-upload.tsx                # 拖放上傳元件
│   ├── theme-provider.tsx             # 主題供應器
│   ├── theme-toggle.tsx               # 深色/淺色切換按鈕
│   └── ui/                            # shadcn/ui 元件庫
├── lib/
│   ├── embedding.ts                   # 向量嵌入生成
│   ├── supabase/
│   │   ├── client.ts                  # 瀏覽器端 Supabase 客戶端
│   │   └── server.ts                  # 伺服器端 Supabase 客戶端
│   ├── text-splitter.ts               # 文字分割器
│   ├── types.ts                       # TypeScript 型別定義
│   └── utils.ts                       # 工具函數
├── hooks/
│   ├── use-mobile.ts                  # 行動裝置偵測
│   └── use-toast.ts                   # Toast 通知
├── .env                               # 環境變數（已加入 .gitignore）
├── package.json
└── start.ps1                          # 一鍵啟動腳本
```

## 環境設定

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 設定環境變數

在專案根目錄建立 `.env` 檔案：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI（@ai-sdk/google 預設讀取此變數名）
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

- **Supabase**：在 [Supabase Dashboard](https://supabase.com/dashboard) > Settings > API 取得
- **Google AI**：在 [Google AI Studio](https://aistudio.google.com/apikey) 取得

### 3. Supabase 資料庫設定

確保 Supabase 專案中已建立：

1. 啟用 `pgvector` extension
2. 建立 4 張表：`documents`、`document_chunks`、`conversations`、`messages`
3. 建立 `match_documents` RPC 函數（向量相似度搜尋）

> 詳細的資料庫結構請參考 `PROJECT_OVERVIEW.md`。

### 4. 啟動開發伺服器

```bash
pnpm dev
```

或使用一鍵啟動腳本（Windows PowerShell）：

```powershell
.\start.ps1
```

## 核心功能

### 文件管理

- 拖放或點擊上傳 PDF / TXT 文件（最大 10MB）
- PDF 雙重解析保險：unpdf 優先，失敗時自動切換 pdf-parse
- 上傳時自動：文字提取 → 分割（1000 字元/片段，重疊 200 字元）→ 向量化 → 存入資料庫
- 文件列表顯示、刪除（含確認對話框）

### RAG 問答

1. 使用者輸入問題
2. 問題向量化（gemini-embedding-001，3072 維度）
3. 在 document_chunks 表進行餘弦相似度搜尋（閾值 > 0.5，最多 5 個）
4. 將相關片段作為上下文送給 Gemini 2.5 Flash
5. 串流回傳 AI 回答，附帶來源引用

### UI 特色

- 左右分欄設計（文件管理 40% / 問答 60%）
- 深色 / 淺色模式切換（跟隨系統 / 手動切換）
- 串流回應（打字機效果）
- 來源引用可折疊查看

## 注意事項

- ⚠️ `.env` 包含 API 金鑰，請妥善保管，勿上傳至公開倉庫
- ⚠️ 目前使用免費額度的 API Key，用量超過會回傳 503
- 💡 `pgvector` 的 ivfflat 索引最多支援 2000 維度，3072 維度向量直接暴力搜尋（中小型應用足夠快速）
