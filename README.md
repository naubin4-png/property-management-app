# Property Management App

Commercial lease rent tracker for a single owner portfolio.

## Stack

- Next.js 15 App Router
- TypeScript
- pnpm
- Prisma with PostgreSQL on Supabase
- Supabase Auth
- shadcn/ui with Tailwind CSS

## Development

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Database

```bash
pnpm exec prisma validate
pnpm exec prisma migrate dev
```
