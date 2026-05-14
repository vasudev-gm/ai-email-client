@AGENTS.md

# AI Email Client — CLAUDE.md

## Project Overview

AI-first universal email client built as a mobile-ready PWA with Next.js 16 App Router.  
Supports Gmail, Outlook (Microsoft 365), and IMAP/SMTP email accounts with AI-powered features via the Anthropic Claude API.

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
- **AI**: Anthropic Claude (`claude-opus-4-5`) via `@anthropic-ai/sdk`
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
  ai.ts               # Anthropic AI functions
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
- **AI graceful degradation**: All AI functions return fallback strings/numbers when `ANTHROPIC_API_KEY` is not set.
- **useCallback for async fetch functions**: Used in `AISummary.tsx` and `ReplyDraft.tsx` to satisfy `react-hooks/exhaustive-deps`.
- **Mobile-first**: Sidebar is hidden on mobile (hamburger menu), email list hides when email is selected.

## Environment Variables

Copy `.env.example` to `.env` and fill in values:
- `DATABASE_URL` — SQLite path or PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random secret for session encryption
- `ANTHROPIC_API_KEY` — Optional; AI features degrade gracefully without it
- `GOOGLE_CLIENT_ID/SECRET` — For Google OAuth
- `MICROSOFT_CLIENT_ID/SECRET` — For Microsoft OAuth

## AI Agent Guidelines

- Always run `npm run build` after changes to catch TypeScript errors.
- Always run `npm test` to verify tests pass.
- After modifying `prisma/schema.prisma`, run `npx prisma generate`.
- When adding new API routes with dynamic segments, use `params: Promise<{ id: string }>` pattern.
- Do not install `next-pwa` or `workbox-webpack-plugin`.
- Keep AI prompts in `lib/ai.ts` — do not scatter API calls across components.

