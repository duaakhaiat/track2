# Architecture

This repository is organized around a simple modular layout so that applications and reusable code are easy to reason about.

## Layout

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
├── .gitignore
├── .npmrc
└── README.md
```

## Rules

- Keep runnable products in `apps/`.
- Keep reusable TypeScript packages in `packages/`.
- Keep automation and repository tooling in `tools/`.
- Store documentation and design notes in `docs/`.
- Keep repo-local dev files and generated artifacts out of the source tree.

## Why this structure

This layout prevents the workspace from feeling like a loose collection of demos and helper folders. It also keeps shared code separate from product interfaces and makes the monorepo easier to scale.
