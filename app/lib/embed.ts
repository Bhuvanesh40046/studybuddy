export async function embedText(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: 1536,
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values as number[];
}
