import { Index } from '@upstash/vector';
import { extractText, getDocumentProxy } from 'unpdf';
import { chunkText } from '@/app/lib/chunk';
import { embedText } from '@/app/lib/embed';

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return Response.json({ error: 'No file' }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  let text = '';

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const pdf = await getDocumentProxy(buf);
    const { text: extracted } = await extractText(pdf, { mergePages: true });
    text = extracted;
  } else {
    text = new TextDecoder().decode(buf);
  }

  if (!text.trim()) return Response.json({ error: 'No text found in file' }, { status: 400 });

  const chunks = chunkText(text);
  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const values = await embedText(chunks[i], 'RETRIEVAL_DOCUMENT');
    vectors.push({
      id: `${file.name}-${i}-${Date.now()}`,
      vector: values,
      metadata: { text: chunks[i], source: file.name },
    });
  }
  await index.upsert(vectors);

  return Response.json({ ok: true, fileName: file.name, chunks: chunks.length });
}
