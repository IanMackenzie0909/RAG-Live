'use client'

import useSWR from 'swr'
import { FileUpload } from '@/components/file-upload'
import { DocumentList } from '@/components/document-list'
import { ChatInterface } from '@/components/chat-interface'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Document } from '@/lib/types'
import { FileText, MessageSquare, Brain } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
}

export default function Home() {
  const { data: documents = [], error, isLoading, mutate } = useSWR<Document[]>(
    '/api/documents',
    fetcher,
    { refreshInterval: 0 }
  )

  const handleUploadComplete = () => {
    mutate()
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      mutate()
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">RAG 智能問答平台</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Document Management (40%) */}
        <div className="w-full lg:w-2/5 border-b lg:border-b-0 lg:border-r flex flex-col h-1/2 lg:h-full">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">文件管理</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              上傳 PDF 或 TXT 文件，系統將自動解析並建立索引
            </p>
          </div>

          <div className="p-4">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-0">
            <h3 className="text-sm font-medium mb-3 sticky top-0 bg-background py-2">
              已上傳文件 ({documents.length})
            </h3>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              onDelete={handleDelete}
            />
            {error && (
              <p className="text-sm text-destructive mt-2">無法載入文件列表</p>
            )}
          </div>
        </div>

        {/* Right Panel - Chat Interface (60%) */}
        <div className="w-full lg:w-3/5 flex flex-col h-1/2 lg:h-full">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">智能問答</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              根據上傳的文件內容回答您的問題，並標註答案來源
            </p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatInterface hasDocuments={documents.length > 0} />
          </div>
        </div>
      </div>
    </main>
  )
}
