'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // Groq request limit is ~4 MB
const MAX_IMAGES = 3; // Groq allows max 3 images per request

const isDoc = (f: File) =>
  ['application/pdf', 'text/plain', 'text/markdown'].includes(f.type) ||
  /\.(pdf|txt|md)$/i.test(f.name);

const toFileList = (arr: File[]) => {
  const dt = new DataTransfer();
  arr.forEach((f) => dt.items.add(f));
  return dt.files;
};

export default function Page() {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, status, error } = useChat();

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const all = Array.from(list);
    const newImgs = all.filter(
      (f) => f.type.startsWith('image/') && f.size <= MAX_IMAGE_BYTES,
    );
    const newDocs = all.filter(isDoc);

    setImages((prev) => [...prev, ...newImgs].slice(0, MAX_IMAGES));
    setDocs((prev) => [...prev, ...newDocs]);

    if (newDocs.length) {
      setUploading(true);
      for (const doc of newDocs) {
        const fd = new FormData();
        fd.append('file', doc);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const data = await res.json();
          console.log('upload result:', data);
          if (!res.ok) alert(`Upload failed: ${data.error}`);
        } catch (err) {
          console.error('upload error:', err);
          alert('Upload request failed, check the browser console (F12).');
        }
      }
      setUploading(false);
    }

    if (newImgs.length + newDocs.length < all.length) {
      alert('Some files were skipped. Allowed: images under 3 MB, PDF, TXT, MD.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && images.length === 0) return;
    sendMessage({
      text: input || 'Explain this image.',
      files: images.length ? toFileList(images) : undefined,
    });
    setInput('');
    setImages([]);
  };

  return (
    <main
      className="relative mx-auto flex h-screen max-w-2xl flex-col p-4"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-500/10 text-xl">
          Drop files here
        </div>
      )}

      <h1 className="mb-4 text-2xl font-bold">StudyBuddy</h1>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
              }`}
            >
              {m.parts.map((part, i) => {
                if (part.type === 'text')
                  return (
                    <div key={i} className="prose prose-invert max-w-none text-left">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                    </div>
                  );
                if (part.type === 'file' && part.mediaType?.startsWith('image/'))
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={part.url} alt="upload" className="mb-2 max-h-48 rounded" />
                  );
                return null;
              })}
            </div>
          </div>
        ))}
        {status === 'submitted' && <p className="text-gray-400">Thinking...</p>}
        {error && <p className="text-red-400">Error: {error.message}</p>}
      </div>

      {(images.length > 0 || docs.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {images.map((f, i) => (
            <span key={`img-${i}`} className="rounded bg-gray-700 px-2 py-1">
              🖼️ {f.name}
              <button
                type="button"
                onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                className="ml-2 text-red-300"
              >
                ✕
              </button>
            </span>
          ))}
          {docs.map((f, i) => (
            <span key={`doc-${i}`} className="rounded bg-emerald-800 px-2 py-1">
              📄 {f.name}
              <button
                type="button"
                onClick={() => setDocs((p) => p.filter((_, j) => j !== i))}
                className="ml-2 text-red-300"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md"
          ref={fileRef}
          onChange={(e) => addFiles(e.target.files)}
          className="w-28 text-xs"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded border bg-white px-3 py-2 text-black"
        />
        <button
          type="submit"
          disabled={status !== 'ready'}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
