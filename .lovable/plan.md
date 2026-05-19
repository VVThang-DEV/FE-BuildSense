# BuildSense AI — Full Product Prototype

Transform the current 3-tab demo into a realistic, multi-role SaaS product modeled exactly on the capstone proposal (5 roles) and the mentor's material/PO workflow. Adds a real login screen, role selection, persistent session (localStorage), a role-aware app shell with sidebar, and detailed modules for every role.

## Roles (from proposal)

1. **Admin** — WBS, budgets, inventory thresholds, procurement workflow, baseline schedule
2. **Manager (Project Manager)** — executive dashboard, PO approvals, schedule variance, exports
3. **Staff (System Staff)** — user/access control, alert thresholds, automated report scheduler
4. **Field Engineer (Site)** — daily progress %, site reports, material requests, attendance — mobile-first
5. **Customer (Homeowner)** — read-only portal: progress, milestones, photos

## New flow

```text
/login  →  pick role + demo credentials  →  /app  (role-aware shell)
                                              ├── sidebar nav (role-filtered)
                                              ├── topbar (project switcher, role badge, logout)
                                              └── module pages
```

Session stored in `localStorage` (`bs.session = {role, name, projectId}`). `/app/*` routes redirect to `/login` if no session. A "Switch role" action returns to `/login`.

## Modules (matrix)

| Module | Admin | Manager | Staff | Engineer | Customer |
|---|---|---|---|---|---|
| Executive Dashboard (KPIs, AI alerts) | ✓ | ✓ | ✓ | — | — |
| Projects & WBS / Gantt | ✓ | ✓ | — | view | — |
| Material Catalog (Steel→Concrete Steel→Phi 5/10/20, Cement→OPC53/PPC, …) | ✓ edit | view | — | view | — |
| Time-Phased Material Plan (per project, per phase) | ✓ | view | — | view | — |
| Inventory & Thresholds | ✓ | view | — | view | — |
| Procurement / PO Inbox (AI consolidates 500+300+200=1000 bricks) | view | ✓ approve | — | request | — |
| Daily Progress Log + Site Report | — | view | — | ✓ | — |
| Attendance (check-in/out, geo) | view | view | — | ✓ | — |
| Photo / Document upload | — | view | — | ✓ | — |
| AI Agent (NL Q&A, anomaly, drafts emails) | ✓ | ✓ | ✓ | — | — |
| Reports & Exports (PDF/Excel mock) | ✓ | ✓ | ✓ schedule | — | — |
| User & Access Control | view | — | ✓ | — | — |
| Alert Threshold Config | ✓ | — | ✓ | — | — |
| Customer Portal (progress, milestones, gallery, updates) | — | — | — | — | ✓ |

## Pages to build

- `/login` — branded split-screen, role picker cards (5 roles, each with demo user), "Continue as …" button
- `/app/` — role-routed home (redirects to default module for role)
- `/app/dashboard` — KPI grid, AI Action Center, multi-project Gantt, variance chart
- `/app/projects` — project list + drill-in `/app/projects/$id` (WBS tabs: Tasks, Gantt, Materials, Team, Documents)
- `/app/materials` — catalog tree (Steel ▸ Concrete Steel ▸ Phi 5/10/20), inventory levels, threshold edit
- `/app/procurement` — PO inbox with AI-consolidated rows, approve/reject, history
- `/app/site` — engineer home: today's tasks, sliders, shortage request, attendance check-in
- `/app/site/report` — daily site report form (weather, headcount, work done, blockers, photos)
- `/app/attendance` — list + map placeholder
- `/app/ai` — AI Agent: chat box, suggested prompts ("Why is Villa 12 delayed?"), draft-email panel
- `/app/reports` — report templates, schedule, download buttons (mock)
- `/app/admin/users` — table, role chips, invite modal
- `/app/admin/thresholds` — alert config (cement variance %, stock min, lead-time)
- `/app/portal` — customer view (current `/customer` redesigned)

## App shell

- `src/components/app-shell.tsx` — sidebar (role-filtered nav items, collapsible) + topbar (project switcher, search, notifications popover, role/avatar menu)
- `src/lib/session.ts` — `useSession()`, `login()`, `logout()`, role helpers
- `src/lib/nav.ts` — module list with `roles: Role[]` filter
- Route guard: `/app` layout route (`src/routes/app.tsx`) checks session in component (no SSR auth)

## Mock data extensions (`src/lib/mock-data.ts`)

Add: users[], attendance[], dailyReports[], inventory levels per material leaf, alertThresholds, aiChatSeed[], reportTemplates[], scheduledReports[], procurementHistory[]. Keep existing PO and material tree intact.

## Styling

Keep current tokens (construction palette already in `src/styles.css`). Use shadcn sidebar (`components/ui/sidebar.tsx`), table, tabs, dialog, sheet, chart (Recharts is in shadcn chart wrapper) for variance/burn-down charts. No new deps.

## Out of scope

No real backend, no real auth (localStorage only), no real file upload (UI only), no real PDF/Excel export (download triggers a generated blob with a stub). No Lovable Cloud yet — kept as prototype per original request.

## Technical notes

- Keep the existing `/`, `/site`, `/customer` routes as redirects to `/login` (or `/app/...`) so old links work.
- Use TanStack file-routing dot convention: `app.tsx` (layout w/ Outlet), `app.dashboard.tsx`, `app.projects.tsx`, `app.projects.$id.tsx`, `app.materials.tsx`, etc.
- Role guard inside `app.tsx` component (not `beforeLoad`) — no SSR auth context available.
- All forms use local React state; toast on submit via existing `sonner`.
