# Pocketwise Expense Tracker

Pocketwise is an offline-first personal expense tracker built with Expo SDK 54, React Native, TypeScript, Expo Router, and SQLite. SQLite is the source of truth. Amounts are stored as integer minor units (for example, cents), and transaction dates use local `YYYY-MM-DD` day keys.

## Project overview and architecture

Pocketwise uses Expo SDK 54, React Native, TypeScript, Expo Router, SQLite, TanStack Query, and Zustand. The app is offline-first: SQLite is the source of truth for transactions, categories, budgets, and persisted settings. Money is stored in integer minor units, and dates use local `YYYY-MM-DD` day keys.

Expo Router screens provide the dashboard, transaction history, budgets, settings, and transaction entry, with supporting onboarding and category/budget editing flows. Screens use shared hooks and TanStack Query to read and mutate local data. Domain services handle rules and coordinated work such as transaction validation, analytics, and database backup/restore; repositories encapsulate SQLite access. Zustand holds lightweight app-wide presentation preferences, while persisted settings are loaded from SQLite. The resulting flow is **screens → hooks → domain services → repositories → SQLite**, with query invalidation keeping views current after changes. Shared UI components provide consistent presentation across routes.

The test suite uses Jest and includes an in-memory `sql.js` adapter for SQLite migration and repository behavior.

Core features include income and expense tracking, categories, monthly budgets, dashboard totals and analytics, configurable currency and theme, and SQLite backup and restore.

## Prerequisites and setup

- Node.js and npm
- Android Studio/Android SDK for Android emulator or native builds
- Xcode on macOS for iOS simulator or native builds
- An Expo account and EAS CLI for cloud builds

Install dependencies from the repository root:

```sh
npm install
```

The app does not require environment variables for its local development or standard EAS build configuration. User preferences and financial data are stored locally in SQLite.

If Expo reports SDK package version mismatches after installation, run:

```sh
npx expo install --fix
```

Review any resulting dependency changes before committing them.

## Run and test

Start the development server:

```sh
npm start
```

Other available commands:

```sh
npm run android       # Start Expo and open Android
npm run ios           # Start Expo and open iOS
npm run web           # Start the web target
npm run typecheck     # TypeScript check
npm run lint          # ESLint
npm test              # Jest suite
npm test -- --coverage
```

For Expo Go, start the development server in tunnel mode:

```sh
npx expo start --tunnel
```

Tunnel mode is required for this project to bypass local network and firewall routing issues that can prevent a phone from reaching the development server in LAN mode. Install an Expo Go version compatible with SDK 54, then scan the QR code shown by Expo. If a stale Metro cache is suspected, restart with `npx expo start --tunnel --clear`. Native simulator builds require the corresponding Android SDK or Xcode installation.

## Build an installable Android APK

The EAS preview profile below creates an installable APK for internal testing. EAS cloud builds require an Expo account and an EAS project linked to this app. If the project has not been linked yet, run `npx eas-cli project:init` and follow the prompts; this adds the EAS project ID to the Expo app configuration.

Install or invoke EAS CLI:

```sh
npx eas-cli login
npx eas-cli build:configure
```

From the repository root, start the Android preview build:

```sh
npx eas-cli build -p android --profile preview
```

When the build completes, use the build page or the URL printed by EAS to download and install the APK. For a release intended for the Play Store, use an AAB production build profile instead of this APK preview profile.
