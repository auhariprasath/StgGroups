CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 13 — EXPORT ENGINE + NOTIFICATION CENTER + OFFLINE MODE + AUTO SYNC

STRICT RULE:
DO NOT PROCEED UNTIL:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ TESTED
✓ SELF-QA PASSED

NO PLACEHOLDERS. NO MOCK DATA. EVERYTHING REAL.

=========================================================
PART A — EXPORT ENGINE
=========================================================

SUPPORT EXPORT FORMATS:
- CSV
- Excel
- PDF

EXPORT MODULES:
- Leads
- Customers
- Payments
- Quotations
- Invoice history
- Fleet report
- Revenue report

FILTERS FOR EXPORT:
- Date range
- Company
- Executive
- Status

TESTING:
✓ Export accuracy verified
✓ File generation works
✓ Correct formatting
✓ Large data handling tested

=========================================================
PART B — NOTIFICATION CENTER
=========================================================

CENTRALIZED NOTIFICATION SYSTEM.

CHANNELS:
- WhatsApp
- Email
- Push Notification
- In-App Notification

FEATURES:
- Read/Unread status
- Priority tags
- Retry failed notification
- Notification history
- Mark complete

AUTO NOTIFICATIONS FOR:
- Lead assigned
- Follow-up reminder
- Quotation approved
- Payment overdue
- Delivery update
- Project delay

TABLE: notifications
- id
- user_id
- type
- title
- message
- priority
- read_status
- channel
- delivery_status
- retry_count
- created_at
- read_at

TESTING:
✓ Delivery success verified
✓ Retry logic works
✓ Notification logs stored
✓ Read status works
✓ Priority tags work

=========================================================
PART C — OFFLINE MODE + AUTO SYNC
=========================================================

OBJECTIVE: CRM MUST WORK IN LOW INTERNET CONDITIONS.

SAVE LOCALLY WHEN OFFLINE:
- Lead form
- Quotation draft
- Follow-up notes
- Invoice draft

AUTO SYNC WHEN CONNECTION RETURNS.

CONFLICT RESOLUTION:
IF SAME RECORD UPDATED OFFLINE AND ONLINE:
- Show merge choice
- Keep latest
- Manual compare option

FAILED REQUEST QUEUE:
- Store pending API calls
- Retry automatically when online

TABLE: offline_sync_queue
- id
- action_type
- payload
- entity_type
- entity_id
- sync_status
- retry_count
- created_at
- synced_at

TESTING:
✓ Offline save works
✓ Auto sync works
✓ Duplicate prevention during sync
✓ Merge logic works
✓ Retry works
✓ No data loss

=========================================================
QA GATE — PHASE 13
=========================================================

VERIFY:
✓ Export engine works (CSV/Excel/PDF)
✓ All export modules work
✓ Notification center works
✓ All channels deliver
✓ Retry logic works
✓ Offline mode works
✓ Auto sync works
✓ No data loss
✓ No broken buttons
✓ No console errors
✓ Backend verified

ONLY THEN MOVE TO PHASE 14.