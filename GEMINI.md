# Gemini Knowledge Base: Sistema de Recadastramento IPTU

This document is the central knowledge base for the Gemini CLI agent working on this project. It contains a summary of the project architecture, key file locations, and a development roadmap.

## 1. Project Overview

The project is a full-stack web application designed for municipal property re-registration. It enables field agents to collect property data, even offline, and syncs it with a central server. Key features include offline-first data collection, dual authentication (Replit OIDC for agents, local credentials for admins), dynamic form management, and an AI service for learning municipal data patterns (BIC) to assist with data entry.

## 2. Architecture Summary

-   **Frontend**: React (Vite + TypeScript), `wouter` for routing, TanStack Query for server state, and `shadcn/ui` for components.
-   **Backend**: Node.js with Express and TypeScript.
-   **Database**: PostgreSQL (hosted on Neon), managed with Drizzle ORM.
-   **Shared Code**: A `shared/` directory contains the Drizzle schema (`shared/schema.ts`), ensuring type safety between the frontend and backend.
-   **Authentication**: Replit OIDC for general users and a local Passport.js strategy for administrators.
-   **File Storage**: Google Cloud Storage, managed via `server/objectStorage.ts`.

## 3. Key File Locations

-   **API Routes**: `server/routes.ts`
-   **Database Schema**: `shared/schema.ts`
-   **Database Access Logic**: `server/storage.ts`
-   **Authentication Logic**: `server/replitAuth.ts` & `server/localAuth.ts`
-   **AI Logic**: `server/aiMatcher.ts` & `server/bicPatternLearning.ts`
-   **Frontend Entrypoint & Routing**: `client/src/main.tsx` & `client/src/App.tsx`
-   **Main Frontend Components**: `client/src/pages/` & `client/src/components/`
-   **Offline Logic**: `client/src/lib/offlineStorage.ts`, `client/src/lib/offlineAuth.ts`, `client/src/lib/mapCache.ts`

## 4. Development Roadmap

This roadmap is prioritized based on the analysis in `DOCUMENTATION_DEV.md`.

### Priority 1: Critical Fixes & Core Logic

*These items address major security and data integrity risks and must be completed first.*

-   **[SECURITY]** Harden application security.
-   **[DATA]** Implement a robust, idempotent synchronization pipeline.
-   **[AI]** Implement persistence for the AI learning model.
-   **[TESTING]** Set up an initial testing framework.

### Priority 2: Feature Completion

*These items involve finishing features that are currently mocked or incomplete.*

-   **[ENHANCEMENT]** Convert the application into a full Progressive Web App (PWA) to ensure it's installable and the app shell works fully offline.
-   **[DB]** Formalize the database migration process. Move from `db:push` to generating and applying version-controlled migration files for production safety.
-   **[BACKEND]** Complete server-side processing for Shapefile and municipal data uploads.
-   **[FRONTEND]** Replace all mocked data in UI components (Admin Dashboard, etc.) with live API calls.
-   **[FEATURE]** Implement photo deletion functionality.

### Priority 3: New Features & Enhancements

*Based on the original `README.md` roadmap, these can be tackled after the core application is stable.*

-   **[FEATURE]** Advanced User and Team Management: Build a UI for admins to invite, deactivate, and manage roles/teams for users.
-   **[FEATURE]** Implement OCR for scanning physical documents.
-   **[FEATURE]** Develop advanced reporting and analytics dashboards.
-   **[DOCS]** Automated API Documentation: Generate interactive API documentation using a standard like OpenAPI/Swagger.
-   **[INFRA]** Structured Logging for the Backend: Integrate a library like Pino or Winston for production-grade, searchable logs.
-   **[INFRA]** Establish CI/CD pipelines using GitHub Actions.
-   **[INFRA]** Create a Docker setup for simplified deployment.
-   **[MONITORING]** Integrate a monitoring service like Sentry.
-   **[FEATURE]** Mobile API for native app (from original README).
-   **[CACHE]** Cache Redis for performance (from original README).

---

## 5. Immediate TODO List

This is a granular, actionable list of immediate tasks.

-   [ ] **Task**: Remove hard-coded fallback session secret.
    -   **File**: `server/localAuth.ts`
    -   **Action**: Modify the code to throw an error on startup if `process.env.SESSION_SECRET` is not set.

-   [ ] **Task**: Remove weak default credentials from documentation.
    -   **File**: `README.md`
    -   **Action**: Delete the `admin`/`admin123` credentials and add instructions for creating a secure admin user.

-   [ ] **Task**: Implement idempotency for data synchronization.
    -   **Files**: `client/src/lib/offlineStorage.ts`, `server/routes.ts`, `server/storage.ts`
    -   **Action**: Modify the client to generate a UUID for new offline records. Modify the backend creation endpoints (`/api/property-collections`) to use this client-provided ID as the primary key, preventing duplicate insertions.

-   [ ] **Task**: Implement backend sync processing logic.
    -   **File**: `server/routes.ts`
    -   **Action**: Replace the mock logic in `/api/sync/process` with a real implementation that iterates through the sync queue and sends data to the correct endpoints.

-   [ ] **Task**: Create a database table for AI patterns.
    -   **File**: `shared/schema.ts`
    -   **Action**: Define a new table, `bic_patterns`, to store the learned JSON patterns from the AI.

-   [ ] **Task**: Persist and load AI patterns.
    -   **File**: `server/bicPatternLearning.ts`
    -   **Action**: Implement the database logic to save new patterns to the `bic_patterns` table and load them when the server starts.

-   [ ] **Task**: Set up a testing framework.
    -   **Files**: `package.json`, create new test files.
    -   **Action**: Add Vitest/Jest to the project and create an initial test file (e.g., `example.test.ts`) to ensure the setup is working.

-   [ ] **Task**: Implement a service worker for PWA functionality.
    -   **Files**: `vite.config.ts`, `client/index.html`, create `public/manifest.json`.
    -   **Action**: Integrate a Vite PWA plugin (e.g., `vite-plugin-pwa`) to generate a service worker using Workbox. This will cache the application shell and assets, making the app fully functional offline.
