# STG Project — Handover Notes

## 1. Reused from Neela (conceptually — no client-specific code)

- **Architecture & stack**: TanStack Start (SSR) + Tailwind v4 + shadcn/ui + Vite (Lovable preset).
- **UI primitives**: all ~50 `src/components/ui/*` shadcn components (brand-free).
- **Generic utilities**: `cn()` + WhatsApp deep-link helpers (`utils.ts`), Indian date/number/currency formatters (`format.ts`), SSR error wrappers (`error-capture`, `error-page`).
- **Hooks**: `use-mobile`, `use-autosave-draft` (the autosave directly fixes the "half-typed data lost on tab switch" complaint).
- **Patterns**: design-token CSS architecture, light/dark theme provider, responsive sidebar+topbar app shell, root providers, file-based routing structure.

## 2. Rebuilt fresh for STG

- **Brand**: new yellow/red/charcoal token palette (`styles.css`), STG wordmark, meta/title.
- **Domain model**: 3 companies, product catalogs with routing synonyms, lead lifecycle, requirements, versioned quotations, payments, follow-ups, negotiations, targets (`src/lib/mock/*`).
- **Smart routing**: rule-based keyword→category→company matcher (`routing.ts`).
- **Auth**: mock role switcher (MD + 3 execs) with company isolation enforced in `selectors.ts`.
- **All screens**: dashboard (role-aware), leads + intake, lead detail (full cycle), requirement form, quotation builder + PDF, follow-ups, deliveries, quotations search, negotiations, common requests, team & targets, settings.

## 3. Placeholders / mock data in use

| Area | Current state | To make real |
|------|---------------|--------------|
| Data store | localStorage (`src/lib/mock/store.ts`) | Replace selectors/`mutate` with Supabase queries — types already align |
| Auth | role switcher (`src/lib/auth.tsx`) | Supabase Auth + RLS per company |
| Email / SMS / WhatsApp send | stubbed (logs activity, shows toast) | Wire SendGrid / Twilio / WhatsApp Business API |
| Background reminders | computed in-app on load | Server cron (2-day / 1-day / 2-hour) + push/FCM |
| Logo | wordmark in `src/components/brand-logo.tsx` | Drop client logo in `/public`, swap component |
| GSTINs / bank details | sample values in `seed.ts` | Replace with real STG figures |

## 4. Assumptions made (confirm or correct)

1. STG Infra **shares** STG Rentals' GSTIN but has a **separate** quotation series — modelled as `sharesGstWith`.
2. Quotation number format: `PREFIX-YYYY-####` (e.g. `STGR-2026-0044`); a "new version" keeps the same number, increments `version`, and groups under one `projectNo`.
3. Lifecycle states fixed to: new · follow-up · interested · negotiation · quote_sent · confirmed · completed · not_interested.
4. "Confirmed" = advance paid; "Completed" = fully paid (auto-closes the requirement).
5. Requirement fields are all mandatory; "nil" requires a reason (per brief).
6. Infra executive name unknown → placeholder "Infra Executive" (editable in Settings).

## 5. Suggested next scenarios (not yet built — flagged for later)

- Same-quotation **add-on projects on different dates** (data model supports `projectNo`; UI TBD).
- Work-order upload (image/PDF) + OCR-or-manual number entry on quotations.
- In-portal **message/call** from MD to an executive.
- "New requirement" re-open flow after a completed lead asks again.
- Per-company billing photo/letterhead on the PDF.

## 6. Known limitations / things I could NOT do here

- No real outbound messaging or push notifications without provider credentials.
- No live Supabase connection (need project URL + anon key; the PDF credentials are a dashboard login, not API keys).
- No true ML intent detection — used editable rule-based synonym matching (more predictable, maintainable).
- Reminders can't fire while the app/browser is closed without a backend scheduler.

## 7. TODO checklist

- [ ] Provide real GSTINs, bank details, billing addresses, and the infra executive's name.
- [ ] Provide the STG logo file.
- [ ] Decide backend (Supabase recommended) and share URL + keys.
- [ ] Provide messaging provider (email/WhatsApp/SMS) for real sends.
- [ ] Replicate the rentals vertical slice nuances to infra & trading catalogs (already routed; verify field sets per equipment type).
- [ ] Confirm assumptions in section 4.
