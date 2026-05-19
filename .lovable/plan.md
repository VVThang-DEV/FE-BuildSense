# BuildSense AI — Full Product Prototype

A realistic SaaS prototype that mirrors the capstone proposal (SU26SE079) module-for-module and implements the mentor's material/PO workflow end-to-end. Adds a real login + role selection, persistent session, and a role-aware app shell with sidebar.

## Roles (exactly as listed in the proposal §3.1)

| Role | Default landing | Scope |
|---|---|---|
| **Admin** | `/app/admin/wbs` | WBS, budgets per work package, team roles, inventory thresholds, procurement workflow config, baseline schedule, plan-vs-actual variance |
| **Manager** | `/app/dashboard` | Executive KPI dashboard, PO approvals, schedule variance, critical-path risk, PDF/Excel exports |
| **Staff** | `/app/staff/users` | User & access control, system-wide alert thresholds, notification rules, automated stakeholder report scheduler |
| **Field Engineer** | `/app/site` (mobile-first) | Daily task % updates, site reports, material requests, attendance, view assigned materials, receive AI alerts |
| **Customer** | `/app/portal` | Read-only: progress %, milestones, photo updates, AI-surfaced delay notices |

A **separate `/ai` panel** is available to Admin / Manager / Staff and acts as the proposal's "AI Agent" (NL Q&A, anomaly detection, auto-draft procurement emails & daily briefings).

## Mentor-driven workflow (the spine of the demo)

```text
1. Supplier-side seeding
   Admin opens Material Catalog and seeds the tree:
     Steel ─ Concrete Steel (sắt đổ bê tông) ─ Phi 5 / Phi 10 / Phi 20
           ─ Box Steel / Sheet Steel / Angle Steel (sắt hộp / sắt lá / sắt lờ)
     Cement ─ OPC 53 / PPC
     Aggregates ─ M-Sand / 20mm Gravel
   Supplier (mocked) pushes stock updates → catalog shows on-hand qty.

2. Project creation
   Admin/Manager creates a house project →
     • Uploads/edits Gantt-style Task List (WBS)
     • Uploads time-phased Material Plan: per material variant + required-at date
       (e.g. Phi 10 — 480 kg — needed at Foundation; Lights — needed at Finishing)

3. Daily run
   Each day a scheduler check (mocked "Run daily check" button) compares
   on-hand vs. what each project needs in the next N days.
   • If shortage → auto-create a PO request per house.
   • AI consolidates requests across houses
     (House A 500 + House B 300 + House C 200 = 1,000 bricks → one PO).

4. Manager approves PO inbox → status flips to "Ordered" → on delivery, Field
   Engineer marks "Received" → stock rises, project material checklist ticks.

5. Field Engineer updates daily task % and site report; AI re-forecasts the
   schedule and raises a delay alert that surfaces to Manager and Customer.
```

## Login + session

- `/login` — branded split-screen. Left: hero + product blurb. Right: 5 role cards (Admin, Manager, Staff, Field Engineer, Customer), each with a demo user (name + email). Click → "Sign in as …" → writes `localStorage.bs.session` and navigates to that role's default page.
- `/app` layout component reads session; if missing → redirect to `/login`. Topbar shows logged-in user + "Switch role / Sign out".
- No real auth; clearly labeled "Demo prototype — no real authentication".

## Modules (full matrix mapped to proposal §3.1 + §3.2)

| Module | Proposal line | Admin | Mgr | Staff | Eng | Cust |
|---|---|---|---|---|---|---|
| Executive Dashboard (cost, progress, workforce KPIs) | Manager.1 | view | ✓ | view | — | — |
| Projects & WBS (define WBS, assign budgets, team roles) | Admin.1 | ✓ | ✓ | — | view | — |
| Gantt / Baseline vs. Actual schedule | Admin.3, Mgr.3 | ✓ | ✓ | — | view | — |
| Material Catalog with variants (Steel→Phi 5/10/20 etc.) | mentor | ✓ | view | — | view | — |
| Inventory & Thresholds (alert thresholds, procurement) | Admin.2 | ✓ | view | view | view | — |
| Time-Phased Material Plan per project | mentor | ✓ | view | — | view | — |
| Daily Check & Auto-PO generator | mentor | ✓ trigger | ✓ trigger | — | — | — |
| Procurement / PO Inbox (AI-consolidated approvals) | Mgr.2 | view | ✓ | — | request | — |
| Daily Progress % + Site Report | Eng.1 | — | view | — | ✓ | — |
| Attendance (on-site check-in) | Eng.4 | view | view | — | ✓ | — |
| Material Assignment view & shortage request | Eng.2, Eng.3 | view | view | — | ✓ | — |
| AI Agent (NL Q&A, anomaly, draft emails, briefings) | AI.1–4 | ✓ | ✓ | ✓ | — | — |
| Plan-vs-Actual Reports & PDF/Excel export | Mgr.4, deliv. | ✓ | ✓ | schedule | — | — |
| User & Access Control | Staff.1 | view | — | ✓ | — | — |
| Alert Thresholds & Notification Rules | Staff.2 | view | — | ✓ | — | — |
| Automated Stakeholder Report Scheduler | Staff.3 | view | view | ✓ | — | — |
| Customer Portal (progress, photos, AI alerts) | Cust.1–3 | — | — | — | — | ✓ |

## Pages to build

- `/login`
- `/app` layout (sidebar + topbar + outlet, role-filtered nav)
- `/app/dashboard` — KPIs, AI Action Center, multi-project Gantt, cost/schedule variance chart
- `/app/projects` and `/app/projects/$id` (tabs: Overview · WBS/Gantt · Material Plan · Team · Documents · Reports)
- `/app/materials` — catalog tree editor + stock levels, "Supplier delivered" action
- `/app/procurement` — PO inbox (AI-consolidated rows show source houses 500+300+200=1000), Approve / Reject / History
- `/app/check` — "Run daily check" page that surfaces generated POs (the mentor's daily scheduler, manually triggerable)
- `/app/site` — Engineer home: today's tasks with sliders, attendance, quick shortage request
- `/app/site/report` — daily site report form (weather, headcount, work done, blockers, photos)
- `/app/site/attendance` — check-in/out log
- `/app/ai` — chat-style AI Agent with suggested prompts and draft-email panel
- `/app/reports` — templates + scheduler + mock download
- `/app/admin/wbs` — WBS / baseline editor
- `/app/admin/thresholds` — inventory & alert thresholds
- `/app/staff/users` — users + roles table, invite modal
- `/app/staff/notifications` — notification rules
- `/app/portal` — Customer portal (redesign of current `/customer`)

Existing `/`, `/site`, `/customer` routes become redirects into the new flow.

## Mock data extensions (`src/lib/mock-data.ts`)

Add: `users[]` (one per role), `supplierStock` keyed by material leaf, `projectMaterialPlan` (variant + required qty + needed-by phase/date), `attendance[]`, `dailyReports[]`, `alertThresholds`, `notificationRules`, `aiChatSeed[]` (with mentor-style queries: "Why is Villa 12 delayed?", "Draft PO email for 1000 bricks"), `reportTemplates[]`, `scheduledReports[]`, `procurementHistory[]`. Keep existing PO + material tree intact and extend it.

## Styling

Keep the construction palette already in `src/styles.css`. Use shadcn `sidebar`, `table`, `tabs`, `dialog`, `sheet`, `chart` (Recharts wrapper) for variance/burn-down. No new dependencies.

## Out of scope (prototype boundaries)

No backend / Lovable Cloud yet — `localStorage` session only. No real file upload, no real PDF/Excel (download is a stub blob). No real AI calls — responses are pre-seeded but realistic. No mobile-native build; engineer view is mobile-responsive web.

## Technical notes

- TanStack file-routing with dot convention: `app.tsx` (layout w/ `<Outlet/>`), `app.dashboard.tsx`, `app.projects.tsx`, `app.projects.$id.tsx`, `app.materials.tsx`, `app.procurement.tsx`, `app.check.tsx`, `app.site.tsx`, `app.site.report.tsx`, `app.site.attendance.tsx`, `app.ai.tsx`, `app.reports.tsx`, `app.admin.wbs.tsx`, `app.admin.thresholds.tsx`, `app.staff.users.tsx`, `app.staff.notifications.tsx`, `app.portal.tsx`.
- `src/lib/session.ts` — `useSession`, `login(role)`, `logout()`, role guard hook.
- `src/lib/nav.ts` — nav items with `roles: Role[]` filter; sidebar derives from this.
- Role guard inside `app.tsx` component (SSR-safe; no auth context).
- Old routes (`/`, `/site`, `/customer`) become small redirect components into `/login` or `/app/...`.
