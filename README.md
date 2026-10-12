# Ancadeba

A pnpm workspace with two TypeScript/React applications, a small TypeScript/Node
server, and shared game runtime, schemas, and utilities packages.

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
| `packages/game-runtime` | Shared game execution package scaffold | Shared package |
| `packages/schemas` | Zod schemas and inferred TypeScript types | Shared package |
| `packages/utilities` | Shared functions consuming schema types | Shared package |

Use `pnpm dev:engine`, `pnpm dev:editor-ui`, or `pnpm dev:editor-server` to
start one application. The editor UI development server proxies `/api` requests
to the editor server. The API exposes `GET /api/health` and `GET /api/project`.
The engine renders sample project data locally. The editor loads its project
from `/api/project`, validates it with the shared project schema, and displays
loading and error states with a retry option.

The server accepts `HOST` and `PORT` environment variables, defaulting to
`127.0.0.1` and `3000`. The editor UI accepts the `EDITOR_API_TARGET` environment
variable for its development proxy, defaulting to `http://127.0.0.1:3000`.
Set it to the server's URL when using a different server address. These are
process environment variables; no shared `.env` file is needed.

## Running separate development instances

Keep `pnpm dev` running on its default ports and start additional instances on
other free ports. Run each command below in a separate PowerShell terminal:

```powershell
# Engine
pnpm --filter @ancadeba/engine dev --port 5273
```

```powershell
# Editor server
$env:PORT = '3100'
pnpm --filter @ancadeba/editor-server dev
```

```powershell
# Editor UI connected to the additional server
$env:EDITOR_API_TARGET = 'http://127.0.0.1:3100'
pnpm --filter @ancadeba/editor-ui dev --port 5274
```

Environment overrides apply to commands launched from those terminals. Keep the
terminal running the default `pnpm dev` separate. The existing `strictPort`
setting makes the React applications fail if the selected port is occupied.
Separate instances in this checkout share source files and hot-reload when they
change. Agent-specific instructions are recorded in `AGENTS.md`.

## Checks and production builds

```sh
pnpm lint
pnpm test
pnpm build
```

- `lint` checks JavaScript/TypeScript style and typechecks every workspace and
  the root `tests` folder.
- `test` runs the shared package, React rendering, and HTTP integration tests
  from `tests/apps` and `tests/packages`, mirroring the workspace layout.
- `build` builds packages before their dependents and writes each workspace's
  production output to its own `dist` directory.

TypeScript 6 is used to match the supported range of the ESLint TypeScript
tooling. JavaScript and TypeScript use single quotes and omit semicolons; JSON
uses its required double-quote syntax.

After building, start the API with `pnpm --filter @ancadeba/editor-server start`.
Preview the React builds with `pnpm --filter @ancadeba/engine preview` or
`pnpm --filter @ancadeba/editor-ui preview`. Vite's `/api` proxy is for development;
a production deployment must route API requests to the server separately.

## Browser tests

Install Playwright's Chromium browser once after installing dependencies:

```sh
pnpm test:e2e:install
pnpm test:e2e
```

Playwright tests live in `tests/e2e/engine` and `tests/e2e/editor` and use
`.spec.ts` filenames. Vitest continues to run `.test.ts` and `.test.tsx` files.
`pnpm lint` also typechecks the browser tests and Playwright configuration.

The runner starts its own development instances on these ports:

| Instance | Playwright port | `pnpm dev` port |
| --- | --- | --- |
| Engine | 5273 | 5173 |
| Editor UI | 5274 | 5174 |
| Editor API | 3100 | 3000 |

The test editor's proxy targets the test API. Playwright refuses to reuse an
existing server and stops only the instances it starts. If a test port is
occupied, choose another free port with `E2E_ENGINE_PORT`, `E2E_EDITOR_PORT`, or
`E2E_SERVER_PORT`. The configuration rejects duplicate ports and the three
reserved `pnpm dev` ports.

For example, in a separate PowerShell terminal:

```powershell
$env:E2E_ENGINE_PORT = '5373'
$env:E2E_EDITOR_PORT = '5374'
$env:E2E_SERVER_PORT = '3200'
pnpm test:e2e
```

Run just one application with `pnpm test:e2e --project=engine` or
`pnpm test:e2e --project=editor`. Use `pnpm test:e2e:headed` to see the browser,
`pnpm test:e2e:ui` for Playwright's interactive runner, and
`pnpm test:e2e:report` to inspect the HTML report. Failed tests retain traces and
screenshots under `test-results`; generated artifacts are ignored by Git.

The initial tests cover both application screens, browser errors, and the
editor's API proxy. Add editing and gameplay scenarios as those features become
available.

## VS Code formatting

Open the repository root in VS Code and install the recommended Prettier and
ESLint extensions. JavaScript, JSX, TypeScript, and TSX files format automatically
on save using Prettier, with two-space indentation, single quotes, and no
semicolons. ESLint also applies available fixes on explicit saves such as Ctrl+S.

The workspace settings are in `.vscode/settings.json`, and the formatting rules
are in `.prettierrc.json`. The extension uses the project's local Prettier
dependency after `pnpm install`.

## Sharing code

The engine and editor UI also depend on `@ancadeba/game-runtime`. Its scaffold
is ready for reusable game execution code and editor previews. Export runtime
APIs from `packages/game-runtime/src/index.ts` and place its tests under
`tests/packages/game-runtime`. See `packages/game-runtime/README.md` for package
boundaries and build commands.

Apps depend on `@ancadeba/schemas` and `@ancadeba/utilities` using `workspace:*`.
Export shared APIs from each package's `src/index.ts`, then import them by
package name:

```ts
import { projectSchema, type Project } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'
```

The utilities package also exports its container, factory types, console logger,
logger factories, and message formatter. Applications can import these shared
APIs directly from the package root:

```ts
import { Container, loggerFactories, type LoggerServices } from '@ancadeba/utilities'

const container = new Container<LoggerServices>(loggerFactories)
const logger = container.resolve('logger')
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
