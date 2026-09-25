StudyBuddy

A multimodal RAG chatbot built for the igebra.ai AI Intern assignment. It's an Ed-Tech study assistant — you can chat with it normally, send it images (like a photo of a problem or a diagram), and upload your own notes so it can answer questions using them instead of just guessing.

Try it live: https://studybuddy-xi-sooty.vercel.app

What it does
Normal chat, streamed responses, formatted in markdown
Understands images — upload a photo and ask about it
You can drag and drop files straight onto the chat
The main part: upload a PDF or TXT of your notes, and the bot will actually search through them and answer from them, citing which part it used (like [Source 1])
Stack

I went with Groq for the LLM since it's fast and free, and it also has a vision model so text and images could use the same model. For RAG I needed a vector DB and an embedding model — Groq doesn't do embeddings, so I used Gemini's embedding API (also free) and Upstash Vector to store everything.

Next.js (App Router)
Vercel AI SDK for the chat/streaming
Groq — qwen/qwen3.8-27b (text + vision)
Gemini — gemini-embedding-001 for embeddings
Upstash Vector — 1536 dimensions, cosine similarity
unpdf to pull text out of PDFs
Tailwind for styling
Deployed on Vercel
How the RAG part works

When you drop a PDF/TXT on the chat, it goes to /api/upload, gets its text pulled out, split into ~800 character chunks (with some overlap so context isn't cut off mid-sentence), each chunk gets embedded, and all of it gets stored in Upstash.

When you ask something, /api/chat embeds your question, pulls the top 4 closest chunks from Upstash, and stuffs them into the system prompt before Groq generates a reply. If nothing relevant comes up, it just answers normally from its own knowledge.

Running it locally

Clone and install:

git clone https://github.com/Bhuvanesh40046/studybuddy.git
cd studybuddy
npm install

Make a .env.local in the root:

GROQ_API_KEY=
UPSTASH_VECTOR_REST_URL=
UPSTASH_VECTOR_REST_TOKEN=
GEMINI_API_KEY=

Where to get these:

Groq — console.groq.com/keys
Upstash Vector — console.upstash.com, create an index with type Dense, model Custom, dimension 1536, similarity Cosine
Gemini — aistudio.google.com/apikey

Then run:

npm run dev
Trying it out
Ask it something general, e.g. "explain Newton's third law" — should stream back a formatted answer
Drop an image on it and ask what's in it
Drop a PDF or TXT of some notes, wait for "Indexing document..." to disappear
Ask a question that's actually answered in that file — it should answer from it and cite [Source 1]
Folder layout
app/
  api/
    chat/route.ts    → handles the chat + retrieval
    upload/route.ts  → handles reading/chunking/embedding uploaded files
  lib/
    chunk.ts         → splits text into chunks
    embed.ts         → calls Gemini to get embeddings
  page.tsx           → the actual chat UI
A couple of limitations
Images are capped at 3MB and max 3 per message, that's a Groq limit, not something I chose
Uploaded docs are only used for retrieval, they never get sent to the model directly as full text