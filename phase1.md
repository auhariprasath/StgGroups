CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 1 — LEAD CAPTURE ENGINE

STRICT RULE:
DO NOT PROCEED TO THE NEXT PHASE UNTIL THE CURRENT PHASE HAS BEEN:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ ROLE TESTED
✓ AUTOMATIONS TESTED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDER UI.
NO MOCK DATA.
NO FAKE API CONNECTIONS.
NO PARTIAL FEATURES.

=========================================================
BUSINESS STRUCTURE
=========================================================

PARENT GROUP: STG GROUPS

COMPANIES:
1. STG RENTALS
2. STG INFRA EQUIPMENTS
3. STG TRADING CORPORATION LTD

STG RENTALS PRODUCTS:
- BOOM LIFT
- SCISSOR LIFT
- MAN LIFT
- SPIDER LIFT
DEFAULT HANDLER: A

STG INFRA EQUIPMENTS PRODUCTS:
- MOTOR GRADER
- VIBRATORY ROLLER
- SOIL COMPACTOR
- MINI TANDEM ROLLER
- SELF LOADING CONCRETE MIXER
DEFAULT HANDLER: B

STG TRADING CORPORATION LTD PRODUCTS:
- TYRES
- FILTERS
DEFAULT HANDLER: C

=========================================================
USER ROLE STRUCTURE
=========================================================

SUPER ADMIN (CLIENT/OWNER):
CAN: VIEW ALL COMPANIES, VIEW ALL LEADS, VIEW DASHBOARDS, VIEW TRANSFERS, VIEW REPORTS, MONITOR PERFORMANCE
CANNOT: HANDLE LEADS, EDIT LEAD WORKFLOW, PERFORM FOLLOW-UP

COMPANY USERS:
A → STG RENTALS
B → STG INFRA EQUIPMENTS
C → STG TRADING CORPORATION LTD
EACH USER CAN ONLY ACCESS THEIR OWN COMPANY LEADS.
STRICT COMPANY ISOLATION REQUIRED.

=========================================================
LEAD SOURCES
=========================================================

SUPPORTED SOURCES:
✓ IndiaMart
✓ JustDial
✓ Phone Call
✓ WhatsApp
✓ Walk-In
✓ Reference
✓ Existing Customer
✓ Manual Entry

LEAD SOURCE MUST AUTO SAVE.

=========================================================
DATABASE TABLES REQUIRED
=========================================================

TABLE: leads
FIELDS:
- id (uuid)
- lead_id (auto generated unique format)
- customer_name
- mobile_number
- company_name (nullable)
- location
- city
- lead_source
- requirement_text
- identified_product
- assigned_company
- assigned_handler
- status
- priority
- notes
- created_at
- updated_at
- created_by
- is_duplicate
- duplicate_reference
- transfer_status
- last_activity_at

TABLE: lead_sources
- source_name
- source_type
- webhook_enabled
- status

TABLE: product_alias_mapping
- id
- keyword
- actual_product
- company
- confidence_score
- created_at

TABLE: lead_transfer_logs
- id
- lead_id
- from_company
- to_company
- transfer_reason_type
- transfer_note
- transferred_by
- created_at

TABLE: lead_activity_logs
- id
- lead_id
- action_type
- description
- user_name
- timestamp

TABLE: lead_assignment_history
- lead_id
- old_owner
- new_owner
- reason
- assigned_by
- timestamp

TABLE: existing_customer_history
- id
- customer_mobile
- previous_quotations
- previous_invoices
- previous_payments
- previous_followups

=========================================================
SMART PRODUCT INTELLIGENCE ENGINE — 4 LAYERS
=========================================================

LAYER 1 — EXACT MATCH
Example: "Boom Lift" → BOOM LIFT

LAYER 2 — ALIAS MATCH
"Durmo lifter" → BOOM LIFT
"Boom lifter" → BOOM LIFT
"Aerial Lift" → BOOM LIFT
"Road Roller" → VIBRATORY ROLLER
"Compactor" → SOIL COMPACTOR
"Mixer Vehicle" → SELF LOADING CONCRETE MIXER
"Oil Filter" → FILTERS
"Hydraulic Filter" → FILTERS

LAYER 3 — FUZZY MATCHING
"booom lifter" → BOOM LIFT
"vibratry roller" → VIBRATORY ROLLER

LAYER 4 — AI INTENT DETECTION
"Need lifting machine" → Lift category
"Need construction roller" → Roller category
ASSIGN CONFIDENCE SCORE.
IF CONFIDENCE > 85% → AUTO ASSIGN COMPANY
IF CONFIDENCE < 85% → SEND TO MANUAL REVIEW QUEUE

=========================================================
AUTO COMPANY ASSIGNMENT ENGINE
=========================================================

IF PRODUCT = BOOM LIFT / SCISSOR LIFT / MAN LIFT / SPIDER LIFT
→ AUTO ASSIGN: STG RENTALS, HANDLER: A

IF PRODUCT = MOTOR GRADER / VIBRATORY ROLLER / SOIL COMPACTOR / MINI TANDEM ROLLER / SELF LOADING CONCRETE MIXER
→ AUTO ASSIGN: STG INFRA EQUIPMENTS, HANDLER: B

IF PRODUCT = TYRES / FILTERS
→ AUTO ASSIGN: STG TRADING CORPORATION LTD, HANDLER: C

MATCH RULES:
- 100% exact match → auto assign
- 80%+ keyword match → auto assign
- AI confidence 85%+ → auto assign with note
- No match → manual review queue
- IF NO ACTION IN 4 HOURS → ESCALATE TO COMPANY ADMIN
- IF STILL UNRESOLVED → ESCALATE TO MD

=========================================================
LEAD ENTRY FORM
=========================================================

REQUIRED FIELDS:
- Customer Name
- Mobile Number
- Company Name
- Location
- Lead Source
- Equipment Required
- Assigned Executive
- Priority

OPTIONAL FIELDS:
- GST
- Email
- Description
- Alternate Number

VALIDATION:
- Mobile required
- Duplicate prevention required
- Email format validation
- GST validation
- NIL + REASON required for missing critical fields

=========================================================
LEAD LIST VIEW / DASHBOARD
=========================================================

FEATURES:
- Search
- Filter
- Sort
- Pagination
- Bulk actions

VIEWS:
- Kanban View
- Table View
- Pipeline View

PIPELINE COLUMNS:
1. NEW LEAD
2. CONTACTED
3. FOLLOW-UP
4. QUOTATION
5. CLOSED
6. TRANSFERRED LEAD

NEW LEADS MUST APPEAR INSTANTLY. REALTIME UPDATE REQUIRED.

FILTERS:
- company, executive, lead source, date, status, priority, city, equipment

SEARCH SUPPORT:
- mobile, customer name, company, GST, equipment

=========================================================
LEAD CARD UI
=========================================================

SHOW WITHOUT OPENING LEAD:
✓ Customer Name
✓ Mobile Number
✓ Product
✓ Lead Source
✓ Location
✓ Assigned Handler
✓ Status
✓ Created Time
✓ Priority

=========================================================
LEAD DETAILS SCREEN
=========================================================

SHOW:
- Customer details
- Lead source
- Requirement text
- Identified product
- Assigned company
- Assigned handler
- Timeline history
- Duplicate warning
- Existing customer history

BUTTONS:
✓ Open Lead
✓ Edit Lead
✓ Transfer Lead
✓ Existing Customer Check
✓ Mark Invalid
✓ Start Follow-Up

EVERY BUTTON MUST WORK PERFECTLY.

=========================================================
LEAD TRANSFER SYSTEM
=========================================================

ALLOW A/B/C TO TRANSFER LEADS.

WHEN TRANSFERRING — MANDATORY:
- SELECT COMPANY
- SELECT REASON TYPE
- ADD NOTE

TRANSFER REASON TYPES:
1. Wrong Product Match
2. Wrong Company Selection
3. Customer Changed Requirement
4. Internal Business Decision

WHEN TRANSFER HAPPENS — SYSTEM MUST:
1. CHANGE COMPANY
2. AUTO ASSIGN NEW HANDLER
3. PRESERVE HISTORY
4. PRESERVE SOURCE
5. PRESERVE NOTES
6. PRESERVE TIMELINE
7. PRESERVE CREATED DATE
8. CREATE TRANSFER LOG
9. NOTIFY NEW HANDLER
10. MOVE TO TRANSFERRED LEADS SECTION

=========================================================
TRANSFERRED LEADS SECTION
=========================================================

BUILD SPECIAL DASHBOARD COLUMN: TRANSFERRED LEADS
SHOW: customer name, from company, to company, transfer reason, note, transferred by, date
SUPER ADMIN MUST MONITOR THIS.

=========================================================
DUPLICATE DETECTION ENGINE
=========================================================

CHECK: mobile number
IF MATCH FOUND — SHOW POPUP: EXISTING CUSTOMER FOUND
DISPLAY:
✓ Previous Quotations
✓ Previous Invoices
✓ Previous Payments
✓ Previous Follow-Up History

OPTIONS:
1. OPEN EXISTING
2. CREATE NEW ENQUIRY

=========================================================
PHASE 1 AUTOMATIONS
=========================================================

- AUTO ASSIGN EXECUTIVE
- AUTO GENERATE AUDIT LOG
- AUTO STATUS: NEW
- AUTO NOTIFICATION TO EXECUTIVE
- AUTO COMPANY ROUTING
- AUTO DUPLICATE CHECK

=========================================================
REALTIME REQUIREMENTS
=========================================================

WHEN LEAD CREATED → INSTANTLY APPEAR ON DASHBOARD
WHEN TRANSFERRED → INSTANTLY MOVE DASHBOARD
WHEN EDITED → REFRESH INSTANTLY
NO PAGE REFRESH REQUIRED.

=========================================================
ERROR HANDLING
=========================================================

NEVER FAIL SILENTLY. SHOW REAL ERRORS:
- Database insert failed
- Company assignment failed
- Permission denied
- Transfer failed
- Product detection failed

=========================================================
BUTTON VERIFICATION RULE
=========================================================

EVERY BUTTON CLICK MUST EXECUTE:
1. VALIDATE
2. SAVE TO SUPABASE
3. VERIFY DB INSERT/UPDATE
4. REFRESH UI
5. VERIFY DASHBOARD UPDATE
6. VERIFY STATUS UPDATE
7. VERIFY REALTIME UPDATE
8. SHOW SUCCESS MESSAGE
IF FAIL → SHOW ERROR → AUTO DEBUG → FIX → RETEST

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

FRONTEND TESTING:
✓ all buttons work
✓ lead form works
✓ transfer modal works
✓ dashboard updates
✓ mobile responsive
✓ no broken UI

BACKEND TESTING:
✓ lead insert works
✓ update works
✓ transfer works
✓ duplicate detection works
✓ realtime works
✓ permissions work
✓ audit logs created

DATABASE TESTING:
✓ tables connected
✓ foreign keys valid
✓ realtime stable
✓ insert/update verified

ROLE TESTING:
A sees only STG RENTALS
B sees only STG INFRA
C sees only STG TRADING
SUPER ADMIN sees all

WORKFLOW TESTING:

TEST: IndiaMart lead: "Need Durmo lifter"
VERIFY: Durmo lifter → Boom Lift → STG Rentals → Handler A → Dashboard NEW LEAD

TEST: JustDial lead: "Need road roller"
VERIFY: Road Roller → Vibratory Roller → STG Infra → Handler B

TEST: Transfer workflow
VERIFY: History preserved, Handler changed, Transferred section updated

=========================================================
QA GATE — PHASE 1
=========================================================

VERIFY:
✓ lead saved
✓ company assigned
✓ notifications work
✓ permissions work
✓ audit logs work
✓ filters work
✓ search works
✓ duplicate logic works
✓ ALL BUTTONS WORK
✓ ALL BACKEND WORKS
✓ FRONTEND VERIFIED
✓ SUPABASE VERIFIED
✓ DASHBOARD WORKS
✓ TRANSFER WORKS
✓ DUPLICATE DETECTION WORKS
✓ REALTIME WORKS
✓ NO SILENT FAILURE
✓ NO BROKEN FLOW
✓ TESTING PASSED
✓ RETESTING PASSED
✓ ZERO CONSOLE ERRORS

IF ANYTHING FAILS: AUTO DEBUG → FIX → RETEST → VERIFY AGAIN
ONLY THEN MARK PHASE 1 COMPLETE AND MOVE TO PHASE 2.