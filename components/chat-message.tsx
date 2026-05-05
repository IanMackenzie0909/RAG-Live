'use client'

import { User, Bot, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Source } from '@/lib/types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
}

export function ChatMessage({ role, content, sources, isStreaming }: ChatMessageProps) {
  const [isSourcesOpen, setIsSourcesOpen] = useState(false)

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        role === 'user' ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 rounded-full p-2',
          role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        )}
      >
        {role === 'user' ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
            )}
          </p>
        </div>

        {sources && sources.length > 0 && (
          <Collapsible open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 mr-1" />
                查看參考來源 ({sources.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="rounded-md border bg-muted/50 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="font-medium">{source.file_name}</span>
                      {source.page_number && (
                        <span className="text-muted-foreground">第 {source.page_number} 頁</span>
                      )}
                      <span className="text-muted-foreground ml-auto">
                        相似度: {(source.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-3">{source.content}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}
