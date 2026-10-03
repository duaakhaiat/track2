# Track 2

This repository contains a TypeScript pnpm monorepo for a small, modular application platform. The active project code lives under `track2-main/`, which includes shared libraries, API contracts, database tooling, and several application artifacts.

## Overview

The workspace is organized around a shared TypeScript stack and pnpm workspaces:

- Shared API specs and generated client code
- Express-based backend service
- PostgreSQL data layer with Drizzle ORM
- UI mockup and browser-based game artifacts
- Build and type-check automation across packages

## Repository structure

```text
.
├── track2-main/
│   ├── artifacts/
│   │   ├── api-server/
│   │   ├── mockup-sandbox/
│   │   └── wifi-game/
│   ├── lib/
│   │   ├── api-client-react/
│   │   ├── api-spec/
│   │   ├── api-zod/
│   │   └── db/
│   ├── scripts/
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   ├── tsconfig.base.json
│   └── tsconfig.json
├── README.md
└── .gitignore
```

## Tech stack

- TypeScript 5.9
- pnpm workspaces
- Node.js 24
- Express 5
- PostgreSQL + Drizzle ORM
- Zod for validation
- Vite for frontend tooling
- esbuild for build pipeline

## Getting started

From the project root:

```bash
cd track2-main
pnpm install
```

Run a workspace-wide type check:

```bash
pnpm run typecheck
```

Build all packages:

```bash
pnpm run build
```

Run the API server locally:

```bash
pnpm --filter @workspace/api-server run dev
```

## Key commands

```bash
pnpm run typecheck   # full workspace typecheck
pnpm run build       # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen  # regenerate API artifacts
pnpm --filter @workspace/db run push            # push schema changes
pnpm --filter @workspace/api-server run dev    # start API server
```

## Notes

This repository is organized as a monorepo, so most development happens inside `track2-main/`. Each package manages its own dependencies while sharing the same workspace configuration and TypeScript settings.
