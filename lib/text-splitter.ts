/**
 * Split text into chunks with overlap
 * @param text - The text to split
 * @param chunkSize - Target size of each chunk (default 1000 chars)
 * @param overlap - Overlap between chunks (default 200 chars)
 * @param pageNumber - Optional page number for tracking
 * @returns Array of chunks with metadata
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
  pageNumber?: number
): { content: string; pageNumber: number | null }[] {
  const chunks: { content: string; pageNumber: number | null }[] = []
  
  // Clean the text
  const cleanedText = text.replace(/\s+/g, ' ').trim()
  
  if (cleanedText.length === 0) {
    return chunks
  }
  
  // If text is shorter than chunk size, return as single chunk
  if (cleanedText.length <= chunkSize) {
    chunks.push({
      content: cleanedText,
      pageNumber: pageNumber ?? null
    })
    return chunks
  }
  
  let currentPosition = 0
  let iterationCount = 0
  const maxIterations = Math.ceil(cleanedText.length / (chunkSize - overlap)) + 10
  
  while (currentPosition < cleanedText.length && iterationCount < maxIterations) {
    iterationCount++
    
    // Calculate end position
    let endPosition = Math.min(currentPosition + chunkSize, cleanedText.length)
    
    // If we're not at the end, try to find a good break point
    if (endPosition < cleanedText.length) {
      // Look for sentence endings (。！？.!?)
      const searchStart = Math.max(currentPosition + Math.floor(chunkSize * 0.7), currentPosition)
      const searchText = cleanedText.slice(searchStart, endPosition)
      
      // Find last sentence ending
      const sentenceEndings = ['。', '！', '？', '.', '!', '?']
      let lastBreakIndex = -1
      
      for (const ending of sentenceEndings) {
        const idx = searchText.lastIndexOf(ending)
        if (idx > lastBreakIndex) {
          lastBreakIndex = idx
        }
      }
      
      if (lastBreakIndex !== -1) {
        endPosition = searchStart + lastBreakIndex + 1
      }
    }
    
    // Extract chunk
    const chunk = cleanedText.slice(currentPosition, endPosition).trim()
    
    if (chunk.length > 0) {
      chunks.push({
        content: chunk,
        pageNumber: pageNumber ?? null
      })
    }
    
    // Move position forward (with overlap)
    const previousPosition = currentPosition
    currentPosition = endPosition - overlap
    
    // Ensure we always move forward to prevent infinite loop
    if (currentPosition <= previousPosition) {
      currentPosition = previousPosition + Math.max(1, chunkSize - overlap)
    }
    
    // If remaining text is too small, break
    if (cleanedText.length - currentPosition <= overlap) {
      break
    }
  }
  
  return chunks
}

/**
 * Split text by pages and then into chunks
 * @param pages - Array of page texts
 * @param chunkSize - Target size of each chunk
 * @param overlap - Overlap between chunks
 * @returns Array of chunks with page numbers
 */
export function splitPagesIntoChunks(
  pages: string[],
  chunkSize: number = 1000,
  overlap: number = 200
): { content: string; pageNumber: number | null }[] {
  const allChunks: { content: string; pageNumber: number | null }[] = []
  
  for (let i = 0; i < pages.length; i++) {
    const pageChunks = splitTextIntoChunks(pages[i], chunkSize, overlap, i + 1)
    allChunks.push(...pageChunks)
  }
  
  return allChunks
}
