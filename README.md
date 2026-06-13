# STG Groups CRM

A lead-to-payment CRM for **STG Groups** — heavy-equipment rentals, infra equipment & trading — spanning three sibling companies with isolated executive views and a super-admin (MD) command centre.

Built on the same proven architecture as the Neela project (TanStack Start + Tailwind v4 + shadcn/ui), re-themed and rebuilt for STG. **No Neela code, branding, content, API, or keys are used.**

## Stack

- **TanStack Start** (React 19, SSR) · TanStack Router · TanStack Query
- **Tailwind v4** + **shadcn/ui** (Radix) · lucide icons
- **Mock data layer** (localStorage-backed, reactive) — maps 1:1 to a future Supabase schema
- jsPDF (quotation PDFs) · Vite (build → Vercel preset)

## Run it

```bash
cd ~/Desktop/stg
npm install      # already done
npm run dev      # http://localhost:8080
npm run build    # production build
npm run preview  # preview the build
```

Open the app → pick a role on the login screen:

| Role | Sees |
|------|------|
| **Managing Director** (super admin) | Everything — all 3 companies, team activity, targets |
| **Sanjay** — STG Rentals | Only STG Rentals leads |
| **Infra Executive** — STG Infra | Only STG Infra leads |
| **Naveen** — STG Trading | Only STG Trading leads |

> Demo data lives in your browser (localStorage). Reset it anytime from **Settings → Demo data**.

## The lead lifecycle (the "cycle")

`New → Follow-up → Interested → Negotiation → Quotation sent → Confirmed → Completed`
(or **Not interested**, captured with a reason). Every lead always rests in exactly one state — nothing dead-ends.

## Key features

- **Intake by mobile number** with existing-customer lookup + **smart keyword routing** to the right company/executive (editable synonym catalog in Settings).
- **Multi-tab requirement form** — all fields mandatory, `nil`+reason supported, **autosaves** (survives app/tab switching), Enter advances tabs.
- **Quotation builder** — billing vs delivery addresses, versioning (same project no, multiple revisions), commercial terms, **PDF download**, one-click "send & email" (mock).
- **Proforma & payment** — advance/balance stages; full payment closes the requirement.
- **Follow-ups, negotiations (with competitor intel), not-interested reasons.**
- **Role-isolated dashboards** + MD command centre with per-exec targets (congrats at 50%) and stale-lead (24h) alerts.
- **Deliveries** with 2-day / 1-day / 2-hour reminder windows.

## What's mocked / pending real integration

See `STG-PROJECT-NOTES.md` for the full handover (reused vs rebuilt, placeholders, TODOs).

- Email / SMS / WhatsApp **sending** is stubbed (buttons + activity log; needs provider keys).
- **Supabase** not wired — swap `src/lib/mock/store.ts` selectors for queries; types already align.
- Background reminders (firing while app closed) need a server cron later.
- Client **logo** is a wordmark placeholder — drop the real file in `/public` and update `src/components/brand-logo.tsx`.

## Project layout

```
src/
  components/ui/        shadcn primitives (generic)
  components/           StatusBadge, PageHeader, BrandLogo, leads/ dialogs
  hooks/                use-mobile, use-autosave-draft
  lib/
    mock/               types · seed · store · routing · selectors · actions
    status.ts           lifecycle labels + tokens
    utils.ts format.ts  generic helpers
    quotation-pdf.ts    jsPDF export
  routes/
    __root.tsx login.tsx index.tsx
    _app.tsx            responsive sidebar/topbar shell
    _app/               dashboard, leads, leads.$leadId, requirement.$leadId,
                        quotation.$leadId, follow-ups, deliveries, quotations,
                        negotiations, common-requests, team, settings
  styles.css            yellow/red design tokens (light + dark)
```
