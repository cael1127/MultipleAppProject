# Multi-App Expo Workspace

This workspace houses five Expo apps plus an Express/Prisma API that share a design system, auth flow, and storytelling polish. Each concept is positioned like a launch-ready case study for portfolios or demos.

## Showcase Apps

| App | Headline capabilities | One-command launch |
| --- | --- | --- |
| `apps/secure-guard` | **SecureGuard Sentinel** – Vibe-coding security training with incident queue, heuristic lab, and backend-linked progress. | `npm run dev:secure-guard` |
| `apps/ai-assistant` | **Nova Control Surface** – Automation studio featuring workflow builder, guardrail simulator, and voice capsule logger. | `npm run dev:nova` |
| `apps/wellness-companion` | **Bloom Daily Edition** – Adaptive energy coach with wearable snapshots, journaling, and recovery playbooks. | `npm run dev:bloom` |
| `apps/budget-buddy` | **LedgerLoop Planner** – Cashflow forecasting, savings autopilot, and scenario planning tied to API data. | `npm run dev:ledger` |
| `apps/study-hub` | **StudyForge Command Deck** – AI tutor snapshots, cohort rooms, and sprint timelines backed by shared services. | `npm run dev:study` |

> Each script boots the API and Expo dev server together. Swap `dev:<app>` for `android`, `ios`, or `web` on the workspace package if you want a specific platform only.

## Getting Started

1. **Install dependencies**
   ```sh
   npm install
   ```
2. **Launch an app + API**
   ```sh
   npm run dev:secure-guard
   ```
   Replace the script suffix with `nova`, `bloom`, `ledger`, or `study` to explore the other verticals.
3. **Target specific platforms** (after the initial boot)
   ```sh
   npm run android --workspace @multiapps/secure-guard
   npm run web --workspace @multiapps/ai-assistant
   npm run ios --workspace @multiapps/wellness-companion
   ```
4. **Run the API on its own**
   ```sh
   npm run api:dev
   ```

## Architecture & Tooling

- **Shared design system** – `packages/common` exports gradients, palettes, persona data, navigation tabs, modals, charts, toast provider, and the `useApi` hook.
- **Backend services** – `services/api` uses Express, Prisma (SQLite dev), JWT auth, and seeded domain data for each app (security incidents, workflows, wellness snapshots, finance accounts, study sprints).
- **TypeScript-first** – strict configs in `tsconfig.base.json`, workspaces share path aliases, and API uses `moduleResolution: nodenext` for modern ESM.
- **Quality tooling** – run formatting and linting from the root:
  ```sh
  npm run lint
  npm run format
  ```
- **Scripts** – `package.json` exposes `dev:<app>` scripts that wrap Expo with `concurrently`, keeping backend and frontend in sync.

## Portfolio Notes

Use this repo to showcase:
- Cross-domain product thinking (security, AI ops, wellness, finance, education) with cohesive visual systems.
- Backend integration patterns (auth, CRUD workflows, forecasting heuristics) surfaced through polished mobile/web UIs.
- Reusable component library and color theory applied consistently across consumer-facing experiences.

## Next Steps

- Swap demo seeds for live services (SaaS APIs, Firebase, Stripe test data) to highlight integrations.
- Layer deeper navigation (authenticated tabs, deep links, modals) per app.
- Expand `@multiapps/common` with typography scales, iconography, motion tokens, and accessibility primitives.
- Add CI to lint, run Expo previews, and publish component docs for recruiters or stakeholders.

