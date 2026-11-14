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
