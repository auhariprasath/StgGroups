CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 9 — EXISTING CUSTOMER REPEAT REQUIREMENT & CUSTOMER LIFECYCLE MANAGEMENT ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL:
✓ FULLY IMPLEMENTED
✓ FRONTEND CONNECTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ SUPABASE VERIFIED
✓ API VERIFIED
✓ RLS VERIFIED
✓ ROLE TESTED
✓ AUTOMATIONS TESTED
✓ NOTIFICATIONS TESTED
✓ SELF-QA PASSED

NO PLACEHOLDER UI. NO MOCK DATA. NO DUMMY BUTTONS. NO FAKE API CONNECTIONS. NO BROKEN BUTTONS. EVERY BUTTON MUST WORK END-TO-END.

=========================================================
OBJECTIVE
=========================================================

ALLOW EXISTING CUSTOMERS TO RETURN AFTER DAYS, MONTHS OR YEARS WITHOUT CREATING DUPLICATE CUSTOMERS.

CREATE A NEW REQUIREMENT.
START A NEW SALES CYCLE.
MAINTAIN COMPLETE CUSTOMER HISTORY.
TRACK CUSTOMER LIFETIME VALUE.
TRACK REPEAT BUSINESS.
TRACK REVENUE HISTORY.
TRACK ALL PROJECTS.

=========================================================
CUSTOMER RECOGNITION ENGINE
=========================================================

DETECT EXISTING CUSTOMER USING:
✓ Mobile Number
✓ GST Number
✓ Company Name
✓ Email Address
✓ Customer ID

IF CUSTOMER EXISTS → SHOW: "EXISTING CUSTOMER FOUND"
LOAD CUSTOMER PROFILE. LOAD CUSTOMER HISTORY. LOAD CUSTOMER 360.

=========================================================
PERMANENT CUSTOMER REGISTRY
=========================================================

WHEN LEAD STATUS = CONVERTED → MOVE TO PERMANENT CUSTOMER DATABASE.
NEVER DELETE CUSTOMER.

TABLE: customers
- id
- company_id
- customer_name
- mobile
- email
- gst
- address
- city
- state
- customer_type
- last_order_date
- lifetime_value
- status
- created_at

WHEN CONVERTED: Auto create customer, link quotation, link invoice, link payments, link history.

=========================================================
CUSTOMER 360 ENGINE
=========================================================

DISPLAY:
- Customer Name, Company Name, GST Number, Address, Contact Person, Contact Number, Email
- Total Requirements, Total Quotations, Total Proforma Invoices, Total Tax Invoices
- Total Revenue, Outstanding Amount, Collection Rate
- Active Projects, Completed Projects, Cancelled Projects
- Last Requirement Date, Last Quotation Date, Last Invoice Date, Last Payment Date

=========================================================
CUSTOMER PRIORITY ENGINE
=========================================================

AUTO CLASSIFY:
Bronze / Silver / Gold / Platinum

DISPLAY BADGE: "ABC Constructions — PLATINUM CUSTOMER"

BASED ON: Revenue, Repeat Orders, Project Count, Collection Performance

=========================================================
CUSTOMER RELATIONSHIP SCORE ENGINE
=========================================================

CALCULATE SCORE: 0 TO 100

FACTORS: Payment Speed, Repeat Orders, Revenue, Collection %, Project Success, Customer Age

DISPLAY: 92 / 100

=========================================================
CUSTOMER HOLD / BLACKLIST ENGINE
=========================================================

ALLOW ADMIN TO MARK CUSTOMER:
- On Hold
- Blacklisted

REASONS: Outstanding Amount, Legal Issues, Payment Issues, Management Decision

IF ON HOLD → BLOCK: New Requirement, Quotation Creation, Invoice Creation
ALLOW OVERRIDE: ADMIN ONLY

=========================================================
OUTSTANDING WARNING ENGINE
=========================================================

WHEN CUSTOMER OPENS → CHECK OUTSTANDING

IF OUTSTANDING EXISTS:
- SHOW WARNING: Outstanding Amount, Pending Invoice Count
- ALLOW: Continue or Cancel
- CREATE AUDIT LOG

=========================================================
NEW REQUIREMENT ENGINE
=========================================================

BUTTON: CREATE NEW REQUIREMENT

AVAILABLE INSIDE: Customer Profile, Customer History, Customer 360

WHEN CLICKED:
- CREATE NEW REQUIREMENT
- LINK TO CUSTOMER
- CREATE TIMELINE ENTRY
- CREATE AUDIT LOG
- UPDATE DASHBOARD

=========================================================
REQUIREMENT NUMBER ENGINE
=========================================================

FORMAT: REQ-YYYY-0001
AUTO INCREMENT. NO DUPLICATES. DATABASE ENFORCED.

=========================================================
REQUIREMENT DETAILS FORM
=========================================================

FIELDS:
- Requirement Title
- Machine Category
- Machine Type
- Platform Height
- Working Height
- Capacity
- Power Supply (Diesel/Battery)
- Duration
- Quantity
- Location
- Project Type
- Priority
- Expected Start Date
- Expected End Date
- Customer Notes
- Internal Notes
- Attachments

=========================================================
REPEAT LAST REQUIREMENT ENGINE
=========================================================

BUTTON: REPEAT LAST REQUIREMENT

AUTO LOAD:
- Previous Machine, Duration, Height, Location, Rate, Delivery Details, Contact Details

ALLOW: Edit Before Save, Save As New Requirement

DO NOT MODIFY OLD REQUIREMENT.

=========================================================
CLONE ENTIRE PROJECT ENGINE
=========================================================

BUTTON: CLONE PREVIOUS PROJECT

COPY: Requirement, Machines, Delivery Details, Customer Contacts, Location, Rental Details, Documents

SAVE AS NEW REQUIREMENT.

=========================================================
SMART REQUIREMENT SUGGESTION ENGINE
=========================================================

ANALYZE CUSTOMER HISTORY.

SHOW:
- Previous Machines Used
- Most Used Machines
- Most Used Locations
- Most Used Durations
- Previous Rental Rates
- Previous Project Types

SUGGEST: Frequently Ordered Machines, Locations, Durations

=========================================================
PREVIOUS RATE COMPARISON ENGINE
=========================================================

DISPLAY:
Previous Rate: ₹120,000
Current Rate: ₹130,000
Difference: +₹10,000

=========================================================
REQUIREMENT HISTORY ENGINE
=========================================================

SHOW ALL REQUIREMENTS WITH:
- Requirement ID, Date, Machine, Duration, Status, Revenue, Quotation Number, Invoice Number

ALLOW: View, Open, Clone, Archive

=========================================================
MULTI BRANCH CUSTOMER ENGINE
=========================================================

SUPPORT: Parent Company + Branch Companies
EXAMPLE: L&T Chennai, L&T Bangalore, L&T Hyderabad
LINK ALL BRANCHES UNDER PARENT CUSTOMER.

=========================================================
CUSTOMER CONTACT HISTORY ENGINE
=========================================================

TRACK: Calls, Meetings, Site Visits, WhatsApp, Emails

STORE: Date, Time, Executive, Remarks, Outcome

=========================================================
CUSTOMER TIMELINE ENGINE
=========================================================

SHOW COMPLETE TIMELINE IN CHRONOLOGICAL ORDER:
- Requirement Created
- Quotation Generated
- Quotation Sent
- Quotation Accepted
- Proforma Invoice Generated
- Payment Received
- Tax Invoice Generated
- Project Started
- Project Completed
- New Requirement Created

=========================================================
EXECUTIVE REASSIGNMENT ENGINE
=========================================================

WHEN NEW REQUIREMENT CREATED — OPTION:
- Assign Previous Executive
- Assign New Executive

TRACK: Old Executive, New Executive, Reason, Date

=========================================================
CUSTOMER REACTIVATION ENGINE
=========================================================

TRACK CUSTOMER ACTIVITY: 30/60/90/180/365 Days

IF NO ACTIVITY → MARK CUSTOMER: Dormant

ACTIONS:
- Call Customer
- Send WhatsApp
- Send Email
- Create Follow-Up
- Create Reactivation Task

=========================================================
CUSTOMER MERGE ENGINE
=========================================================

ALLOW: Merge duplicates
PRESERVE: Full history, no data loss
AUDIT: Mandatory

=========================================================
CUSTOMER VALUE ENGINE
=========================================================

AUTO CLASSIFY: Bronze / Silver / Gold / Platinum
BASED ON: Revenue, Projects, Repeat Orders, Payment History, Collection Performance

=========================================================
CUSTOMER REVENUE ANALYTICS
=========================================================

TRACK:
- Lifetime Revenue
- Current Year Revenue
- Previous Year Revenue

CALCULATE:
- Average Deal Value
- Average Collection Time
- Repeat Business Percentage
- Highest Invoice Value
- Total Projects, Quotations, Revenue

=========================================================
CUSTOMER RETENTION ANALYTICS
=========================================================

TRACK:
- Total Repeat Customers
- Repeat Revenue
- Repeat Business %
- Customer Retention %
- Lost Customers %

=========================================================
CUSTOMER COLLECTION ANALYTICS
=========================================================

TRACK:
- Total Invoiced Amount
- Total Collected Amount
- Outstanding Amount
- Collection Percentage

FILTERS: Monthly, Quarterly, Yearly, Customer Wise, Executive Wise

=========================================================
REQUIREMENT STATUS ENGINE
=========================================================

STATUSES:
Draft → Requirement Gathering → Quotation Pending → Quotation Sent → Negotiation → Accepted → Invoice Created → Payment Pending → Paid → Project Active → Completed → Cancelled

STORE STATUS HISTORY. TRACK STATUS CHANGES.

=========================================================
DOCUMENT MANAGEMENT ENGINE
=========================================================

ALLOW UPLOAD: Requirement Documents, Site Photos, Customer Drawings, Technical Documents, Purchase Orders, Work Orders, LOI, Site Requirements

FEATURES: Preview, Download, Version History, Audit Logs

=========================================================
CUSTOMER COMMUNICATION ENGINE
=========================================================

ALLOW: Call Customer, WhatsApp Customer, Email Customer
CREATE LOGS FOR: Calls, WhatsApp, Email, Follow-Ups, Meetings

=========================================================
NOTIFICATION ENGINE
=========================================================

NOTIFY: Executive, Manager, Admin, MD

FOR:
- New Requirement
- Repeat Requirement
- Dormant Customer
- High Value Customer
- Project Completion
- Customer Reactivation

=========================================================
AUTOMATION ENGINE
=========================================================

WHEN NEW REQUIREMENT CREATED:
- AUTO ASSIGN EXECUTIVE
- CREATE TIMELINE ENTRY
- CREATE AUDIT LOG
- CREATE NOTIFICATION
- UPDATE DASHBOARD

WHEN DORMANT CUSTOMER DETECTED:
- AUTO CREATE FOLLOW-UP TASK
- AUTO CREATE REACTIVATION TASK
- AUTO NOTIFY EXECUTIVE

=========================================================
DATABASE TABLES REQUIRED
=========================================================

- customer_requirements
- customer_requirement_items
- customer_requirement_history
- customer_activity_timeline
- customer_reactivation_logs
- customer_revenue_analytics
- customer_collection_analytics
- customer_repeat_business
- customer_classification
- customer_notifications
- customer_documents
- customer_contact_history
- customer_relationship_scores
- customer_branches
- customer_retention_analytics

=========================================================
AUDIT LOG ENGINE
=========================================================

TRACK:
- Create Requirement
- Edit Requirement
- Delete Requirement
- Clone Requirement
- Repeat Requirement
- Assign Executive
- Status Change
- Upload Document
- Download Document
- Customer Reactivation
- Create Follow-Up

=========================================================
ZERO BROKEN BUTTON RULE
=========================================================

EVERY BUTTON MUST:
Click → Validate → Save To Supabase → Verify Database Update → Verify API Response → Refresh UI → Update Dashboard → Create Audit Log → Show Success Message → Retest

=========================================================
ERROR HANDLING ENGINE
=========================================================

SHOW CLEAR ERRORS:
- Customer Not Found
- Duplicate Requirement
- Database Failed
- API Failed
- Upload Failed
- Assignment Failed
- Validation Failed
- Notification Failed

NEVER FAIL SILENTLY.

=========================================================
TESTING (MANDATORY — ALL 19 TESTS)
=========================================================

TEST 1 - Existing Customer Detection: Mobile/GST/Company/Email detection works
TEST 2 - Customer 360: Revenue/Quotations/Invoices/Payments/Projects loaded
TEST 3 - Create New Requirement: Created, Number Generated, Dashboard Updated, Audit Log Created
TEST 4 - Repeat Last Requirement: Previous Data Loaded, New Created, Old Preserved
TEST 5 - Clone Project: Machines/Delivery/Documents Copied, New Requirement Created
TEST 6 - Previous Rate Comparison: Previous Rate Loaded, Difference Calculated, Display Correct
TEST 7 - Requirement Suggestions: Previous Machines/Rates Loaded, Suggestions Accurate
TEST 8 - Requirement History: History Loaded, Clone Works, Archive Works
TEST 9 - Contact History: Calls/Meetings/WhatsApp/Emails Logged
TEST 10 - Customer Timeline: Events Recorded, Correct Sequence, No Missing Events
TEST 11 - Dormant Customer Detection: Identified, Follow-Up Created, Reactivation Task Created
TEST 12 - Revenue Analytics: Lifetime/Current Revenue Accurate, Repeat Business Accurate
TEST 13 - Retention Analytics: Repeat Revenue/Retention %/Lost Customer % Accurate
TEST 14 - Collection Analytics: Outstanding/Collection Percentage Accurate
TEST 15 - Document Management: Upload/Preview/Download/Version History Works
TEST 16 - Executive Reassignment: Works, History Stored, Audit Log Created
TEST 17 - Customer Hold Engine: Hold Applied, Quotation Blocked, Invoice Blocked, Override Works
TEST 18 - Notifications: Executive/Manager/Admin/MD Notified
TEST 19 - Backend Verification: Supabase Inserts/Updates, RLS Policies, API Responses, No Errors, No Orphan Records

IF FAILED → AUTO DEBUG → FIX → RETEST → DO NOT CONTINUE

=========================================================
FINAL QA GATE — PHASE 9
=========================================================

VERIFY:
✓ Existing Customer Detection Works
✓ Customer 360 Works
✓ Customer Priority Works
✓ Relationship Score Works
✓ New Requirement Works
✓ Repeat Requirement Works
✓ Clone Project Works
✓ Previous Rate Comparison Works
✓ Requirement Suggestions Work
✓ Requirement History Works
✓ Contact History Works
✓ Timeline Works
✓ Reactivation Works
✓ Revenue Analytics Works
✓ Retention Analytics Works
✓ Collection Analytics Works
✓ Multi Branch Support Works
✓ Hold Engine Works
✓ Document Management Works
✓ Notifications Work
✓ Audit Logs Work
✓ Backend Verified
✓ Frontend Verified
✓ Database Verified
✓ Supabase Verified
✓ Mobile Responsive
✓ Tablet Responsive
✓ Desktop Responsive
✓ No Broken Buttons
✓ No Failed API Calls
✓ No Console Errors
✓ All Automations Tested
✓ All Roles Tested

ONLY AFTER ALL ITEMS PASS → MARK PHASE 9 COMPLETE → MOVE TO PHASE 10.