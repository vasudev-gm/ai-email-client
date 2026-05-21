<!-- BEGIN:nextjs-agent-rules -->
# AI Email Client — Multi-Agent Development Guide

## Next.js Version Notice

This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Supported AI Coding Agents

This codebase is designed to work with multiple AI coding assistants:

### Primary Agents

- **Claude Code CLI** — Primary development environment, full feature support
- **GitHub Copilot** — Inline suggestions, code completion, chat interface
- **OpenAI Codex** — Code generation and completion via API

### Compatible Agents

- **Antigravity** — Works with standard Next.js patterns
- **Cursor** — Full IDE integration support
- **Tabnine** — Code completion and suggestions
- **Amazon CodeWhisperer** — AWS-optimized suggestions
- **Codeium** — Free alternative with good Next.js support

## Quick Start for Any Agent

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (choose your AI provider)
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY or OPENAI_API_KEY

# 3. Initialize database
npx prisma generate
npx prisma db push

# 4. Run development server
npm run dev

# 5. Run tests
npm test
```

## Key Conventions for All Agents

### Next.js 15 Breaking Changes

- **Dynamic route params are Promises**: Always `await params` in route handlers

  ```typescript
  // ❌ Wrong
  export async function GET(req: Request, { params }: { params: { id: string } }) {
    const id = params.id
  }

  // ✅ Correct
  export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  }
  ```

### AI Provider System

- Multi-provider support: Anthropic Claude, OpenAI, or local fallback
- Automatic provider selection based on available API keys
- All AI functions in `lib/ai.ts` gracefully degrade
- To add new providers, follow the pattern in `lib/ai.ts`

### File Structure

``` bash
app/                  # Next.js App Router
  api/                # API routes
  (auth)/             # Auth pages
  layout.tsx          # Root layout
  page.tsx            # Main app

components/           # React components
lib/                  # Utilities and services
store/                # Zustand state management
prisma/               # Database schema
__tests__/            # Jest tests
```

### Development Workflow

1. Make changes to code
2. Run `npm run build` to check for TypeScript errors
3. Run `npm test` to verify tests pass
4. Test manually with `npm run dev`

### Testing

- Jest + React Testing Library
- Run all tests: `npm test`
- Run in watch mode: `npm test -- --watch`
- Test files in `__tests__/` directory

### Database

- Prisma ORM with SQLite (dev) or PostgreSQL (prod)
- After schema changes: `npx prisma generate && npx prisma db push`
- View data: `npx prisma studio`

## Agent-Specific Tips

### For Claude Code CLI

- Use the full context window for complex refactoring
- Leverage multi-file editing capabilities
- Ask for architectural guidance when needed

### For GitHub Copilot

- Use inline suggestions for component boilerplate
- Chat interface for explaining complex logic
- Good for writing tests and documentation

### For OpenAI Codex

- Works well with the OpenAI runtime provider
- Can use same API key for development and runtime
- Good for API route generation

### For Other Agents

- Follow standard Next.js 15 patterns
- Refer to `CLAUDE.md` for detailed conventions
- Check `docs/ARCHITECTURE.md` for system design

## Common Tasks

### Adding a New Component

1. Create file in `components/`
2. Use TypeScript with proper types
3. Style with Tailwind CSS
4. Add tests in `__tests__/components/`

### Adding a New API Route

1. Create file in `app/api/`
2. Use Next.js 15 route handler pattern
3. Handle errors gracefully
4. Add tests if complex logic

### Modifying AI Features

1. Edit `lib/ai.ts`
2. Maintain multi-provider support
3. Keep fallback logic intact
4. Test with and without API keys

### Database Changes

1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (dev) or create migration (prod)
4. Update related TypeScript types

## Troubleshooting

### Build Errors

- Check TypeScript errors: `npm run build`
- Verify all imports are correct
- Check for Next.js 15 breaking changes

### Test Failures

- Run tests: `npm test`
- Check test output for specific failures
- Verify mock data in `lib/email-utils.ts`

### AI Features Not Working

- Check if API keys are set in `.env`
- Verify provider is available (check console logs)
- Local fallback should always work

### Database Issues

- Delete `prisma/dev.db` and run `npx prisma db push`
- Check `DATABASE_URL` in `.env`
- Verify Prisma client is generated

## Documentation

- **CLAUDE.md** — Detailed development guide, conventions, AI provider setup
- **docs/ARCHITECTURE.md** — System architecture, component hierarchy, data flow
- **README.md** — User-facing documentation, setup instructions

## Support

For issues or questions:

1. Check existing documentation
2. Review test files for examples
3. Check Next.js 15 documentation
4. Review Prisma documentation for database issues

<!-- END:nextjs-agent-rules -->
