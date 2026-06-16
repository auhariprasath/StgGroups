# STG Groups CRM — Phase Completion Checklist

> **Project status (15 Jun 2026):** ~30% complete overall. Frontend UI exists for ~60% of modules, but backend integration, DB tables, automations, realtime, and most advanced features are NOT implemented.
>
> **Architecture note:** Data store is in-memory (localStorage-backed for drafts). Supabase adapter code is written but NOT connected (schema exists but store falls back to seed data). Auth is a mock role switcher. All communications are stubbed (wa.me links only).

---

## Phase 1 — Lead Capture Engine (~95% complete)

### ✅ Already Implemented

- [x] Lead entry form (new-lead-dialog.tsx)
- [x] 4-layer product intelligence (routing.ts — exact/alias/fuzzy/AI keyword match)
- [x] Auto company assignment
- [x] Lead list (Kanban/Table/Pipeline views)
- [x] Lead detail page (leads.$leadId.tsx)
- [x] Activity/timeline logging
- [x] Lead source tracking (justdial, indiamart, phone, whatsapp, walkin, reference, existing_customer, manual)
- [x] Search/filter/sort on leads list
- [x] Lead transfer (basic — now updated with reason types + notes)
- [x] Mark as invalid button (now added)
- [x] Transfer logs (now tracked)
- [x] Lead card UI (HoverCard on leads list — shows name, phone, product, source, location, handler, status, created time, priority without opening lead)
- [x] Existing Customer Check button (dedicated button on lead detail with full history popup)
- [x] Auto notification to assigned executive on lead creation (in-app notification)
- [x] DB tables added to schema: `lead_sources`, `product_alias_mapping`, `lead_assignment_history`, `existing_customer_history`, `lead_transfer_logs`, `notifications`
- [x] `lead_sources` seed data (8 sources with source_type, webhook_enabled, status)
- [x] `product_alias_mapping` seed data (10 keyword→product mappings with confidence scores)
- [x] **Lead source integration from DB** — Source dropdown reads from `db.leadSources` instead of hardcoded array
- [x] **Lead history tagging** — Auto-classifies leads as `new_lead` / `existing_contact` / `active_negotiation` on creation; badge shown on card + detail
- [x] **Not Interested / Dormant leads hidden from default view** — `visibleLeads()` excludes `not_interested` and `dormant` by default; filter chip includes them when selected
- [x] **Daily reminders on dashboard** — "Follow-ups due today" + "Pending new leads" cards on exec dashboard
- [x] **Realtime subscriptions** — `src/lib/realtime.ts` subscribes to all 20 CRM tables via Supabase; auto-refreshes store on changes (no-op when Supabase not connected)
- [x] **Escalation engine** — `src/lib/escalation.ts` polls every 60s: 4h in "new" → notify admin, 24h → notify MD. Same for `needsManualRouting` leads
- [x] **Button verification** — Loading/saving states added to Create Lead, Save Requirement, Follow-up Save Outcome buttons; disabled states prevent double-submit
- [x] **Auto company routing escalation** — `needsManualRouting` leads auto-escalate at 4h (admin) / 24h (MD)

### ❌ Not Implemented / Incomplete

- [ ] **Webhook integration** — `lead_sources` has `webhook_enabled` field but no webhook handling logic (Justdial, IndiaMART, WhatsApp auto-import). Requires backend server.

---

## Phase 2 — Duplicate Detection Engine (~100% complete)

### ✅ Already Implemented

- [x] Layer 1 — Mobile exact match (basic check in new-lead-dialog.tsx)
- [x] Basic duplicate popup showing existing customer found
- [x] Option to create new enquiry
- [x] **Layer 2 — GST match** — Exact GST match across companies → merge suggestion (confidence 100%)
- [x] **Layer 3 — Same phone, different company** — Warning shown (confidence 90%)
- [x] **Layer 4 — Fuzzy company match** — Levenshtein ≤25% edit-distance soft recommendation (confidence 70%)
- [x] **Layer 5 — Email domain match** — Info alert for non-generic domains (confidence 50%)
- [x] **Duplicate UI popup** — Shows previous quotations / invoices / follow-ups counts via `customerHistoryForLead()` (CustomerHistoryPreview component)
- [x] **Actions:** Merge customer (`mergeEnquiryIntoLead`), Ignore ("proceed anyway"), Link to existing customer — all wired on Layer-1 block and Layer 2–5 hits
- [x] **`duplicate_detection_logs` table** — Already in schema + adapter; now written by `logDuplicateAction()` (id, lead_id, matched_lead_id, match_type, confidence_score, action_taken, actioned_by, created_at)
- [x] **Audit logging** — Every merge/ignore/link writes a `duplicateLogs` row + a timeline activity on the affected lead
- [x] **Validation rules enforcement:** Hard block on duplicate mobile (same company), warn on GST/phone, soft alert on fuzzy company, info alert on email domain — all confidence-scored

### Notes

- Layer 3 in code is "same phone in a different company" (not company+pincode); pincode is not captured on the lead form, so company-name similarity (Layer 4) covers the fuzzy-company requirement.

---

## Phase 3 — Follow-up Management Engine (~100% complete)

### ✅ Already Implemented

- [x] Follow-up dialog with 4 outcome options (positive/negative/neutral/no_response)
- [x] Positive outcome → marks lead as interested
- [x] Negative outcome → marks as not_interested, saves reason (10 reasons)
- [x] Neutral outcome → schedules callback with date/time and next action
- [x] No response → logs attempt
- [x] Call attempt counter
- [x] Next action selection (call_again, waiting_decision, meeting, site_visit, price_negotiation, send_quotation)
- [x] Competitor tracking for negative outcomes
- [x] Site visit / meeting scheduling (separate from follow-ups)
- [x] Follow-up timeline activity log
- [x] Lead priority (hot/warm/cold)
- [x] Dormant lead status available
- [x] **Move To Quotation button** — Direct button from positive follow-up outcome to create quotation (save + navigate)
- [x] **Reminder escalation engine** — 1d → handler, 3d → Super Admin, 7d → MD / high-risk flag
- [x] **Daily morning digest** — In-app notification every morning with pending follow-ups for each executive
- [x] **Auto customer communication messages** — Queued as timeline activities (positive/neutral/negative templates)
- [x] **Missed follow-up escalation** — 3+ days → company admin, 7+ days → MD
- [x] **Negotiation escalation** — After 3 negotiation rounds → auto escalate to MD
- [x] **No Response workflow** — After 3+ no-response attempts → move to Dormant (not immediately negative)
- [x] **Reopen lead button** — From not_interested/dormant status back to follow-up, history preserved
- [x] **Super Admin analytics for follow-ups** — Positive/Negative/Neutral %, Lost Reasons, Executive Performance, Competitor Analytics
- [x] **`followup_timeline` table** — id, lead_id, action_type, description, created_by, timestamp (schema + adapter + logging)
- [x] **`followup_reminders` table** — id, lead_id, handler_name, reminder_date, reminder_time, status, notification_sent, created_at (schema + adapter)
- [x] **`negative_reason_analytics` table** — id, lead_id, company_name, reason_type, competitor_name, notes, created_at (schema + adapter + auto-logged on negative)
- [x] **Smart callback system** — Escalation engine fires notification at exact callback time (within 1h window)
- [x] **Quotation locked until follow-up exists** — Cannot create/save quotation without first follow-up outcome; banner + disabled buttons on quotation page + lead detail

---

## Phase 4 — CRM State Machine (~100% complete)

### ✅ Already Implemented

- [x] Lead statuses: new, first_contact, followup, requirements, quote_sent, negotiation, work_order, active_project, completed, not_interested, dormant
- [x] VALID_TRANSITIONS map in status.ts (strict linear flow: new → first_contact → followup → requirements → quote_sent → negotiation → work_order → active_project → completed)
- [x] canTransition() validation + transitionError() user-facing error messages
- [x] Status history tracking (lead_status_history table)
- [x] Status stepper UI on lead detail page
- [x] All status changes centralized through `applyStatusChange()` helper in actions.ts
- [x] `setLeadStatus()` stamps `previousStatus`, `statusChangedAt`, `statusChangedBy` denormalized fields
- [x] Illegal transitions now throw Error with descriptive message from `transitionError()`
- [x] All callers wrapped in try/catch with `toast.error()` for user-facing feedback
- [x] `recordContactOutcome()`, `scheduleFollowUp()`, `recordNegotiation()`, `markNotInterested()`, `reopenLead()` all use `applyStatusChange()` instead of direct status mutation
- [x] Schema: `leads` table has `previous_status`, `status_changed_at`, `status_changed_by` columns
- [x] Schema: status CHECK constraint updated to new flow statuses
- [x] **Strict stage-skipping prevention** — `new` can only go to `first_contact` (must make contact first)
- [x] **Quotation creation blocked without requirements** — Data-layer enforcement in `saveVersion()`: checks requirement exists and has no unresolved NIL fields before allowing save
- [x] **Invoice creation requires accepted quotation** — Proforma invoice page checks for `latestAccepted` (not just `latestSent`); tax invoice page same

---

## Phase 5 — Requirements Engine (~100% complete)

### ✅ Already Implemented

- [x] Dynamic form loading based on equipment category
- [x] NIL + reason handling for empty fields
- [x] Autosave draft (use-autosave-draft.ts)
- [x] Quotation creation blocked without requirement (UI check)
- [x] Form validation (all fields mandatory)
- [x] `requirement_audit_logs` table in schema (id, requirement_id, action_type, field_key, old_value, new_value, changed_by, changed_at)
- [x] **Company-specific requirement fields:**
  - STG Rentals: Height, Capacity, Lift Type, Duration, Operator Needed, Power Type, Location
  - STG Infra: Terrain, Machine Model, Project Duration, Site Condition, Operator Required
  - STG Trading: Brand, Product Type, Size, Quantity, Model
  - Defined in `COMPANY_FIELDS` in specs.ts; replaces generic Tab 0 fields when available
- [x] **Conditional form engine** — Company-specific fields loaded via `companyFieldsFor(lead.companyId)`; falls back to generic fields for unmapped companies
- [x] **Dynamic form switching** — `useEffect` watches `lead.companyId`; resets form + shows toast when company changes (e.g. after lead reassignment)
- [x] **Admin alert on NIL** — When requirement saved with NIL fields, creates high-priority `nil_alert` notifications for all super_admin users + writes `requirement_audit_logs` entries
- [x] **NIL handling:** Quotation creation blocked at data layer when requirement has unresolved NIL fields with `nilReason`; shows field names in error toast

---

## Phase 6 — Enterprise Quotation Management (~90% complete)

### ✅ Already Implemented

- [x] Quotation creation with dynamic line items
- [x] GST rate selection (0/5/12/18/28)
- [x] CGST/SGST/IGST calculation display
- [x] Quotation number auto-generation (PREFIX-YYYY-####)
- [x] Version control (V1, V2, V3... — clones previous)
- [x] PDF generation (quotation-pdf.ts)
- [x] Version history display on right panel
- [x] Commercial terms (advance %, balance terms, validity, rate note, approved by)
- [x] Block quotation creation if no requirement exists
- [x] **Customer auto-fill engine** — Detects existing customer by phone number; Customer 360 panel with past quotations, invoices, active projects, pending payments, negotiation history, lifetime revenue
- [x] **Product master engine** — Machine catalog with 7 models (Genie, JLG, Skyjack, Haulotte, CAT, Bomag); picker dialog auto-fills description, specs (height/capacity/power), daily rate
- [x] **Machine image validation** — Blocks PDF generation if machine line item lacks `imageUrl`; error toast with machine names; audit log created
- [x] **Quotation preview engine** — Modal with embedded PDF viewer; separate Preview (open viewer) / Download (direct save) buttons
- [x] **Auto save draft engine** — Saves to localStorage every 30s + on change; shows "Restore Draft / Discard Draft" banner on return for new quotations
- [x] **Approval workflow** — Toggle "Require manager approval before sending"; exec submits → manager approves/rejects → quotation sent; `pending_approval` status throughout
- [x] **Quote comparison engine** — "Compare" button on version history opens side-by-side grid (up to 4 versions) showing line items, subtotal, GST, grand total, terms, advance %
- [x] **WhatsApp engine** — Button sends pre-filled message via wa.me with quotation details; activity logged
- [x] **Email engine** — Button opens mailto with pre-filled subject/body; activity logged
- [x] **PDF revision watermark** — V1 = normal, V2+ = "REVISED" watermark with version number
- [x] **MD contact details on PDF** — mdName, mdNumber, mdEmail shown on PDF below billing address
- [x] **7-day validity default** — Default validity set to 7 days
- [x] **Machine capabilities as structured line item fields** — Each line item stores workingHeight, platformHeight, capacity, powerSupply; displayed as badges below line item
- [x] **Duplicate line item** — Copy button duplicates a row with all fields preserved
- [x] **Reorder line items** — Up/down arrow buttons to reorder line items in the grid
- [x] **Amount-in-words on PDF** — Grand total displayed as "Rupees X Crore Y Lakh Z Thousand ... Only" on PDF
- [x] **Quotation follow-up task engine** — When status = Sent, auto create follow-up task with +1 day due date
- [x] **Quotation acceptance & Work Order conversion** — Accept quotation with PO/LOI reference; convert to Work Order document
- [x] **Machine availability engine** — `Machine.availabilityStatus` (available/reserved/maintenance/booked) + `availableFrom`; picker shows colour-coded status + availability date; non-available machines prompt admin override + write an audit activity (`addMachine` in quotation.$leadId.tsx, seeded in seed.ts)
- [x] **Smart machine recommendation** — Picker scores machines against requirement working-height + capacity (`recommendedIds` / `parseLeadingNumber`); top-3 meet-or-exceed fits flagged "Recommended" and floated to the top
- [x] **Company branding engine** — Quotation PDF now uses each company's `accent` colour for the header band, line-item header row, page-2 header and divider (`hexToRgb` in quotation-pdf.ts). _(Logo image embedding still pending — needs an uploaded asset / async image load.)_
- [x] **Page 2 Terms & Conditions** — Verified: exactly 13 STG clauses in `STG_TERMS`, no extra content (quotation-pdf.ts)
- [x] **Mobilization costs as dedicated field** — `Quotation.mobilizationCharge` + `demobilizationCharge`; dedicated inputs in commercial terms, shown as separate lines in the on-screen totals and on the PDF totals block; included in subtotal/GST/grand total
- [x] **Customer response tracking** — `Quotation.customerResponse` (accepted / too_costly / need_discount / competitor_quote / requirement_change / under_review / no_response); chip selector on the quotation page logs an activity and auto-moves the lead to `negotiation` on a price-related response
- [x] **View tracking** — `Quotation.viewedAt` + `viewCount`; "Mark as viewed" records the view, increments the counter, logs an activity, and shows in version history
- [x] **Validity expiry automation** — escalation engine: 2 days before → reminder, 1 day before → reminder, on/after validity date → auto-mark `expired` + notify handler + activity log (escalation.ts)
- [x] **Quote aging analytics** — 0-3 / 4-7 / 8-15 / 15+ day aging buckets for sent quotations on the quotations page
- [x] **Conversion analytics** — Total / accepted / conversion % / in-negotiation / won revenue / avg value cards on the quotations page
- [x] **Quotation lock engine** — Accepted quotations are immutable (each save creates a new version, never mutating the accepted record); locked banner shown, view/download/revision still allowed (`isLocked`)
- [x] **Customer acceptance engine** — Accept with PO/LOI reference + remark, sets `accepted` status, audit activity, enables proforma invoice (PaymentCard / `acceptQuotation`)
- [x] **DB columns added** — `quotations` table extended with `mobilization_charge`, `demobilization_charge`, `viewed_at`, `view_count`, `customer_response`, `customer_response_note`, `customer_response_at`, `locked_at`; status CHECK now includes `pending_approval` (schema.sql + supabase-adapter.ts). Tracking is denormalised onto the `quotations` row rather than spread across 20+ side tables.

### ❌ Not Implemented / Incomplete

- [ ] **Document management** — Upload GST certificate, PO, site files, drawings, customer docs (needs Supabase Storage)
- [ ] **Equipment photos on quotation PDF** — Needs async machine-image loading + `addImage`; machine-image validation already blocks PDF when `imageUrl` is missing, but embedding the photo is not wired
- [ ] **Negotiation escalation engine** — Round 1 → Executive, Round 2 → +Manager, Round 3 → +Admin, After 3 → MD (partial: Phase 3 escalates to MD after 3 rounds, but the per-round Manager/Admin ladder is not built)
- [ ] **View tracking — IP/device capture** — Manual "Mark as viewed" only; real viewed date/time/by/IP/device requires a public view endpoint / backend

---

## Phase 7 — Proforma Invoice & Payment Engine (~55% complete)

### ✅ Already Implemented

- [x] Proforma invoice page (proforma.$leadId.tsx)
- [x] PDF generation (proforma-pdf.ts)
- [x] Basic payment tracking (Payment type in store — stage: none/proforma_sent/advance_paid/fully_paid)
- [x] Mark advance received / fully paid buttons
- [x] **Quotation acceptance workflow** — Accept button with PO/LOI/Work Order reference + acceptance remark collection; status set to "accepted" with full audit trail
- [x] **Quotation → Work Order conversion** — "Convert to Work Order" button appears after acceptance; creates Work Order document with auto-generated number (PREFIX-WO-YYYY-####); stores PO reference
- [x] **Invoice number engine** — Format: STG-PI-YYYY-0001, auto increment, no duplicates (already existed, now also for Work Orders)
- [x] **Transfer to proforma invoice** — Auto-copies all data from accepted quotation/Work Order; shows WO reference on PI
- [x] **Bank details engine** — Company-wise bank accounts displayed on PI; QR code generation for UPI payments
- [x] **QR code engine** — UPI QR code generation using `qrcode` library; displays on form/preview; toggle show/hide
- [x] **Payment tracking engine** — Statuses extended: Draft, Sent, Partially Paid, Advance Paid, Fully Paid; tracks invoice amount, received, balance, reference
- [x] **Receive payment engine** — Record payment with Amount, Date, Mode (NEFT/RTGS/UPI/Cheque/Cash/Card/Other), Reference, Remarks; auto updates balance/status/audit
- [x] **TDS engine** — Support 0/1/2/5/10% TDS; auto calculates TDS amount, shows net receivable; tracks TDS per payment record
- [x] **WhatsApp share** — Opens WhatsApp with pre-filled PI details + payment request message
- [x] **Email share** — Opens email client with pre-filled PI subject/body
- [x] **Payment records** — `payment_records` table tracks individual receipts with mode, reference, TDS, status
- [x] **Invoice status history** — `invoice_status_history` table tracks all status changes with timestamps
- [x] **Work Order type** — `WorkOrder` interface + `work_orders` table; full DB schema, adapter, store integration
- [x] **Extended Payment type** — `tdsPercent`, `tdsAmount` fields added; `partially_paid` stage added to PaymentStage

### ❌ Not Implemented / Incomplete

- [ ] **Razorpay payment link engine** — Global toggle ON/OFF; generate link, generate QR, PAY NOW button on invoice/PDF/WhatsApp/Email
- [ ] **Recipient selection engine** — Load company email/mobile, MD email/mobile, delivery contact, executive/manager/admin/MD; select individual/multiple/all, add/remove recipients
- [ ] **WhatsApp/Email delivery tracking** — Track delivery/read status, store logs (wa.me links only)
- [ ] **Resend engine** — Load previous recipients, allow new recipients, create audit log
- [ ] **Reminder engine** — Day 1 → Customer + Executive; Day 3 → +Manager; Day 5 → +Admin; Day 7 → +MD
- [ ] **Payment proof upload** — Upload UTR, Bank Receipt, NEFT, RTGS, Screenshot; store against invoice
- [ ] **Instalment engine** — Multiple instalments, auto update running balance, payment timeline, overdue tracking
- [ ] **Payment approval workflow** — Executive receives → Accounts verification → Approve → Mark Paid → Enable Tax Invoice
- [ ] **Payment validation** — Block: negative payments, duplicate transaction IDs, overpayment, invalid payment modes
- [ ] **Invoice edit system** — Add/Edit machine, quantity, duration, pricing, services; every change creates version + audit log
- [ ] **Customer history panel** — Show previous quotations, proforma invoices, tax invoices, outstanding, paid, collection, payment history
- [ ] **Analytics** — Outstanding amount, collection rate, revenue, paid/partial/pending invoices
- [ ] **Overdue escalation engine** — 30 days → reminder; 60 days → admin escalation; 90 days → legal + account freeze
- [ ] **Freeze logic** — When frozen: no new quotation, no new invoice, warning banner, MD override available
- [ ] **Missing DB tables:**
- `payment_instalments` — instalment tracking

---

## Phase 8 — Tax Invoice Management (~65% complete)

### ✅ Already Implemented

- [x] Tax invoice page (tax-invoice.$leadId.tsx)
- [x] PDF generation (tax-invoice-pdf.ts)
- [x] GST calculations (CGST/SGST/IGST)
- [x] Invoice number auto-generation (PREFIX-INV-YYYY-####)
- [x] HSN/SAC code per company
- [x] **Convert To Tax Invoice** — Button visible ONLY when Payment Status is advance_paid/partially_paid/fully_paid; shows locked state with guidance if payment not received
- [x] **Auto copy from Proforma** — Customer details, GST, machine, charges, taxes, bank, payment details auto-copied from latest sent proforma; shows banner with reference
- [x] **GST compliance** — HSN/SAC codes per line item, Place of Supply, GST Number, Invoice Date, Tax Invoice Number; intra/inter-state detection with IGST/CGST+SGST labels
- [x] **Tax invoice PDF** — Already includes: Company branding (name/address/GSTIN), customer details + GST, line items with SAC codes, GST breakdown, advance received deduction, balance due, bank details (page 2), authorized signature, declaration
- [x] **Invoice status history** — `invoice_status_history` table; tracks Draft → Sent transitions with changed by/date/remarks; displayed in right sidebar
- [x] **Send options** — WhatsApp share (opens wa.me with pre-filled invoice message), Email share (opens mailto with subject/body), PDF Download
- [x] **Payment records display** — Shows all payment records with amount, mode, reference, status in right sidebar

### ❌ Not Implemented / Incomplete

- [ ] **Tax invoice PDF improvements:**
- Machine images
- Rental duration
- Terms & Conditions
- Watermark for revisions
- [ ] **Communication logs** — Store: recipient, method (Email/Mobile), delivery status, read status, timestamp
- [ ] **Send history tracking** — Store all send attempts with status

---

## Phase 9 — Customer Lifecycle Management (~10% complete)

### ✅ Already Implemented

- [x] Customer list page (customers.tsx)
- [x] Basic customer metrics (total, active, re-engage, at risk, repeat)
- [x] Customer recognition by phone number (in selectors.ts — buildCustomerList)
- [x] Basic customer grouping by phone

### ❌ Not Implemented / Incomplete

- [ ] **Permanent Customer Registry** (`customers` table) — When lead status = converted, auto move to permanent customer. Never delete.
- [ ] Table fields: id, company_id, customer_name, mobile, email, gst, address, city, state, customer_type, last_order_date, lifetime_value, status, created_at
- [ ] **Customer 360 engine** — Display: name, company, GST, address, contact, total requirements/quotations/proforma/tax invoices, revenue, outstanding, collection rate, active/completed/cancelled projects, last activity dates
- [ ] **Customer priority engine** — Auto classify: Bronze / Silver / Gold / Platinum based on revenue, repeat orders, project count, collection performance. Display badge.
- [ ] **Relationship score (0-100)** — Based on: payment speed, repeat orders, revenue, collection %, project success, customer age
- [ ] **Hold / Blacklist engine** — Admin can mark customer On Hold or Blacklisted with reason (Outstanding, Legal, Payment, Management Decision). When on hold: block new requirement, quotation, invoice creation. Admin override.
- [ ] **Outstanding warning engine** — When customer opens, check outstanding; if exists, show warning with amount and pending invoice count; allow continue/cancel; create audit log
- [ ] **Create New Requirement** button — Inside customer profile, creates new requirement linked to customer
- [ ] **Requirement number engine** — Format: REQ-YYYY-0001, auto increment, no duplicates
- [ ] **Requirement details form** — Full form with: title, machine category, machine type, platform height, working height, capacity, power supply, duration, quantity, location, project type, priority, expected dates, notes, attachments
- [ ] **Repeat Last Requirement** — Button: auto load previous machine, duration, height, location, rate, delivery, contact details. Allow edit before save. Don't modify old requirement.
- [ ] **Clone entire project** — Copy: requirement, machines, delivery, contacts, location, rental details, documents. Save as new requirement.
- [ ] **Smart requirement suggestion** — Analyze history: show previous machines used, most used machines/locations/durations/rates/project types. Suggest frequently used items.
- [ ] **Previous rate comparison** — Display: Previous Rate vs Current Rate with difference
- [ ] **Requirement history** — Show all requirements with ID, date, machine, duration, status, revenue, quotation/invoice number. Allow view, open, clone, archive.
- [ ] **Multi-branch customer** — Parent company + branch companies (e.g. L&T Chennai, L&T Bangalore); link all under parent
- [ ] **Contact history** — Track calls, meetings, site visits, WhatsApp, emails with date/time/executive/remarks/outcome
- [ ] **Customer timeline** — Chronological: requirement created, quotation generated/sent/accepted, proforma generated, payment received, tax invoice, project started/completed, new requirement
- [ ] **Executive reassignment** — When new requirement: assign previous or new executive; track old/new/reason/date
- [ ] **Customer reactivation** — Track activity: 30/60/90/180/365 days; if no activity → mark dormant. Actions: call, WhatsApp, email, create follow-up, create reactivation task
- [ ] **Customer merge engine** — Merge duplicates, preserve full history, audit mandatory
- [ ] **Customer value auto-classify** — Bronze/Silver/Gold/Platinum based on revenue, projects, repeat orders, payment history, collection
- [ ] **Revenue analytics** — Lifetime, current year, previous year; avg deal value, avg collection time, repeat %, highest invoice, total projects/quotations/revenue
- [ ] **Retention analytics** — Total repeat, repeat revenue, repeat %, retention %, lost %
- [ ] **Collection analytics** — Total invoiced, total collected, outstanding, collection %. Filters: monthly, quarterly, yearly, customer, executive
- [ ] **Requirement status engine** — Draft → Requirement Gathering → Quotation Pending → Quotation Sent → Negotiation → Accepted → Invoice Created → Payment Pending → Paid → Project Active → Completed → Cancelled
- [ ] **Document management** — Upload: requirement docs, site photos, drawings, technical documents, PO, WO, LOI. Preview, download, version history, audit logs.
- [ ] **Customer communication engine** — Call, WhatsApp, Email customer. Create logs.
- [ ] **Notifications** — Notify executive/manager/admin/MD for: new requirement, repeat, dormant, high value, project completion, reactivation
- [ ] **Automations** — New requirement: auto assign executive, create timeline/audit/notification, update dashboard. Dormant: auto create follow-up + reactivation task, notify executive.
- [ ] **Missing DB tables (15+):**
  - `customers`, `customer_requirements`, `customer_requirement_items`
  - `customer_requirement_history`, `customer_activity_timeline`
  - `customer_reactivation_logs`, `customer_revenue_analytics`
  - `customer_collection_analytics`, `customer_repeat_business`
  - `customer_classification`, `customer_notifications`, `customer_documents`
  - `customer_contact_history`, `customer_relationship_scores`
  - `customer_branches`, `customer_retention_analytics`

---

## Phase 10 — MD / Super Admin Dashboard (~25% complete)

### ✅ Already Implemented

- [x] Admin dashboard page (dashboard.tsx — AdminDashboard component)
- [x] Pipeline funnel (7 stages: New → Completed with counts)
- [x] Company breakdown cards (leads, active, revenue, pipeline per company)
- [x] Top KPI row (total leads, revenue, pipeline value, win rate)
- [x] Team activity & targets per executive
- [x] Customer re-engagement alerts (60+ days inactive)
- [x] Expiring quotation alerts (3 days)
- [x] Executive dashboard (ExecDashboard component — welcome, stats, deliveries, follow-ups, target, pipeline)

### ❌ Not Implemented / Incomplete

- [ ] **Consolidated lead pipeline** — Cross-company view with filters by company, executive, date, status, equipment
- [ ] **Executive performance panel** — Track: leads handled, conversion %, quotation count, revenue generated, follow-up performance, average response time, pending leads, target achievement
- [ ] **Revenue dashboard** — Daily/weekly/monthly/yearly revenue; company-wise revenue; executive-wise revenue; outstanding balance; collection efficiency
- [ ] **Escalation monitoring** — Missed follow-ups, 90-day overdue accounts, inactive leads, failed notifications, pending approvals
- [ ] **Competitor intelligence** — MD can store: competitor pricing, market demand, equipment trends, sales intelligence notes
- [ ] **Executive messaging** — MD can: send internal message, request update, escalate issue
- [ ] **90+ day stale lead detection** — Auto flag if inactive >90 days, show priority alert
- [ ] **Executive dashboard improvements:**
  - Urgent task banner (overdue follow-ups, pending quotation, delivery pending, payment issue)
  - Follow-up calendar (today, tomorrow, weekly)
  - Lead source analytics (IndiaMart, JustDial, WhatsApp, Referral, Walk-in)
  - Recent activity feed (new leads, follow-ups, quotation updates, payment updates)
  - Quick actions (create lead, quotation, invoice, follow-up)
- [ ] **Analytics & KPI engine with charts:**
  - Conversion rate, lead source ROI, quotation conversion, revenue per executive
  - Average sales cycle, follow-up effectiveness, lost reason analytics
  - Equipment demand trends, monthly performance, payment efficiency, outstanding payments, company growth
  - Visualizations: line charts, bar charts, pie charts, trend reports, heatmaps
  - Filters: date range, company, executive, lead source, equipment, status
- [ ] **Missing DB tables:**
  - `competitor_intelligence` — id, company_name, pricing_notes, market_notes, equipment_trends, created_by, created_at
  - `md_messages` — id, from_user, to_user, message, message_type, read_status, created_at
  - `stale_lead_flags` — id, lead_id, days_inactive, flagged_at, flagged_by, resolved_at

---

## Phase 11 — Integrations (WhatsApp + JustDial + IndiaMart) (~5% complete)

### ✅ Already Implemented

- [x] WhatsApp template hub page (whatsapp.tsx)
- [x] WhatsApp deep links (opens wa.me with pre-filled message)
- [x] Message templates in lead detail (5 templates: Enquiry, Quotation, Follow-up, Payment, Delivery)

### ❌ Not Implemented / Incomplete

- [ ] **WhatsApp Business API engine:**
  - Inbound leads (auto create lead from WhatsApp message)
  - Outbound: quotation send, invoice send, follow-up reminder, payment reminder, delivery updates, return reminders
  - Store full message history
- [ ] **`whatsapp_logs` table** — id, lead_id, customer_id, direction (inbound/outbound), message_type, message_content, media_url, delivery_status, read_status, sent_at, delivered_at, read_at, created_by
- [ ] **JustDial webhook engine:**
  - Auto create lead from webhook payload
  - Map: name → customer_name, phone → mobile_number, service_request → requirement_text, city → city, equipment → identified_product
  - Auto assign company using product intelligence
  - Store webhook payload, create audit log
- [ ] **IndiaMart webhook engine:**
  - Auto import leads
  - Detect: equipment type → identified_product, location → city, priority → lead priority
  - Auto assign company
  - Store payload, create audit log
- [ ] **Webhook failure handling:**
  - Add to retry queue on failure
  - Log failure with reason
  - Send admin alert
  - Auto retry (3 attempts)
  - If still failed → manual review queue
- [ ] **`webhook_failure_logs` table** — id, source (justdial/indiamart/whatsapp), payload, error_reason, retry_count, resolved, created_at
- [ ] **Webhook security:**
  - Webhook signature validation
  - Source IP whitelist
  - API key validation
  - Rate limiting

---

## Phase 12 — Fleet Register & Active Projects (~2% complete)

### ✅ Already Implemented

- [x] Delivery date field on requirement form
- [x] Deliveries page (basic — lists requirements with delivery dates, color-coded urgency)
- [x] Basic delivery reminder state (≤2 hours, ≤1 day, ≤2 days)

### ❌ Not Implemented / Incomplete

- [ ] **`fleet_registry` table** — machine_id, machine_name, machine_type, company_id, availability_status (Available/Reserved/Under Maintenance/Booked), maintenance_due, yard_location, condition_status, operator_assigned, last_inspection_date
- [ ] **`fleet_maintenance_logs` table** — id, machine_id, maintenance_type, maintenance_date, description, cost, performed_by, next_due_date
- [ ] **`fleet_breakdown_reports` table** — id, machine_id, report_date, breakdown_type, description, reported_by, resolved_at, resolution_notes
- [ ] **`active_projects` table** — id, lead_id, customer_id, machine_id, operator_id, project_start/end_date, project_status, delivery/return dates, extension_count
- [ ] **`delivery_schedules` table** — id, project_id, scheduled/actual_date, delivered_by, delivery_notes, status
- [ ] **`return_inspections` table** — id, project_id, machine_id, inspection_date, condition (Good/Minor/Major Damage), damage_notes, service_required, pending_dues, inspected_by
- [ ] **`operator_logs` table** — id, machine_id, operator_name, project_id, assigned_date, released_date, performance_notes
- [ ] **Equipment availability engine** — Real-time availability of all machines, filter by type/company/status, show availability date if booked/maintenance
- [ ] **Maintenance tracking** — Schedule maintenance, track history, alert when due, block booking if under maintenance
- [ ] **Breakdown reports** — Log breakdown, track resolution, notify team
- [ ] **Project extension** — Allow duration extension, track count, update availability
- [ ] **Operator logs** — Assign operator to machine, track assignment history
- [ ] **Return inspections** — Check damage, working condition, pending dues, service requirement. Create inspection report.
- [ ] **Delivery scheduling** — Schedule delivery, confirm delivery, track actual vs scheduled
- [ ] **Availability logic before quotation** — Check machine availability; if not available → show alert, suggest alternative, show availability date; admin override with log
- [ ] **Return inspection workflow** — When machine returns, check: damage, working condition, pending dues, service requirement
- [ ] **Automations** — Auto alert when maintenance due; auto update machine status on project start/end; auto notify on return; auto flag overdue; auto create service ticket on breakdown

---

## Phase 13 — Export + Notifications + Offline Mode (~5% complete)

### ✅ Already Implemented

- [x] PDF download for quotations and invoices
- [x] Notification center page (notifications.tsx — computes alerts from in-memory data)

### ❌ Not Implemented / Incomplete

- [ ] **Export engine:**
  - CSV, Excel, PDF formats
  - Modules: Leads, Customers, Payments, Quotations, Invoices, Fleet, Revenue
  - Filters: date range, company, executive, status
  - Large data handling
- [ ] **Centralized notification center:**
  - Channels: WhatsApp, Email, Push Notification, In-App Notification
  - Read/Unread status, priority tags
  - Retry failed notification, notification history, mark complete
  - Auto notifications for: lead assigned, follow-up reminder, quotation approved, payment overdue, delivery update, project delay
- [ ] **`notifications` table** — id, user_id, type, title, message, priority, read_status, channel, delivery_status, retry_count, created_at, read_at
- [ ] **Offline mode:**
  - Save locally when offline: lead form, quotation draft, follow-up notes, invoice draft
  - Auto sync when connection returns
  - Conflict resolution: merge choice, keep latest, manual compare
  - Failed request queue: store pending API calls, retry when online
- [ ] **`offline_sync_queue` table** — id, action_type, payload, entity_type, entity_id, sync_status, retry_count, created_at, synced_at

---

## Phase 14 — Security Hardening (~10% complete)

### ✅ Already Implemented

- [x] Role-based company isolation (selectors.ts — visibleLeads/canSeeLead)
- [x] Environment variables for secrets (.env.example, no hardcoded secrets in code)

### ❌ Not Implemented / Incomplete

- [ ] **Strict RLS policies on ALL tables** — Currently only permissive "allow all" policies exist. Need company-scoped policies.
- [ ] **SQL injection prevention** — Supabase parameterized queries handle this (✅).
- [ ] **XSS prevention** — React defaults handle most, but no explicit sanitization/escaping
- [ ] **CSRF prevention** — CSRF tokens on forms, validate request origin — NOT implemented
- [ ] **File validation** — Validate file type/size on upload, block executables, scan for malicious content — NOT implemented (no uploads yet)
- [ ] **Rate limiting** — Limit API calls per user, block brute force login — NOT implemented
- [ ] **IP tracking** — Log IP on login, alert on suspicious location — NOT implemented
- [ ] **Login protection** — Max 5 failed attempts → temp lock, re-authentication after 8 hours — NOT implemented
- [ ] **JWT validation** — Supabase handles JWT, but no custom validation layer — ⚠️ partial
- [ ] **Penetration testing** — None conducted
- [ ] **`security_audit_logs` table** — id, user_id, action, ip_address, device_info, success, failure_reason, created_at
- [ ] **Role isolation verification** — Verify exec A cannot see company B/C data
- [ ] **All security layers** — Not comprehensively implemented

---

## Phase 15 — Final QA + UAT + Go Live (~0% complete)

### ❌ Not Started

> Cannot begin until Phases 1-14 are complete.

- [ ] Functional testing — All phases 1-14
- [ ] Backend testing — DB integrity, foreign keys, edge functions, cron jobs
- [ ] Security testing — RLS, sessions, data privacy, penetration tests
- [ ] Performance testing — <3s load, pagination, no N+1, lazy loading, caching
- [ ] Mobile testing — Responsive, tablet, desktop, all buttons/forms/modals on mobile
- [ ] Go-live checklist:
  - Production environment configured
  - Backup strategy
  - Error monitoring
  - Logging active
  - Notification services live
  - API credentials in environment variables
  - Webhook validation active
  - SSL certificate active
  - Domain configured
  - CORS configured correctly

---

## Critical Infrastructure Gaps (Cross-cutting)

### Data Layer

- [ ] **Supabase NOT connected** — Schema exists, adapter code written, but app uses in-memory store falling back to seed data
- [ ] **Auth is mock** — Role switcher instead of real Supabase Auth
- [ ] **No real-time** — Phase docs require instant dashboard updates; no Supabase realtime subscriptions
- [ ] **No database persistence** — All data lost on page refresh (stored in memory)

### Communications

- [x] **WhatsApp** — wa.me deep links on quotation, proforma, tax invoice pages with pre-filled messages
- [x] **Email** — mailto deep links on quotation, proforma, tax invoice pages with pre-filled subject/body
- [x] **Activity logging** — Each WhatsApp/Email share creates an activity log entry on the lead timeline
- [ ] **WhatsApp Business API** — Auto send, delivery tracking, read receipts, message history — NOT implemented
- [ ] **Email server** — Auto send via SMTP/API, delivery tracking, open tracking — NOT implemented
- [ ] **SMS** — Not implemented at all
- [ ] **Push notifications** — Not implemented

### Backend

- [ ] **No cron jobs** — Reminders, expiry checks, escalation depend on backend scheduler
- [ ] **No error monitoring** — No Sentry/Datadog/etc.
- [ ] **No logging system** — Beyond console.log
- [ ] **No API rate limiting**
- [ ] **No proper error boundaries** — `error-capture.ts` exists but coverage unknown

### UI/UX

- [ ] **No loading states** — Many pages don't show loading indicators during data fetch
- [ ] **No empty states** — Some pages handle empty data, others don't
- [ ] **No pagination** — Large datasets will cause performance issues
- [ ] **Mobile responsiveness** — Not fully verified across all pages
