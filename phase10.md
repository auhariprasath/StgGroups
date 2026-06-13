CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 10 — MD / SUPER ADMIN ENTERPRISE DASHBOARD

STRICT RULE:
DO NOT PROCEED UNTIL:
✓ FULLY IMPLEMENTED
✓ FRONTEND CONNECTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ ROLE TESTED
✓ ANALYTICS VERIFIED
✓ SELF-QA PASSED

NO PLACEHOLDERS. NO MOCK DATA. EVERYTHING MUST CONNECT TO REAL SUPABASE.

=========================================================
OBJECTIVE
=========================================================

BUILD AN ENTERPRISE EXECUTIVE DASHBOARD FOR MD / SUPER ADMIN.

MD HAS READ-ONLY GLOBAL VIEW ACROSS:
- STG RENTALS
- STG INFRA EQUIPMENT
- STG TRADING CORP

=========================================================
FEATURE 1 — CONSOLIDATED LEAD PIPELINE
=========================================================

SHOW:
- New leads
- Follow-ups
- Quotation pending
- Negotiation stage
- Active projects
- Completed deals
- Lost leads
- Stale leads

FILTER BY: Company, Executive, Date, Status, Equipment

=========================================================
FEATURE 2 — EXECUTIVE PERFORMANCE PANEL
=========================================================

TRACK:
- Leads handled
- Conversion %
- Quotation count
- Revenue generated
- Follow-up performance
- Average response time
- Pending leads
- Target achievement

=========================================================
FEATURE 3 — REVENUE DASHBOARD
=========================================================

SHOW:
- Daily revenue
- Weekly revenue
- Monthly revenue
- Yearly revenue
- Company-wise revenue
- Executive-wise revenue
- Outstanding balance
- Collection efficiency

=========================================================
FEATURE 4 — ESCALATION MONITORING
=========================================================

SHOW:
- Missed follow-ups
- 90-day overdue accounts
- Inactive leads
- Failed notifications
- Pending approvals

=========================================================
FEATURE 5 — COMPETITOR INTELLIGENCE
=========================================================

ALLOW MD TO STORE:
- Competitor pricing
- Market demand
- Equipment trends
- Sales intelligence notes

=========================================================
FEATURE 6 — EXECUTIVE MESSAGING
=========================================================

ALLOW MD TO:
- Send internal message
- Request update
- Escalate issue

=========================================================
FEATURE 7 — 90+ DAY STALE LEAD DETECTION
=========================================================

IF LEAD INACTIVE >90 DAYS:
- AUTO FLAG
- SHOW PRIORITY ALERT

=========================================================
EXECUTIVE DASHBOARD (ROLE-BASED)
=========================================================

EACH EXECUTIVE SEES ONLY THEIR COMPANY DATA.

FEATURES:

1. URGENT TASK BANNER:
- Overdue follow-ups
- Pending quotation
- Delivery pending
- Payment issue

2. FOLLOW-UP CALENDAR:
- Today, Tomorrow, Weekly schedule

3. MONTHLY TARGET PROGRESS:
- Visual KPI ring: Target achieved %

4. LEAD SOURCE ANALYTICS:
- IndiaMart, JustDial, WhatsApp, Referral, Walk-in

5. RECENT ACTIVITY FEED:
- New leads, Follow-ups, Quotation updates, Payment updates

6. QUICK ACTIONS:
- Create: Lead, Quotation, Invoice, Follow-up

=========================================================
ANALYTICS & KPI ENGINE
=========================================================

METRICS:
- Conversion rate
- Lead source ROI
- Quotation conversion
- Revenue per executive
- Average sales cycle
- Follow-up effectiveness
- Lost reason analytics
- Equipment demand trends
- Monthly performance
- Payment efficiency
- Outstanding payments
- Company growth

VISUALIZATION:
- Line charts
- Bar charts
- Pie charts
- Trend reports
- Heatmaps

FILTERS: Date range, Company, Executive, Lead source, Equipment, Status

=========================================================
DATABASE TABLES
=========================================================

Use existing data from:
leads, lead_followups, quotations, invoice_master, payments, customers

Add:
TABLE: competitor_intelligence
- id
- company_name
- pricing_notes
- market_notes
- equipment_trends
- created_by
- created_at

TABLE: md_messages
- id
- from_user
- to_user
- message
- message_type
- read_status
- created_at

TABLE: stale_lead_flags
- id
- lead_id
- days_inactive
- flagged_at
- flagged_by
- resolved_at

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

VERIFY:
✓ Cross-company visibility for MD
✓ Company isolation for executives
✓ Dashboard accuracy
✓ Filters work
✓ Real-time updates
✓ Analytics accurate
✓ Charts render correctly
✓ Stale lead detection works
✓ Executive performance accurate
✓ Revenue numbers accurate
✓ Competitor intelligence saves
✓ MD messaging works
✓ Mobile responsive
✓ No console errors
✓ Backend verified

=========================================================
QA GATE — PHASE 10
=========================================================

VERIFY:
✓ MD sees all companies
✓ Executives see only their company
✓ All dashboard features work
✓ Analytics accurate
✓ Charts work
✓ Filters work
✓ Real-time sync works
✓ Stale lead detection works
✓ No broken buttons
✓ No console errors
✓ Audit logs complete

ONLY THEN MOVE TO PHASE 11.