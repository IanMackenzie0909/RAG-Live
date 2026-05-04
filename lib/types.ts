export interface Document {
  id: string
  file_name: string
  file_size: number
  file_type: string
  total_pages: number | null
  created_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  page_number: number | null
  embedding: number[] | null
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[] | null
  created_at: string
}

export interface Source {
  file_name: string
  page_number: number | null
  content: string
  similarity: number
}

export interface MatchedChunk {
  id: string
  document_id: string
  content: string
  page_number: number | null
  file_name: string
  similarity: number
}
