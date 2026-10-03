# Track 2

Track 2 is a TypeScript monorepo for a set of internal tools, API infrastructure, and interactive web experiments. The workspace is structured to keep reusable packages separate from runnable apps and project tooling.

## Overview

This repository currently contains:

- `apps/api-server`: Express-based API server
- `apps/mockup-sandbox`: UI mockup sandbox and design exploration app
- `apps/wifi-game`: interactive browser game built with React, Vite, and Three.js
- `packages/*`: shared libraries for DB access, generated client code, OpenAPI schema tooling, and validation
- `tools/scripts`: repository utility scripts
- `docs/`: architecture and project documentation

## Repository layout

```text
track2-main/
├── apps/
│   ├── api-server/
│   ├── mockup-sandbox/
│   └── wifi-game/
├── packages/
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/
├── tools/
│   └── scripts/
├── docs/
│   └── architecture.md
├── .gitignore
├── .npmrc
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── node_modules/   # local dependency install only
```

## Getting started

Install dependencies:

```bash
pnpm install
```

Run the workspace typecheck:

```bash
pnpm run typecheck
```

Build the workspace:

```bash
pnpm run build
```

## App notes

### API server

```bash
cd apps/api-server
pnpm run dev
```

### Mockup sandbox

```bash
cd apps/mockup-sandbox
pnpm run dev
```

### WiFi game

```bash
cd apps/wifi-game
pnpm run dev
```

## Project conventions

- Keep user-facing apps under `apps/`
- Keep reusable/shared code under `packages/`
- Keep scripts and maintainer tooling under `tools/`
- Keep docs and architecture notes under `docs/`
- Avoid checking in local dev artifacts, generated caches, or editor metadata

## Notes

This workspace is intended to be a clean monorepo foundation for UI experiments, API work, and shared TypeScript packages. The structure is designed to make future expansion easier without mixing app code and reusable libraries together.
