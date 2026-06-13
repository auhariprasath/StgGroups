CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 6 — ENTERPRISE QUOTATION MANAGEMENT ENGINE

STRICT RULE:
DO NOT PROCEED TO THE NEXT MODULE UNTIL:
✓ FULLY IMPLEMENTED
✓ FRONTEND CONNECTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ SUPABASE VERIFIED
✓ ROLE TESTED
✓ AUTOMATIONS TESTED
✓ PDF VERIFIED
✓ WHATSAPP VERIFIED
✓ EMAIL VERIFIED
✓ APPROVAL FLOW VERIFIED
✓ REMINDER ENGINE VERIFIED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDER UI. NO MOCK DATA. NO DUMMY BUTTONS. NO FAKE API CONNECTIONS. NO PARTIAL FEATURES.

=========================================================
QUOTATION ENTRY RULES
=========================================================

ALLOW QUOTATION CREATION ONLY IF:
✓ Lead Assigned
✓ Requirements Completed
✓ Mandatory Follow-Up Exists
✓ Lead Not Lost
✓ Lead Not Dormant
✓ Duplicate Resolved
✓ Customer Exists

BLOCK QUOTATION CREATION IF ANY RULE FAILS.
SHOW ERROR. CREATE AUDIT LOG. STORE FAILURE REASON.

=========================================================
DATABASE TABLES REQUIRED
=========================================================

- quotations
- quotation_customer_details
- quotation_delivery_details
- quotation_items
- quotation_versions
- quotation_status_history
- quotation_documents
- quotation_audit_logs
- quotation_reminders
- quotation_negotiations
- quotation_views
- quotation_whatsapp_logs
- quotation_email_logs
- quotation_pdf_logs
- quotation_approvals
- quotation_machine_recommendations
- quotation_followup_tasks
- customer_response_tracking
- quotation_analytics
- quotation_conversion_analytics
- quotation_aging_analytics
- quotation_machine_availability

=========================================================
CUSTOMER AUTO-FILL ENGINE
=========================================================

WHEN LEAD SELECTED — AUTO LOAD:
- Customer Name
- Company Name
- Company GST
- Company Email
- Company Contact Number
- Company Address
- Previous Quotations
- Previous Invoices
- Previous Follow-Ups
- Previous Projects
- Customer Payment History

AUTO DETECT EXISTING CUSTOMER USING: GST / Mobile Number / Company Name / Email

IF CUSTOMER EXISTS — SHOW:
- Customer 360 View
- Previous Quotations
- Previous Invoices
- Active Projects
- Pending Payments
- Negotiation History

=========================================================
SECTION 1 — CUSTOMER DETAILS
=========================================================

FIELDS:
- Company Name (Required)
- Company GST Number (Required, validated)
- Company Email ID (Required, validated)
- Company Contact Number (Required)
- Company Landline Number
- Company Address (Required)
- Managing Director Name
- Managing Director Mobile Number
- Managing Director Email ID

=========================================================
SECTION 2 — DELIVERY DETAILS
=========================================================

FIELDS:
- Delivery Date (Required)
- Delivery Person Name (Required)
- Delivery Person Contact Number (Required)
- Delivery Person Email ID
- Delivery GST Number
- Delivery Address (Required)

=========================================================
MANDATORY REQUIREMENT VALIDATION
=========================================================

BEFORE QUOTATION CREATION — VERIFY REQUIREMENTS EXIST:

STG RENTALS: Height, Capacity, Lift Type, Duration, Location
STG INFRA: Machine Type, Project Duration, Site Condition, Location
STG TRADING: Brand, Product Type, Quantity, Model

IF REQUIREMENTS MISSING:
- BLOCK QUOTATION CREATION
- SHOW MISSING FIELDS
- CREATE AUDIT LOG

=========================================================
PRODUCT MASTER ENGINE
=========================================================

WHEN PRODUCT SELECTED — AUTO LOAD:
- Machine Image
- Make, Model
- Platform Height, Working Height
- Capacity, Machine Weight
- Engine, Drive Speed, Fuel Type
- Machine Specifications
- Rental Category
- Safety Notes

SUPPORTED PRODUCTS:
Boom Lift, Scissor Lift, Man Lift, Spider Lift,
Motor Grader, Vibratory Roller, Soil Compactor,
Mini Tandem Roller, Self Loading Concrete Mixer,
Tyres, Filters, Industrial Products

=========================================================
MACHINE IMAGE VALIDATION ENGINE
=========================================================

WHEN PRODUCT SELECTED → VERIFY IMAGE EXISTS
IF IMAGE NOT FOUND:
- BLOCK PDF GENERATION
- SHOW ALERT: "Machine Image Missing — Upload Required"
- CREATE AUDIT LOG

=========================================================
MACHINE AVAILABILITY ENGINE
=========================================================

BEFORE QUOTATION CREATION — CHECK MACHINE STATUS:
Available / Reserved / Under Maintenance / Booked

IF NOT AVAILABLE:
- SHOW WARNING
- DISPLAY AVAILABILITY DATE
- ALLOW OVERRIDE ONLY FOR ADMIN
- STORE OVERRIDE LOG

=========================================================
SMART MACHINE RECOMMENDATION ENGINE
=========================================================

ANALYZE: Working Height, Capacity, Terrain, Project Type

EXAMPLE: Need 60 Ft → Recommend: Genie Z60, JLG 600AJ

STORE RECOMMENDATION HISTORY.
ALLOW ACCEPT. ALLOW OVERRIDE.

=========================================================
SECTION 3 — QUOTATION TABLE
=========================================================

DYNAMIC GRID COLUMNS:
# | Item | Power Supply | Platform Working | Working Height | Duration | Quantity | Rate | Amount

POWER SUPPLY DROPDOWN: Diesel / Battery

FEATURES:
✓ Add Row
✓ Edit Row
✓ Delete Row
✓ Duplicate Row
✓ Reorder Row
✓ Unlimited Rows
✓ Auto Calculate Amount

=========================================================
COMMERCIAL CALCULATION ENGINE
=========================================================

AUTO CALCULATE (REAL-TIME, NO PAGE REFRESH):
- Sub Total
- Discount
- Taxable Value
- CGST
- SGST
- IGST
- Grand Total
- Amount In Words

=========================================================
QUOTATION NUMBER FORMAT
=========================================================

STG RENTALS: STG-REN-YYYY-0001
STG INFRA: STG-INF-YYYY-0001
STG TRADING: STG-TRD-YYYY-0001

NO DUPLICATES. DATABASE ENFORCED. AUTO INCREMENT.

=========================================================
QUOTATION STATUS ENGINE
=========================================================

STATUSES:
Draft → Pending Approval → Approved → Sent → Delivered → Viewed → Negotiation → Revised → Accepted → Rejected → Expired → Cancelled

STORE STATUS HISTORY. BLOCK INVALID STATUS CHANGES.

=========================================================
APPROVAL ENGINE
=========================================================

OPTIONAL TOGGLE: Enable Approval Before Sending

WORKFLOW:
Executive Creates Quote → Manager Approval → Quotation Can Be Sent

STORE APPROVAL HISTORY.

=========================================================
VERSION CONTROL ENGINE
=========================================================

SUPPORT: V1, V2, V3, V4, UNLIMITED REVISIONS

RULE: NEVER OVERWRITE OLD VERSION. CLONE PREVIOUS VERSION. CREATE NEW VERSION.

REVISION REASON REQUIRED (CANNOT BE EMPTY):
- Price Change
- Requirement Change
- Duration Change
- Discount Approval
- Product Change
- Commercial Change
- Other

=========================================================
QUOTE COMPARISON ENGINE
=========================================================

COMPARE V1, V2, V3, V4

SHOW DIFFERENCES:
Price, Duration, Machine, Terms, Discount, Tax, Grand Total

SIDE-BY-SIDE COMPARISON VIEW.

=========================================================
PDF REVISION WATERMARK ENGINE
=========================================================

V1 → Normal PDF
V2+ → Display Watermark: REVISED
DISPLAY VERSION NUMBER ON EVERY PAGE.

=========================================================
PAGE 1 PDF FORMAT
=========================================================

FIXED HEADER (AUTO LOAD FROM COMPANY MASTER):
- Company Logo
- Company Address
- GST Number, PAN Number, HSN Number, MSME Number
- Company Contact Number, Email ID

QUOTATION INFO:
- Quotation Number, Quotation Date, Validity Date

TO SECTION:
- Company Name, GST Number, Email ID, Contact Number, Landline, Address
- Managing Director Name, Mobile, Email

DELIVERY TO SECTION:
- Delivery Date, Person Name, Contact, Email, GST, Address

QUOTATION TABLE:
# | Item | Power Supply | Platform Working | Working Height | Duration | Quantity | Rate | Amount

COMMERCIAL SECTION:
Sub Total, Discount, Taxable Value, CGST, SGST, IGST, Grand Total, Amount In Words

=========================================================
PAGE 2 PDF FORMAT
=========================================================

GENERATE TERMS & CONDITIONS PAGE.

USE EXACT STG FORMAT.
DO NOT CHANGE WORDING.
DO NOT CHANGE NUMBERING.
DO NOT CHANGE ORDER.
USE EXACTLY 13 TERMS.

THE TERMS PAGE MUST END AFTER CLAUSE 13.

DO NOT ADD: Authorized Signatory, Digital Signature, Company Seal, Date.

DISPLAY ONLY:
- Terms & Conditions
- 13 Clauses
- Footer
- STG Registered Office Address

=========================================================
QUOTATION PREVIEW ENGINE
=========================================================

BEFORE PDF GENERATION — ALLOW PREVIEW:
- Page 1 Preview
- Page 2 Preview

BUTTONS: Preview | Edit | Generate PDF

=========================================================
AUTO SAVE DRAFT ENGINE
=========================================================

AUTO SAVE EVERY 30 SECONDS OR ON FIELD CHANGE.

IF BROWSER CLOSES → RESTORE LAST DRAFT.

SHOW: Restore Draft / Discard Draft

CREATE RECOVERY LOG.

=========================================================
COMPANY BRANDING ENGINE
=========================================================

EACH COMPANY HAS OWN: Logo, Header, Footer, Watermark.
VERIFY CORRECT BRANDING BEFORE PDF GENERATION.

=========================================================
DOCUMENT MANAGEMENT ENGINE
=========================================================

ALLOW UPLOAD:
- GST Certificate
- Purchase Order
- Site Requirement Files
- Project Drawings
- Customer Documents
- Approval Documents

STORE IN SUPABASE STORAGE.
FEATURES: Preview, Download, Version Track

=========================================================
WHATSAPP ENGINE
=========================================================

Generate PDF → Attach PDF → Send Message → Track Delivery → Track Read → Store Timestamp → Create Log

=========================================================
EMAIL ENGINE
=========================================================

Generate PDF → Attach PDF → Send Email → Track Delivery → Track Open → Track Failure → Create Log

=========================================================
QUOTATION FOLLOW-UP TASK ENGINE
=========================================================

WHEN STATUS = SENT:
AUTO CREATE TASK:
- Task Type: Quotation Follow-Up
- Due Date: +1 Day
AUTO CREATE: Notification, Audit Log, Dashboard Entry

=========================================================
CUSTOMER RESPONSE TRACKING
=========================================================

TRACK RESPONSES:
Too Costly / Need Discount / Competitor Quote / Requirement Change / Duration Change / Product Change / Need Approval / Not Interested / Accepted

STORE RESPONSE HISTORY. UPDATE ANALYTICS.

=========================================================
QUOTATION VIEW TRACKING
=========================================================

TRACK: Viewed Date, Viewed Time, Viewed By, IP Address, Device Type, View Count

AUTO STATUS UPDATE: Sent → Viewed

=========================================================
VALIDITY EXPIRY AUTOMATION
=========================================================

2 DAYS BEFORE EXPIRY → Customer Reminder + Executive Reminder
1 DAY BEFORE EXPIRY → Customer Reminder + Executive Reminder
ON EXPIRY → Mark Expired, Notify Executive, Create Audit Log, Update Dashboard

=========================================================
QUOTE AGING ANALYTICS
=========================================================

SHOW AGING: 0-3 Days / 4-7 Days / 8-15 Days / 15+ Days
SHOW AGING DASHBOARD FOR: Executive, Admin, MD

=========================================================
QUOTATION CONVERSION ANALYTICS
=========================================================

TRACK: Total Quotes, Accepted, Rejected, Expired, Negotiation
CALCULATE: Conversion %, Revenue Generated, Average Quote Value, Average Closure Time

=========================================================
QUOTATION LOCK ENGINE
=========================================================

WHEN ACCEPTED:
LOCK: Edit, Delete, Modify
ALLOW: View, Download, Create Revision

=========================================================
CUSTOMER ACCEPTANCE ENGINE
=========================================================

WHEN ACCEPTED:
- Store Acceptance Date
- Create Audit Log
- Update Dashboard
- Enable: Move To Proforma Invoice

=========================================================
NEGOTIATION ESCALATION ENGINE
=========================================================

ROUND 1 → Executive
ROUND 2 → Executive + Manager
ROUND 3 → Executive + Manager + Admin
AFTER ROUND 3 → AUTO ESCALATE TO MD
CREATE: Notification, Audit Log, Dashboard Alert

=========================================================
AUDIT LOG ENGINE
=========================================================

TRACK:
Create, Edit, Delete Draft, Generate PDF, Print PDF, Download PDF, Approve, Reject, Revise, Send WhatsApp, Send Email, Status Change

=========================================================
ZERO BROKEN BUTTON RULE
=========================================================

EVERY BUTTON MUST:
Click → Validate → Save To Supabase → Verify Database Update → Verify API Response → Refresh UI → Update Dashboard → Create Audit Log → Show Success Message → Retest

=========================================================
ERROR HANDLING ENGINE
=========================================================

SHOW CLEAR ERRORS FOR:
- GST Invalid
- Duplicate Quote Number
- WhatsApp Failed
- Email Failed
- PDF Failed
- Database Failed
- Approval Failed
- File Upload Failed

NEVER FAIL SILENTLY.

=========================================================
TESTING (MANDATORY — ALL 20 TESTS)
=========================================================

TEST 1 - Quotation Creation: Saved In Supabase, DB Insert Success, Audit Log Created
TEST 2 - Customer Auto Fill: Existing Customer Detected, History Loaded
TEST 3 - Requirement Validation: Missing Fields Blocked
TEST 4 - Product Master: Image Loaded, Specs Loaded
TEST 5 - Machine Availability: Availability Checked, Override Logged
TEST 6 - Quotation Table: Add/Edit/Delete/Duplicate/Reorder Row
TEST 7 - PDF Generation: Page 1 Generated, Page 2 Generated, STG Format Matched, Footer Correct
TEST 8 - Preview Engine: Preview Works, Edit Before PDF Works
TEST 9 - Auto Save Draft: Draft Saved, Draft Restored
TEST 10 - Version Control: V1 Saved, V2 Created, Previous Version Preserved
TEST 11 - Quote Comparison: Comparison Works
TEST 12 - WhatsApp: PDF Attached, Message Sent
TEST 13 - Email: PDF Attached, Email Delivered
TEST 14 - Approval Workflow: Approval Requested, Approval Completed
TEST 15 - Follow-Up Task: Task Created, Dashboard Updated
TEST 16 - View Tracking: Viewed Status Updated, Count Updated
TEST 17 - Expiry Automation: Reminders Triggered, Expiry Marked
TEST 18 - Conversion Analytics: Analytics Accurate
TEST 19 - Negotiation Escalation: MD Notified
TEST 20 - Backend Verification: Supabase Inserts/Updates, RLS Policies, No Failed APIs, No Console Errors, No Orphan Records

IF FAILED → AUTO DEBUG → FIX → RETEST → DO NOT CONTINUE

=========================================================
FINAL QA GATE — PHASE 6
=========================================================

VERIFY ALL ITEMS:
✓ Customer Details Saved
✓ Delivery Details Saved
✓ Quotations Saved
✓ Quotation Items Saved
✓ Product Images Loaded
✓ Machine Specs Loaded
✓ Machine Recommendations Work
✓ Availability Checks Work
✓ Calculations Accurate
✓ GST Accurate
✓ Discount Accurate
✓ PDF Generated
✓ Terms Page Generated
✓ Preview Works
✓ Draft Recovery Works
✓ WhatsApp Works
✓ Email Works
✓ Approval Works
✓ Reminder Works
✓ Follow-Up Tasks Work
✓ Response Tracking Works
✓ View Tracking Works
✓ Expiry Automation Works
✓ Acceptance Workflow Works
✓ Lock Rules Work
✓ Negotiation Escalation Works
✓ Audit Logs Work
✓ Versioning Works
✓ Comparison Works
✓ Permissions Work
✓ Notifications Work
✓ Backend Verified
✓ Database Verified
✓ Supabase Verified
✓ Mobile Responsive
✓ Tablet Responsive
✓ Desktop Responsive
✓ No Broken Buttons
✓ No Console Errors
✓ No Failed API Calls
✓ No Orphan Records
✓ All Workflows Tested
✓ All Automations Tested
✓ All Roles Tested

ONLY AFTER ALL ITEMS PASS → MARK PHASE 6 COMPLETE → MOVE TO PHASE 7