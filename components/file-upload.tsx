'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface FileUploadProps {
  onUploadComplete: () => void
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const uploadFile = async (file: File) => {
    setSelectedFile(file)
    setStatus('uploading')
    setProgress(20)
    setErrorMessage('')

    try {
      // Validate file type
      const validTypes = ['application/pdf', 'text/plain']
      const isValidType = validTypes.includes(file.type) ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.txt')

      if (!isValidType) {
        throw new Error('不支援的檔案格式。請上傳 PDF 或 TXT 檔案。')
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('檔案大小超過 10MB 限制')
      }

      setProgress(40)
      setStatus('processing')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: '伺服器回應錯誤' }))
        throw new Error(data.error || '上傳失敗')
      }

      setProgress(100)
      setStatus('success')
      onUploadComplete()

      // Reset after success
      setTimeout(() => {
        setStatus('idle')
        setProgress(0)
        setSelectedFile(null)
      }, 2000)
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : '上傳失敗，請稍後重試')
      setProgress(0)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
    // Reset input
    e.target.value = ''
  }

  const getStatusContent = () => {
    switch (status) {
      case 'uploading':
        return (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">上傳中...</p>
            <Progress value={progress} className="w-48" />
          </div>
        )
      case 'processing':
        return (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">處理文件中（解析文字、生成向量...）</p>
            <Progress value={progress} className="w-48" />
          </div>
        )
      case 'success':
        return (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm text-green-600">上傳成功！</p>
          </div>
        )
      case 'error':
        return (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatus('idle')
                setErrorMessage('')
              }}
            >
              重試
            </Button>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">拖放檔案至此處</p>
              <p className="text-xs text-muted-foreground mt-1">或點擊選擇檔案</p>
              <p className="text-xs text-muted-foreground mt-2">
                支援 PDF、TXT 格式（最大 10MB）
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer
        ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        ${status === 'error' ? 'border-destructive/50' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Prevent if clicking on the input itself
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        if (status === 'idle') {
          const fileInput = document.getElementById('file-input') as HTMLInputElement
          if (fileInput) {
            fileInput.click()
          }
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (status === 'idle') {
            const fileInput = document.getElementById('file-input') as HTMLInputElement
            if (fileInput) {
              fileInput.click()
            }
          }
        }
      }}
    >
      <input
        id="file-input"
        type="file"
        className="sr-only"
        accept=".pdf,.txt,application/pdf,text/plain"
        onChange={handleFileSelect}
        aria-label="選擇檔案"
      />

      {selectedFile && status !== 'idle' && (
        <div className="absolute top-2 left-2 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{selectedFile.name}</span>
        </div>
      )}

      <div className="flex justify-center items-center min-h-[120px]">
        {getStatusContent()}
      </div>
    </div>
  )
}
