# Ancadeba

A pnpm workspace with two TypeScript/React applications, a small TypeScript/Node
server, and shared schemas and utilities.

## Requirements

- Node.js 24
- pnpm 11.5.1 (pinned in `package.json`)

## Getting started

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts all three applications:

| Workspace | Purpose | Development URL |
| --- | --- | --- |
| `apps/engine` | React engine application | http://localhost:5173 |
| `apps/editor-ui` | React editor application | http://localhost:5174 |
| `apps/editor-server` | Node HTTP API | http://127.0.0.1:3000 |
| `packages/schemas` | Zod schemas and inferred TypeScript types | Shared package |
| `packages/utilities` | Shared functions consuming schema types | Shared package |

Use `pnpm dev:engine`, `pnpm dev:editor-ui`, or `pnpm dev:editor-server` to
start one application. The editor UI development server proxies `/api` requests
to the editor server. The API exposes `GET /api/health` and `GET /api/project`.
The initial React screens render sample project data locally.

The server accepts `HOST` and `PORT` environment variables, defaulting to
`127.0.0.1` and `3000`. If you change the server address, update the editor UI's
proxy in `apps/editor-ui/vite.config.ts`.

## Checks and production builds

```sh
pnpm lint
pnpm test
pnpm build
```

- `lint` checks JavaScript/TypeScript style and typechecks every workspace.
- `test` runs the shared package, React rendering, and HTTP integration tests.
- `build` builds packages before their dependents and writes each workspace's
  production output to its own `dist` directory.

TypeScript 6 is used to match the supported range of the ESLint TypeScript
tooling. JavaScript and TypeScript use single quotes and omit semicolons; JSON
uses its required double-quote syntax.

After building, start the API with `pnpm --filter @ancadeba/editor-server start`.
Preview the React builds with `pnpm --filter @ancadeba/engine preview` or
`pnpm --filter @ancadeba/editor-ui preview`. Vite's `/api` proxy is for development;
a production deployment must route API requests to the server separately.

## VS Code formatting

Open the repository root in VS Code and install the recommended Prettier and
ESLint extensions. JavaScript, JSX, TypeScript, and TSX files format automatically
on save using Prettier, with two-space indentation, single quotes, and no
semicolons. ESLint also applies available fixes on explicit saves such as Ctrl+S.

The workspace settings are in `.vscode/settings.json`, and the formatting rules
are in `.prettierrc.json`. The extension uses the project's local Prettier
dependency after `pnpm install`.

## Sharing code

Apps depend on `@ancadeba/schemas` and `@ancadeba/utilities` using `workspace:*`.
Export shared APIs from each package's `src/index.ts`, then import them by
package name:

```ts
import { projectSchema, type Project } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'
```

The private `@ancadeba/source` export condition lets Vite, Vitest, TypeScript
typechecking, and the server's development runner resolve shared source directly.
Development and tests work before a build, and source edits are watched without
a separate package build process. Production Node builds resolve the compiled
shared JavaScript and declarations instead. To build just the server and its
dependencies, run `pnpm --filter @ancadeba/editor-server... build`.

`docs` and `sample-games` are reserved for documentation and game assets. They
are not workspace packages; add a package manifest and a workspace glob if a
sample game later needs its own tooling.
