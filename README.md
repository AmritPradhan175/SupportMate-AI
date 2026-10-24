# SupportMate AI

An AI-powered customer support chatbot that answers questions from a company knowledge base, cites the FAQs it used, and clearly says so when it cannot answer. Built with Next.js, TypeScript, Tailwind CSS and the Gemini API.

> **Demo data:** the 14 FAQ entries in `src/lib/knowledge-base.json` are fictional sample policies. They are not commitments from any real company. Replace them with your own before going live.

## Features

- Natural-language chat with answers grounded in retrieved FAQ entries only
- Related FAQ sources shown under each answer
- Deterministic fallback (no model call) when nothing relevant is found, and when the model reports it cannot answer
- Four suggested-question cards, loading indicator, error banner with **Retry**, copy-answer button
- **New chat** / **Clear conversation**, conversation history saved in `localStorage`
- Client and server validation (1,000-character limit), IP-based rate limiting, request timeout
- Prompt-injection hardening: the question is treated as untrusted data, the model's output must pass a Zod schema, and only source IDs that were actually retrieved are accepted
- Responsive, keyboard-accessible UI (visible focus, `role="log"` conversation, reduced-motion support)

## Architecture

```
Customer question
  -> client validation (non-empty, <= 1,000 chars, one request at a time)
  -> POST /api/chat
  -> server validation (Zod) + rate limit
  -> FAQ retrieval (keyword scoring, threshold, top 3)
       no relevant entries -> deterministic fallback (Gemini is NOT called)
  -> Gemini (system instruction + retrieved FAQs only + escaped question, JSON output)
  -> answer validation (Zod schema, source IDs must be among the retrieved entries)
       insufficientInformation = true -> deterministic fallback
       invalid output / provider failure -> safe error response (never a made-up answer)
  -> JSON response -> render answer + sources
```

Retrieval lives behind `retrieveFaqs(query, options)` in `src/lib/knowledge.ts`. To move to embedding-based search later, keep that return shape (`results[].faq`, `score`, `matchedTerms`) and swap the scoring.

A keyword match only means "possibly relevant". That is why the model is asked to set `insufficientInformation` when the retrieved FAQs do not directly answer the question (for example, "How do I return to the home screen on my phone?" matches the returns FAQ by keyword but is not answerable from it).

## Tech stack

Next.js 16 (App Router, Route Handlers, Node.js runtime), React 19, TypeScript (strict), Tailwind CSS 4, Lucide React, Zod 4, `@google/genai` (official Google GenAI SDK), Vitest.

## Folder structure

```
supportmate-ai/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts        POST /api/chat
│   │   ├── globals.css              theme tokens (navy, indigo/violet, cyan)
│   │   ├── icon.svg
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                  Header, WelcomeScreen, ChatWindow, ChatMessage, MessageComposer,
│   │                                SuggestedQuestions, SourceReferences, TypingIndicator, ErrorBanner,
│   │                                Footer, ChatApp (composition), MarkdownText (safe renderer)
│   ├── hooks/useChat.ts             chat state, requests, retry, new chat
│   ├── lib/
│   │   ├── knowledge-base.json      demo FAQs
│   │   ├── knowledge.ts             normalization, tokenization, scoring, ranking
│   │   ├── gemini.ts                prompt building + Gemini call + error mapping
│   │   ├── validation.ts            Zod schemas, model-output parsing, env validation
│   │   ├── rate-limit.ts            in-memory sliding-window limiter
│   │   ├── chat-storage.ts          localStorage-backed store
│   │   └── errors.ts
│   └── types/chat.ts
├── tests/                           knowledge.test.ts, chat-api.test.ts
├── .env.example
├── vitest.config.mts
└── package.json
```

## Prerequisites

- Node.js 20.9 or newer (22 LTS recommended) and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- A Gemini text model name that is currently available to your key (see the [model list](https://ai.google.dev/gemini-api/docs/models); for example `gemini-2.5-flash`). Model names change over time, which is why the name is an environment variable.

## Installation

```bash
git clone <your-repo-url> supportmate-ai
cd supportmate-ai
npm install
```

## Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Server only. Never prefix with `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | yes | Gemini model name, e.g. `gemini-2.5-flash`. |
| `NEXT_PUBLIC_APP_NAME` | no | Defaults to `SupportMate AI`. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | no | Target of the "Contact support" links. Defaults to `support@example.com`. |
| `REQUEST_TIMEOUT_MS` | no | Gemini request timeout. Default `20000`. |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | no | Default 20 requests per 60 seconds per IP. |

`.env.local` is git-ignored. If the key or model is missing, the API returns a clear "isn't configured" error and logs which variables are missing (names only).

## Local development

```bash
npm run dev          # http://localhost:3000
```

## Testing and quality checks

```bash
npm test             # Vitest, the LLM is mocked: no API key or quota needed
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run check        # typecheck + lint + tests
npm run build        # production build
npm run start        # serve the production build
```

The tests cover shipping, return and payment questions, an unknown product, empty and over-long messages, a misleading keyword, prompt injection, invalid model output, invalid source IDs, provider failure/quota/timeout, and rate limiting.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: SupportMate AI"
git branch -M main
git remote add origin https://github.com/<your-username>/supportmate-ai.git
git push -u origin main
```

Check `git status` first: `.env.local` must not appear.

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New... > Project** and import the repository. The Next.js preset is detected automatically.
3. Under **Environment Variables**, add `GEMINI_API_KEY` and `GEMINI_MODEL` (plus the optional ones you want).
4. Click **Deploy**.
5. Open the deployment URL and ask a suggested question to confirm the end-to-end flow.

Or with the CLI: `npx vercel`, then `npx vercel --prod`, and add the variables with `npx vercel env add`.

## Known limitations

- **Each question is answered independently.** Earlier messages are shown in the UI but are not sent to the model, so follow-ups such as "and what about refunds?" lack context.
- **Keyword retrieval is approximate.** It can miss paraphrases and can retrieve a misleading entry. Safeguards: score threshold, strict grounding instructions, and the `insufficientInformation` check. Embeddings would improve recall.
- **In-memory rate limiting** is per server instance. On Vercel (multiple instances, cold starts) the effective limit is looser than configured. For production use a shared store such as Upstash Redis or Vercel KV. The limiter trusts `x-forwarded-for`, which Vercel sets itself; behind other proxies make sure clients cannot spoof it.
- **localStorage** history is per browser and unencrypted. Do not ask customers to type sensitive data.
- Answers are limited to the sample FAQs. There is no order lookup, so questions about a specific order are answered only in general terms.
- The "Ready to help" indicator reflects the page loading, not a live health check of Gemini.

## Future enhancements

- Embedding-based semantic search behind the existing `retrieveFaqs` interface
- Send recent conversation turns for follow-up questions
- Streaming responses
- Shared rate limiting (Redis/KV) and per-user quotas
- Admin UI for editing FAQs, and answer feedback (thumbs up/down)
