# Mentora — frontend

React + TypeScript single-page app built with Vite. See the [root README](../README.md)
for the product overview, architecture and deployment.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server on `http://localhost:5173` |
| `npm run build` | Typecheck (`tsc -b`) and produce the production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with Oxlint |
| `npx vitest run` | Run the test suite (Vitest, Testing Library, jsdom) |

## Environment

Copy `.env.example` to `.env.development` and set:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL, e.g. `http://localhost:5000/api` (embedded at build time) |

## Layout

```
src/
  app/            providers, router, route guards, centralized paths
  components/     ui/ (design-system primitives) and layout/ (customer + mentor shells)
  features/       one folder per feature: api.ts, query hooks, components, tests
  lib/api/        API client (envelope unwrapping, refresh-and-retry), errors, query keys
  lib/stores/     toast store (the only Zustand store)
  styles/         design tokens (Tailwind theme)
  types/          API response types
public/mentors/   mentor portraits (static, served from the site root)
vercel.json       rewrites all paths to index.html for client-side routing
```
