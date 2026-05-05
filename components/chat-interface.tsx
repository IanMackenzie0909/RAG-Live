'use client'

import { useChat } from '@ai-sdk/react'
import { useRef, useEffect } from 'react'
import { Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChatMessage } from '@/components/chat-message'
import type { Source } from '@/lib/types'

interface ChatInterfaceProps {
  hasDocuments: boolean
}

/**
 * Extract sources from message annotations (sent by backend via dataStream.writeMessageAnnotation)
 */
function getSources(message: { annotations?: unknown[] }): Source[] | undefined {
  if (!message.annotations) return undefined
  for (const annotation of message.annotations) {
    if (annotation && typeof annotation === 'object' && 'sources' in annotation) {
      return (annotation as { sources: Source[] }).sources
    }
  }
  return undefined
}

export function ChatInterface({ hasDocuments }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    initialInput: '',
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e)

    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto'
    // Set height based on content, max 120px
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!(input ?? '').trim() || isLoading || !hasDocuments) return
    handleSubmit(e)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">開始智能問答</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {hasDocuments
                ? '請在下方輸入您的問題，系統會根據已上傳的文件內容為您找出答案。'
                : '請先在左側上傳文件，然後就可以開始提問了。'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                role={message.role as 'user' | 'assistant'}
                content={message.content}
                sources={message.role === 'assistant' ? getSources(message) : undefined}
                isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0 rounded-full p-2 bg-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground">正在思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error.message || '發生錯誤，請稍後重試'}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input ?? ''}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={hasDocuments ? '輸入您的問題...' : '請先上傳文件'}
            disabled={!hasDocuments || isLoading}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!(input ?? '').trim() || isLoading || !hasDocuments}
            className="h-11 w-11 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          按 Enter 發送，Shift + Enter 換行
        </p>
      </div>
    </div>
  )
}
