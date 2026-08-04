# Property Manager

Property Manager is an invite-only commercial rent tracker for small landlords.
Each client signs in with Google and operates an isolated workspace containing
its leases, monthly rent obligations, payments, notes, and tenant-email settings.

Production: <https://property-management-app-virid.vercel.app>

## Documentation

- [AGENTS.md](AGENTS.md): automatic agent entrypoint and non-negotiable rules
- [Product contract](docs/product.md): supported journeys and current language
- [Architecture contract](docs/architecture.md): data, financial, auth, and
  security invariants
- [Operations](docs/operations.md): deployment, migrations, providers, QA,
  backups, and incident controls

These are the only durable project documents. Delivery procedure belongs to the
installed Software Factory/gstack skills rather than this repository.

## Local development

Requirements: Node.js, pnpm, PostgreSQL/Supabase configuration, and the variables
documented in [Operations](docs/operations.md).

```bash
pnpm install
pnpm exec prisma validate
pnpm dev
```

The app runs at <http://localhost:3000>. Useful verification commands:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Create development migrations with `pnpm exec prisma migrate dev`. Apply
checked-in migrations to a deployed environment only through the procedure in
[Operations](docs/operations.md).
