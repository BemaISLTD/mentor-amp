# MentorAmp Frontend

A production-quality frontend for a simplified actuarial projection platform, inspired by enterprise systems like ALFA and Prophet. Built with a modern React stack and fully functional without a real backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 8 |
| UI Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Component Library | shadcn/ui (custom-built primitives) + Radix UI |
| Data Tables | TanStack Table v8 |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Mock API | Custom in-memory service (src/lib/api.ts) |

---

## Quick Start

    npm install
    npm run dev
    # Open http://localhost:5173

### Build for Production

    npm run build
    npm run preview

---

## Project Structure

    src/
    ├── components/
    │   ├── data-table/       # TanStack Table wrapper
    │   ├── layout/           # AppLayout, Sidebar, Header, PageHeader
    │   ├── status/           # FileStatusBadge, RunStatusBadge
    │   ├── ui/               # All shadcn-compatible UI primitives
    │   └── upload/           # Drag-and-drop FileUploadZone
    ├── hooks/
    │   └── useTheme.tsx      # Light/dark mode context
    ├── lib/
    │   ├── api.ts            # Mock API service (replace for real backend)
    │   ├── mock-data.ts      # All mock data (realistic actuarial data)
    │   ├── types.ts          # TypeScript type definitions
    │   └── utils.ts          # Formatting utilities
    ├── pages/
    │   ├── dashboard/
    │   ├── data/
    │   ├── products/
    │   ├── reports/
    │   ├── runs/
    │   └── settings/
    └── routes/
        └── index.tsx

---

## Mock Backend

src/lib/mock-data.ts contains all static mock data.
src/lib/api.ts simulates async API calls with realistic delays.

Every function in api.ts has an INTEGRATION NOTE comment showing the
target REST endpoint. To connect a real backend, replace the function body:

    // BEFORE (mock)
    export async function getRuns() {
      await sleep(500);
      return _runs;
    }

    // AFTER (real backend)
    export async function getRuns() {
      const res = await fetch('/api/v1/runs', { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

---

## Status Badges

File: pending | uploaded | validating | validated | failed
Run:  draft | queued | running | completed | failed | cancelled

---

## Dark Mode

Toggle via the moon/sun icon in the header. Persisted to localStorage.
