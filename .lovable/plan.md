# AI-Integrated Construction PM System — UI Prototype

A demo-ready prototype with three role views (Project Manager, Site Engineer, Customer), realistic mock data, and the AI scenarios your mentor asked for. Frontend-only — no backend.

## Routes & navigation

- `/` → Project Manager dashboard (desktop)
- `/site` → Site Engineer interface (mobile-first)
- `/customer` → Customer portal (read-only)
- Shared top bar with a role switcher (PM / Site / Customer) plus project name + mock user avatar. On the Site route, the top bar collapses for a mobile feel.

## Page 1 — Project Manager (desktop)

1. **KPI row** (4 cards): Total Projects (12), Active Workforce (148), Budget Variance (-3.2%), AI Alerts (3 — highlighted with accent color + pulse dot).
2. **AI Action Center** widget — list of AI insights. Featured card:
   - "Predicted 6-day delay on Project A (Villa 12) due to current masonry pace + forecasted rain Oct 22–24."
   - Suggested action: "Reallocate 4 masons from Project C (ahead of schedule) → Project A." Buttons: Apply suggestion / Dismiss / View details.
   - Two more compact alerts (cost overrun risk, supplier lead-time warning).
3. **Smart PO Approval Inbox** — table of consolidated POs. Hero row exactly as requested:
   - Item: Red Clay Bricks · Consolidated from: House A (500), House B (300), House C (200) · Total: **1,000 bricks** · Vendor: BuildMart · Est. savings: ₹4,200 (bulk) · Status: Awaiting approval.
   - Expandable row reveals the 3 source requests. "Approve All" primary button + Reject / Edit.
   - 2–3 more mock consolidated POs (cement, TMT steel, sand).
4. **Multi-Project Timeline** — Gantt-style horizontal bar list for 5 projects with phase segments (Foundation / Structure / Finishing), today marker, and % complete. Bars colored by health (on-track / at-risk / delayed).

## Page 2 — Site Engineer (mobile-first)

Single-column scrollable layout, large tap targets, sticky bottom action bar.

1. **Header**: project name, today's date, current phase chip.
2. **Daily Progress Log** — list of today's tasks (Brickwork L2, Plastering, Electrical rough-in). Each row has a slider (0–100%) to update completion, with live % label. Save button updates local state + toast.
3. **Media Upload** — large dashed drop zone "Upload Field Report Photos" with camera icon; mock thumbnails appear after click.
4. **Time-Phased Material Checklist** — today's required materials only (e.g. cement bags for foundation pour). Tree/disclosure UI:
   - Steel ▸ Concrete Steel ▸ Phi 5 / Phi 10 / Phi 20 (each with required qty + checkbox received).
   - Cement ▸ OPC 53 / PPC.
5. **Material Shortage Request** — prominent button opens a sheet: pick material + variant + qty, submit triggers mock "PO request sent to PM" toast.

## Page 3 — Customer Portal (read-only)

No edit controls anywhere.

1. **Hero**: customer's house (House B — Plot 14), overall completion ring (47%), expected handover date.
2. **Milestones Timeline** — vertical timeline: Land prep ✓ · Foundation ✓ · Structure (in progress) · Roofing · Finishing · Handover. Current phase highlighted.
3. **Photo Gallery** — responsive grid of daily site photos (mock images via picsum/unsplash placeholders) grouped by date, lightbox on click.
4. Small "Project Updates" feed (read-only text notes from PM).

## Technical notes

- Stack: existing TanStack Start + React + Tailwind v4 + shadcn/ui (already installed).
- New route files: `src/routes/index.tsx` (replace placeholder, PM dashboard), `src/routes/site.tsx`, `src/routes/customer.tsx`.
- Shared components in `src/components/`: `RoleSwitcher`, `KpiCard`, `AiAlertCard`, `ConsolidatedPoTable`, `GanttRow`, `TaskSlider`, `MaterialTree`, `MilestoneTimeline`, `PhotoGallery`.
- Mock data in `src/lib/mock-data.ts` (projects, POs, tasks, materials, photos, alerts).
- All state is local React state — no backend, no Cloud needed for the demo.
- Design tokens added to `src/styles.css`: construction-friendly palette (slate + safety-amber accent, success green, alert red). Semantic tokens only, no hardcoded colors in components.
- Mobile-first for `/site`: use `preview_ui--set_preview_device_viewport` to mobile when reviewing.
- Images: use Unsplash construction photo URLs for the gallery (no generation needed for prototype speed).

## Out of scope

Auth, real AI calls, persistence, real file uploads, drag-and-drop reordering — all mocked with local state + toasts.
