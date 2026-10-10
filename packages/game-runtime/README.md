# Game runtime

`@ancadeba/game-runtime` is the shared package for game execution code used by
the engine application and editor previews. It currently provides the package
scaffold and an empty public entry point, ready for runtime implementation.

Place implementation modules in `src` and export their public APIs from
`src/index.ts`. The engine and editor UI both declare this package as a
`workspace:*` dependency.

Keep reusable game execution logic here, shared game definitions in
`@ancadeba/schemas`, and general helpers in `@ancadeba/utilities`. Inject rendering,
input, timing, and other platform services so runtime logic can be tested outside
the browser. The TypeScript configuration starts with standard ECMAScript types.

Development uses the `@ancadeba/source` export condition. Production consumers
resolve compiled ESM and TypeScript declarations from `dist`.

```sh
pnpm --filter @ancadeba/game-runtime typecheck
pnpm --filter @ancadeba/game-runtime... build
```

Add runtime tests under the repository's `tests/packages/game-runtime` folder.
The root test suite already has a dependency on this package and discovers
`tests/**/*.test.{ts,tsx}`.
