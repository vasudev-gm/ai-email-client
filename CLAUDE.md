@AGENTS.md

# AI Email Client — Agent Documentation

## Project Overview

AI-first universal email client built as a mobile-ready PWA with Next.js 16 App Router.  
Supports Gmail, Outlook (Microsoft 365), and IMAP/SMTP email accounts with AI-powered features via multiple AI providers (Anthropic Claude, OpenAI, or local fallback).

## Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest test suite
npm test -- --watch  # Run tests in watch mode
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema to local SQLite database
npx prisma studio    # Open Prisma Studio GUI
```

## Architecture

### Stack
- **Framework**: Next.js 16 App Router (TypeScript, Tailwind CSS)
- **Auth**: NextAuth.js v5 (beta) — Google, Microsoft Entra ID, IMAP Credentials
- **Database**: Prisma ORM + SQLite (dev) — see `prisma/schema.prisma`
- **AI**: Multi-provider support via `lib/ai.ts`:
  - **Anthropic Claude** (`claude-opus-4-5`) — primary provider
  - **OpenAI** (GPT-4o, GPT-4-turbo, GPT-3.5-turbo) — alternative provider
  - **Local SLM** — keyword-based fallback when no API keys are set
- **State**: Zustand (`store/emailStore.ts`)
- **Data fetching**: TanStack React Query
- **Testing**: Jest + React Testing Library

### Directory Structure
```
app/                  # Next.js App Router pages and API routes
  api/
    auth/[...nextauth]/ # NextAuth.js handler
    emails/           # Email list and CRUD endpoints
    emails/[id]/      # Single email endpoints
    emails/[id]/ai/   # AI actions (summarize, draft, prioritize)
    compose/          # Send email endpoint
  (auth)/login/       # Login page
  layout.tsx          # Root layout with Providers
  page.tsx            # Main email client page
  providers.tsx       # SessionProvider + QueryClientProvider

components/           # React UI components
  Sidebar.tsx         # Folder navigation
  EmailList.tsx       # Email list panel
  EmailViewer.tsx     # Email detail view
  Composer.tsx        # Compose modal
  AISummary.tsx       # AI summary panel
  ReplyDraft.tsx      # AI reply draft panel
  SearchBar.tsx       # Search with debounce
  AccountSwitcher.tsx # Multi-account dropdown

lib/                  # Shared utilities and services
  ai.ts               # Multi-provider AI functions (Anthropic, OpenAI, local)
  auth.ts             # NextAuth configuration
  email-utils.ts      # Email helpers + MOCK_EMAILS
  gmail.ts            # Gmail API stub
  outlook.ts          # Outlook API stub
  imap.ts             # IMAP stub
  prisma.ts           # Prisma client singleton

store/
  emailStore.ts       # Zustand global state

types/
  next-auth.d.ts      # Session type augmentation

prisma/
  schema.prisma       # Database schema

public/
  manifest.json       # PWA manifest
  sw.js               # Service worker

__tests__/            # Jest test suites
```

## Key Conventions

- **API route params**: In Next.js 15, route params are `Promise<{ id: string }>` — always `await params`.
- **No direct imapflow import**: `lib/imap.ts` only defines interfaces and stub functions.
- **MOCK_EMAILS**: Used for demo mode — all API routes use this data. Real email fetching goes in `lib/gmail.ts`, `lib/outlook.ts`, `lib/imap.ts`.
- **AI multi-provider**: `lib/ai.ts` automatically selects provider based on available API keys (Anthropic → OpenAI → local fallback). All AI functions gracefully degrade to local heuristics when no API keys are set.
- **useCallback for async fetch functions**: Used in `AISummary.tsx` and `ReplyDraft.tsx` to satisfy `react-hooks/exhaustive-deps`.
- **Mobile-first**: Sidebar is hidden on mobile (hamburger menu), email list hides when email is selected.

## Environment Variables

Copy `.env.example` to `.env` and fill in values:
- `DATABASE_URL` — SQLite path or PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random secret for session encryption
- **AI Provider Keys** (choose one or leave all empty for local fallback):
  - `ANTHROPIC_API_KEY` — Anthropic Claude API key (recommended)
  - `OPENAI_API_KEY` — OpenAI API key (alternative)
  - `OPENAI_MODEL` — Optional: specify model (gpt-4o, gpt-4-turbo, gpt-3.5-turbo)
- `GOOGLE_CLIENT_ID/SECRET` — For Google OAuth
- `MICROSOFT_CLIENT_ID/SECRET` — For Microsoft OAuth

**AI Provider Priority**: The system automatically selects the first available provider in this order:
1. Anthropic Claude (if `ANTHROPIC_API_KEY` is set)
2. OpenAI (if `OPENAI_API_KEY` is set)
3. Local fallback modes:
   - Keyword heuristics (always available)
   - True local SLM via `@xenova/transformers` (downloaded on first use with progress)

## AI Agent Guidelines

### For All AI Agents (Claude Code, GitHub Copilot, OpenAI Codex, Antigravity, etc.)

- Always run `npm run build` after changes to catch TypeScript errors.
- Always run `npm test` to verify tests pass.
- After modifying `prisma/schema.prisma`, run `npx prisma generate`.
- When adding new API routes with dynamic segments, use `params: Promise<{ id: string }>` pattern.
- Do not install `next-pwa` or `workbox-webpack-plugin`.
- Keep AI prompts in `lib/ai.ts` — do not scatter API calls across components.

### AI Provider Configuration

The application supports multiple AI providers with automatic fallback:

1. **Anthropic Claude** (Primary)
   - Set `ANTHROPIC_API_KEY` in `.env`
   - Uses `claude-opus-4-5` model
   - Best for high-quality summaries and drafts

2. **OpenAI** (Alternative)
   - Set `OPENAI_API_KEY` in `.env`
   - Optionally set `OPENAI_MODEL` (default: `gpt-4o`)
   - Supports: gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.
   - Install with: `npm install openai` (optional dependency)

3. **Local fallback** (Fallback)
   - No API key required
   - Heuristic mode is always available
   - True local SLM mode is available when `@xenova/transformers` is installed
   - UI exposes mode switch and model download progress

### Adding New AI Providers

To add support for additional AI providers (e.g., Cohere, Hugging Face, local models):

1. Add provider detection in `getAIProvider()` function
2. Implement provider-specific functions (e.g., `cohereSummarize()`)
3. Add case to switch statements in public API functions
4. Update environment variables in `.env.example`
5. Document in this file

### Agent-Specific Notes

**Claude Code CLI**: This is the primary development environment. All features are optimized for Claude.

**GitHub Copilot**: Works seamlessly with the codebase. Use inline suggestions for component development.

**OpenAI Codex**: Compatible with the multi-provider AI system. Can use OpenAI as both the development assistant and the runtime AI provider.

**Antigravity / Other Agents**: Follow the standard Next.js 15 conventions documented above. The codebase uses standard patterns that work with any AI coding assistant.
