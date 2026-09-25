export function chunkText(text: string, size = 800, overlap = 150) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    start += size - overlap;
  }
  return chunks;
}
