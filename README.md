# RAG Smart Q&A Platform

This is an intelligent document question-answering system based on RAG (Retrieval-Augmented Generation).
After uploading PDF or TXT files, the system automatically parses document content and builds vector indexes, allowing users to ask natural language questions about the documents with source-annotated answers.

## Tech Stack

### Backend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + pgvector for vector search)
- **AI SDK**: Vercel AI SDK 6.x
- **Text Generation**: Google Gemini 2.5 Flash (via `@ai-sdk/google`)
- **Text Embedding**: Google gemini-embedding-001 (3072-dimensional vectors)
- **PDF Parsing**: unpdf (primary) + pdf-parse (fallback)

### Frontend

- **UI Framework**: React 19 + shadcn/ui
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR
- **Icons**: lucide-react
- **Theming**: next-themes (dark/light mode support)

## Project Structure

```text
RAG_Live/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Chat API (RAG Q&A)
│   │   └── documents/
│   │       ├── route.ts               # Document list GET / delete DELETE
│   │       └── upload/route.ts        # Document upload POST
│   ├── globals.css                    # Global styles (incl. dark mode)
│   ├── layout.tsx                     # Root layout (ThemeProvider)
│   └── page.tsx                       # Main page (split-panel layout)
├── components/
│   ├── chat-interface.tsx             # Chat interface
│   ├── chat-message.tsx               # Message rendering (with source citations)
│   ├── document-list.tsx              # Document list (with delete confirmation)
│   ├── file-upload.tsx                # Drag-and-drop upload component
│   ├── theme-provider.tsx             # Theme provider
│   ├── theme-toggle.tsx               # Dark/light toggle button
│   └── ui/                            # shadcn/ui component library
├── lib/
│   ├── embedding.ts                   # Vector embedding generation
│   ├── supabase/
│   │   ├── client.ts                  # Browser-side Supabase client
│   │   └── server.ts                  # Server-side Supabase client
│   ├── text-splitter.ts               # Text splitter
│   ├── types.ts                       # TypeScript type definitions
│   └── utils.ts                       # Utility functions
├── hooks/
│   ├── use-mobile.ts                  # Mobile device detection
│   └── use-toast.ts                   # Toast notifications
├── .env                               # Environment variables (in .gitignore)
├── package.json
└── start.ps1                          # One-click startup script
```

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI (default variable name read by @ai-sdk/google)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

- **Supabase**: Obtain from [Supabase Dashboard](https://supabase.com/dashboard) > Settings > API
- **Google AI**: Obtain from [Google AI Studio](https://aistudio.google.com/apikey)

### 3. Supabase Database Setup

Ensure the following are configured in your Supabase project:

1. Enable the `pgvector` extension
2. Create 4 tables: `documents`, `document_chunks`, `conversations`, `messages`
3. Create the `match_documents` RPC function (vector similarity search)

### 4. Start the Development Server

```bash
pnpm dev
```

Or make it into a startup script: Create a .ps1 file and save it as a .ps1 file. Then you can double click it to start the server. For faster startup and one-click use, consider creating a desktop shortcut to this script:

```powershell
.\start.ps1
```

## Core Features

### Document Management

- Drag-and-drop or click to upload PDF / TXT files (max 10 MB)
- Dual PDF parsing for reliability: unpdf first, automatic fallback to pdf-parse on failure
- Automatic pipeline on upload: text extraction → chunking (1000 chars/chunk, 200-char overlap) → vectorization → database storage
- Document list display and deletion (with confirmation dialog)

### RAG Q&A

1. User enters a question
2. Question is vectorized (gemini-embedding-001, 3072 dimensions)
3. Cosine similarity search on the `document_chunks` table (threshold > 0.5, top 5 results)
4. Relevant chunks are sent as context to Gemini 2.5 Flash
5. AI response is streamed back with source citations

### UI Highlights

- Split-panel layout (Document Management 40% / Q&A 60%)
- Dark / light mode toggle (follows system preference / manual switch)
- Streaming responses (typewriter effect)
- Collapsible source citations

## Notes

- ⚠️ The `.env` file contains API keys — keep it secure and never push it to a public repository.
- ⚠️ Currently using free-tier API keys; exceeding the quota will result in 503 errors.
- 💡 The `pgvector` IVFFlat index supports up to 2000 dimensions; 3072-dimensional vectors use brute-force search instead (fast enough for small-to-medium applications).
