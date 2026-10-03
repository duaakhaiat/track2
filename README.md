# Track 2

A TypeScript monorepo for the workspace's API, database, and front-end artifacts.

## Recommended project structure

The project is currently centered in `track2-main/`, but the long-term architecture should be simplified to the following layout:

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
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
├── README.md
├── .gitignore
├── .npmrc
└── .replit* (development-only, not committed)
```

## Why this cleanup matters

- The repo was using a nested `track2-main/` wrapper that made the codebase feel heavier than it is.
- Several build and dev-only files (`.replit`, `.replitignore`, local caches) should not be versioned.
- Large asset bundles and screenshots should be treated as generated or external resources instead of core source files.
- Shared code should live in `packages/`, while runnable apps should live in `apps/`.

## Cleanup performed

- Added ignore rules for generated/local development artifacts in `track2-main/.gitignore`.
- Added a project architecture document at `track2-main/docs/architecture.md`.
- Marked `attached_assets/` as non-source material for the repo.

## Active development folders

```text
track2-main/artifacts/
├── api-server/
├── mockup-sandbox/
└── wifi-game/
```

These are the active app artifacts in the current workspace and should remain the main focus of future development.
