import { groq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { Index } from '@upstash/vector';
import { embedText } from '@/app/lib/embed';

export const maxDuration = 30;

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const lastText =
    lastMessage?.parts?.find((p) => p.type === 'text')?.text ?? '';

  let context = '';
  if (lastText.trim()) {
    const queryVector = await embedText(lastText, 'RETRIEVAL_QUERY');
    const results = await index.query({
      vector: queryVector,
      topK: 4,
      includeMetadata: true,
    });
    if (results.length) {
      context = results
        .map(
          (r, i) =>
            `[Source ${i + 1}: ${r.metadata?.source ?? 'unknown'}]\n${r.metadata?.text ?? ''}`,
        )
        .join('\n\n');
    }
  }

  const systemPrompt = context
    ? `You are StudyBuddy, a friendly tutor. Explain clearly and step by step. If the user sends an image, analyze it.

Use the following context from the student's uploaded notes to answer, when relevant. Cite sources like [Source 1] when you use them. If the context doesn't help, answer from your own knowledge instead.

CONTEXT:
${context}`
    : 'You are StudyBuddy, a friendly tutor. Explain clearly and step by step. If the user sends an image, analyze it.';

  const result = streamText({
    model: groq('qwen/qwen3.8-27b'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error(error);
      return error instanceof Error ? error.message : String(error);
    },
  });
}
