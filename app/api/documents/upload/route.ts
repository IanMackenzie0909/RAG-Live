import { NextResponse } from 'next/server'
import { createClient } from '@/RAG-Live/lib/supabase/server'
import { splitTextIntoChunks, splitPagesIntoChunks } from '@/RAG-Live/lib/text-splitter'
import { generateEmbedding } from '@/RAG-Live/lib/embedding'

// PDF parsing with fallback
async function parsePDF(buffer: ArrayBuffer): Promise<{ text: string; pages: string[]; pageCount: number }> {
  // Make a copy of the buffer for potential fallback
  const bufferCopy = buffer.slice(0)

  // Try unpdf first
  try {
    const { extractText } = await import('unpdf')
    const result = await extractText(new Uint8Array(buffer), { mergePages: false })

    // result.text can be string or string[] depending on mergePages option
    // result.pages is string[] when mergePages is false
    const pages = result.pages || []
    const textContent = Array.isArray(result.text)
      ? result.text.join('\n')
      : (typeof result.text === 'string' ? result.text : pages.join('\n'))

    if (textContent && textContent.trim().length > 0) {
      return {
        text: textContent,
        pages: pages.length > 0 ? pages : [textContent],
        pageCount: result.totalPages || pages.length || 1
      }
    }
  } catch (unpdfError) {
    console.warn('unpdf failed, trying pdf-parse:', unpdfError)
  }

  // Fallback to pdf-parse
  try {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(Buffer.from(bufferCopy))

    // pdf-parse doesn't easily give per-page text, so we'll treat it as one page
    return {
      text: result.text,
      pages: [result.text],
      pageCount: result.numpages
    }
  } catch (pdfParseError) {
    console.error('pdf-parse also failed:', pdfParseError)
    throw new Error('無法解析 PDF 檔案。請確認檔案未加密且格式正確。')
  }
}

// Check if file is a valid PDF by magic bytes
function isValidPDF(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer)
  // PDF magic bytes: %PDF
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '請選擇要上傳的檔案' },
        { status: 400 }
      )
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '檔案大小超過 10MB 限制' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    let text = ''
    let pages: string[] = []
    let pageCount: number | null = null

    // Process based on file type
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // Validate PDF
      if (!isValidPDF(buffer)) {
        return NextResponse.json(
          { error: '檔案格式無效，請確認是有效的 PDF 檔案' },
          { status: 400 }
        )
      }

      try {
        const result = await parsePDF(buffer)
        text = result.text
        pages = result.pages
        pageCount = result.pageCount
      } catch (error) {
        const message = error instanceof Error ? error.message : '解析 PDF 時發生錯誤'
        return NextResponse.json(
          { error: message },
          { status: 400 }
        )
      }
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      const decoder = new TextDecoder('utf-8')
      text = decoder.decode(buffer)
      pages = [text]
    } else {
      return NextResponse.json(
        { error: '不支援的檔案格式。請上傳 PDF 或 TXT 檔案。' },
        { status: 400 }
      )
    }

    // Check if text was extracted
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '無法從檔案中提取文字內容' },
        { status: 400 }
      )
    }

    // Split text into chunks
    const chunks = pages.length > 1
      ? splitPagesIntoChunks(pages, 1000, 200)
      : splitTextIntoChunks(text, 1000, 200)

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: '檔案內容為空' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Insert document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
        total_pages: pageCount
      })
      .select()
      .single()

    if (docError || !document) {
      console.error('Error inserting document:', docError)
      return NextResponse.json(
        { error: '無法儲存文件資訊' },
        { status: 500 }
      )
    }

    // Generate embeddings and insert chunks
    try {
      const chunkData = []

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = await generateEmbedding(chunk.content)

        chunkData.push({
          document_id: document.id,
          chunk_index: i,
          content: chunk.content,
          page_number: chunk.pageNumber,
          embedding: embedding
        })
      }

      // Insert chunks in batches
      const batchSize = 50
      for (let i = 0; i < chunkData.length; i += batchSize) {
        const batch = chunkData.slice(i, i + batchSize)
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert(batch)

        if (chunkError) {
          console.error('Error inserting chunks:', chunkError)
          // Clean up the document if chunk insertion fails
          await supabase.from('documents').delete().eq('id', document.id)
          return NextResponse.json(
            { error: '無法儲存文件片段' },
            { status: 500 }
          )
        }
      }
    } catch (embeddingError) {
      console.error('Error generating embeddings:', embeddingError)
      // Clean up the document
      await supabase.from('documents').delete().eq('id', document.id)
      return NextResponse.json(
        { error: '處理文件向量時發生錯誤' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document: document,
      chunksCount: chunks.length
    })
  } catch (error) {
    console.error('Error in POST /api/documents/upload:', error)
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後重試' },
      { status: 500 }
    )
  }
}
