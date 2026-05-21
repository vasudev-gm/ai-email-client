# Architecture Documentation

## System Overview

AI Email Client is a Next.js 16 Progressive Web App (PWA) that provides a unified interface for managing email across multiple providers (Gmail, Outlook, IMAP) with AI-powered features.

## Component Hierarchy

``` bash
app/layout.tsx (RootLayout)
└── app/providers.tsx (SessionProvider + QueryClientProvider)
    └── app/page.tsx (Home — main shell)
        ├── components/Sidebar.tsx
        ├── components/SearchBar.tsx
        ├── components/AccountSwitcher.tsx
        ├── components/EmailList.tsx
        ├── components/EmailViewer.tsx
        │   ├── components/AISummary.tsx
        │   └── components/ReplyDraft.tsx
        └── components/Composer.tsx
```

## Data Flow

``` bash
User Action → Zustand Store (emailStore.ts)
           → React useEffect triggers fetch
           → Next.js API Route (/api/emails/*)
           → MOCK_EMAILS (demo) or real provider
           → Component state update → UI re-render
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/emails` | GET | List emails (folder, search params) |
| `/api/emails/[id]` | GET | Get single email |
| `/api/emails/[id]` | PATCH | Update email (read, starred, etc.) |
| `/api/emails/[id]` | DELETE | Delete email |
| `/api/emails/[id]/ai` | POST | AI actions: summarize, draft, prioritize |
| `/api/compose` | POST | Send email |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js handlers |

## Database Schema

```
User ──< Account ──< Email ──< EmailLabel >── Label
User ──< UserSettings
```

- **User**: Authentication entity (linked to NextAuth)
- **Account**: Email provider connection (IMAP credentials, OAuth tokens)
- **Email**: Cached email messages with AI-enriched fields
- **Label**: User-defined tags for emails
- **UserSettings**: Per-user configuration (theme, AI preferences)

## AI Integration

All AI features are in `lib/ai.ts` using `@anthropic-ai/sdk`:

1. **Summarize** (`summarizeEmail`): 2-3 sentence summary of email content
2. **Draft Reply** (`generateReplyDraft`): Professional reply draft
3. **Prioritize** (`prioritizeEmail`): 1-5 urgency score

AI features gracefully degrade when `ANTHROPIC_API_KEY` is not set.

## Authentication Flow

```
Login Page → NextAuth.js → Provider OAuth / IMAP Credentials
          → JWT Session → session.user.id available in API routes
```

Supported providers:
- Google OAuth (Gmail)
- Microsoft Entra ID (Outlook/Exchange)
- Custom Credentials (IMAP/SMTP with any provider)

## PWA Setup

- `public/manifest.json`: App metadata, icons, display mode
- `public/sw.js`: Service worker for offline caching
- `app/layout.tsx`: Registers manifest and sets viewport meta tags
- Security headers set in `next.config.ts` for sw.js

## Mobile-First Responsive Design

| Screen | Layout |
|--------|--------|
| Mobile (`< md`) | Single panel: list or viewer, hamburger sidebar |
| Tablet (`md`) | Two panels: list + viewer, hamburger sidebar |
| Desktop (`lg+`) | Three panels: sidebar + list + viewer |

## State Management (Zustand)

`store/emailStore.ts` holds:
- `selectedEmailId` — currently viewed email
- `currentFolder` — active folder (INBOX, SENT, etc.)
- `searchQuery` — debounced search string
- `isComposeOpen` — compose modal visibility
- `isSidebarOpen` — mobile sidebar toggle
