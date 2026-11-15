# Pocketwise Expense Tracker

Expo SDK 54, React Native, TypeScript, Expo Router and local SQLite. The app is offline-first; SQLite is the source of truth. Repository SQL belongs in `src/services/database/repositories`, and money is stored as integer minor units.

## Setup

```sh
npm install
```

If Expo reports package version mismatches after installing, run `npx expo install --fix` and review the changed versions against `package.json`.

## Build and run

```sh
npx expo start
npx expo start --android
npx expo start --ios
npx expo export --platform android
npx expo export --platform ios
```

Native simulator builds require the Android SDK or Xcode on the development machine.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
```

The Jest suite covers money/date utilities, domain validation, UI button behavior, and SQLite migrations/repository behavior using an in-memory `sql.js` adapter. Run `npm test -- --coverage` for coverage output.

## Project conventions

- Routes in `app/` delegate to screen code and use Expo Router.
- UI -> hooks -> domain services -> repositories -> SQLite; SQL is confined to repositories and migrations.
- Validate transaction inputs in `transactionService` before writes.
- Dates use local `YYYY-MM-DD` day keys. Amounts are integer minor units.
- After changing settings or data, invalidate the affected TanStack Query entries.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
