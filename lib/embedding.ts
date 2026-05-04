import { google } from '@ai-sdk/google'
import { embed } from 'ai'

/**
 * Generate embedding for text using Google's gemini-embedding-001 model
 * Output dimension: 3072
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('未設定 GOOGLE_GENERATIVE_AI_API_KEY 環境變數，請在 .env 中設定。')
  }

  const { embedding } = await embed({
    model: google.textEmbeddingModel('gemini-embedding-001'),
    value: text,
    providerOptions: {
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    },
  })

  return embedding
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []

  // Process in batches to avoid rate limiting
  const batchSize = 5
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const batchEmbeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    )
    embeddings.push(...batchEmbeddings)
  }

  return embeddings
}
