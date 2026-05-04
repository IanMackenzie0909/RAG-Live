import { google } from '@ai-sdk/google'
import { createDataStreamResponse, streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embedding'
import type { MatchedChunk } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: '請輸入問題' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: '無效的訊息格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const userQuestion = lastMessage.content

    // Generate embedding for the question
    const queryEmbedding = await generateEmbedding(userQuestion)

    // Search for relevant document chunks
    const supabase = await createClient()

    const { data: matchedChunks, error: searchError } = await supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 5
      })

    if (searchError) {
      console.error('Error searching documents:', searchError)
    }

    const chunks: MatchedChunk[] = matchedChunks || []

    // Build context from matched chunks
    let contextText = ''
    const sources: { file_name: string; page_number: number | null; content: string; similarity: number }[] = []

    if (chunks.length > 0) {
      contextText = chunks.map((chunk, index) => {
        const pageInfo = chunk.page_number ? `第${chunk.page_number}頁` : ''
        sources.push({
          file_name: chunk.file_name,
          page_number: chunk.page_number,
          content: chunk.content.substring(0, 200) + '...',
          similarity: chunk.similarity
        })
        return `[參考資料 ${index + 1}：${chunk.file_name} ${pageInfo}]\n${chunk.content}`
      }).join('\n\n---\n\n')
    }

    // Build system prompt
    const systemPrompt = `你是一個專業的文件助手。請根據以下參考資料回答問題。

重要指示：
1. 請優先使用參考資料中的內容來回答問題
2. 如果參考資料中沒有相關內容，請誠實告知「根據目前上傳的文件，我找不到相關資訊」
3. 回答時請明確標註引用來源，格式為 [來源：檔案名稱 第X頁]
4. 保持回答簡潔、準確
5. 使用繁體中文回答

${contextText ? `以下是與問題相關的參考資料：\n\n${contextText}` : '目前沒有找到與問題相關的參考資料。'}`

    // Stream response with sources via data stream annotations
    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Attach sources as message annotation (received by frontend via message.annotations)
        if (sources.length > 0) {
          dataStream.writeMessageAnnotation({ sources })
        }

        const result = streamText({
          model: google('gemini-2.5-flash'),
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userQuestion
            }
          ],
        })

        result.mergeIntoDataStream(dataStream)
      },
    })
  } catch (error) {
    console.error('Error in POST /api/chat:', error)
    return new Response(JSON.stringify({ error: '處理問題時發生錯誤' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
