# QPR PMO

Client-side React/TypeScript/Vite/Tailwind design prototype for a PMO module. No backend — all data is mock/simulated. There is no router; navigation is plain `useState` toggling in `App.tsx` and `ProjectDetailsShell.tsx`.

## Commands

- Dev server: `npm run dev` (or `npx vite`). Defaults to port 5173, auto-increments if that's in use — check the terminal output for the actual `Local:` URL rather than assuming 5173.
- Type-check: `npx tsc -p tsconfig.app.json --noEmit`. **Do not run bare `npx tsc --noEmit`** — the root `tsconfig.json` is a solution file (`"files": []`, only `references`), so a bare run silently checks zero files and reports no errors even when the build is broken.
- Lint: `npx oxlint src` (or a subfolder, e.g. `npx oxlint src/pmo/dashboard`).
- Build: `npm run build` (runs `tsc -b` then `vite build`).

## Architecture

- `src/pmo/` is the real app. `src/App.tsx` toggles between `ProjectsRegisterPage` (the landing list) and `ProjectDetailsShell` (per-project workspace with a horizontal tab bar, no sidebar).
- `src/types.ts`, `src/data/mockProjects.ts`, `src/components/StatusBadge.tsx`, `src/components/ProjectHierarchy.tsx` are **dead leftovers** from before the `pmo/` rewrite — not imported anywhere. Don't confuse `src/types.ts`'s `Status`/`Project` with `src/pmo/types.ts`'s `ProjectLifecycleStatus`/`SectionId`, which are the real ones.
- Each Project Details tab (`overview`, `schedule`, `risks`, `dashboard`, etc.) is its own folder under `src/pmo/` with a `*Data.ts` file owning types/mock data/pure mutation functions, and a `*View.tsx` component that stays presentational.
- `src/pmo/dashboard/` is the role-based Dashboard tab: `roleConfig.ts` (the six presentation-only "view as" perspectives — never used for real authorization), `widgetRegistry.tsx` + `dashboardManifests.ts` (role×mode → widget list), `data/` (dashboard DTOs + one internally-consistent mock `ProjectDashboardData`), `widgets/` (the reusable `DashboardWidget` shell + content widgets).
- No charting library and no new UI library — Gantt, dashboard bar/line charts, etc. are all hand-rolled with plain `div`/SVG + Tailwind, matching the existing precedent. Keep it that way unless there's a strong reason not to.
- Dense enterprise visual language throughout: `text-xs`/`text-[11px]` typography, tight padding, thin `border-slate-200` dividers instead of shadows/cards, semantic colors are plain Tailwind slate/blue/emerald/amber/rose utilities (no custom design-token file).
- Async save/loading states are simulated with a deterministic "first attempt fails, then succeeds" pattern (`useRef` flag + `setTimeout`) — used consistently across views to demonstrate saving/error/retry UI.
