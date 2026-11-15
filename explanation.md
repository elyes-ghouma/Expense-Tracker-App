# Project Architecture & Technologies

Pocketwise is an offline-first expense tracker built with Expo SDK 54, React Native, TypeScript, and Expo Router. SQLite is the source of truth for financial records and persisted settings. TanStack Query manages asynchronous reads, mutations, and refreshes; Zustand holds lightweight app-wide preferences such as theme and currency.

The screen layer covers the dashboard, transaction history and entry, budgets, settings, and supporting onboarding and editing flows. Screens use shared UI components and data hooks. Hooks connect the UI to domain services, which apply transaction rules and coordinate analytics or database backup and restore. Repositories encapsulate SQLite reads and writes, keeping persistence details behind the service layer.

The overall data flow is **screens → hooks → domain services → repositories → SQLite**. Changes are written locally, then the relevant query data is invalidated so affected screens reflect the updated state. This structure keeps presentation, app state, business behavior, and persistence distinct while supporting offline use.
