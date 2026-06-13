CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 7 — ENTERPRISE PROFORMA INVOICE, PAYMENT & COMMUNICATION ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL:
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
✓ PAYMENT VERIFIED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDERS. NO MOCK DATA. NO DUMMY BUTTONS. EVERY BUTTON MUST WORK END TO END.

=========================================================
WORKFLOW
=========================================================

Accepted Quotation
↓
Transfer To Proforma Invoice
↓
Send Invoice
↓
Receive Payment
↓
Approve Payment
↓
Convert To Tax Invoice

=========================================================
QUOTATION ACCEPTANCE WORKFLOW
=========================================================

BEFORE INVOICE GENERATION REQUIRE ONE OF:
- Purchase Order
- LOI
- Work Order
- Acceptance Remark

CANNOT MARK QUOTATION ACCEPTED WITHOUT PROOF.

WHEN QUOTATION ACCEPTED:
- Lock quotation
- Store acceptance date
- Store accepted by
- Create audit log
- Enable "Transfer To Proforma Invoice" button

=========================================================
DATABASE TABLES REQUIRED
=========================================================

TABLE: invoice_master
- id (uuid)
- company_id
- customer_id
- lead_id
- quotation_id
- invoice_number
- invoice_version
- invoice_status
- invoice_date
- billing_address
- shipping_address
- subtotal
- discount
- cgst
- sgst
- igst
- tds_amount
- grand_total
- advance_paid
- balance_due
- payment_status
- approval_status
- created_at
- updated_at
- created_by

TABLE: invoice_line_items
- id
- invoice_id
- machine_id
- item_name
- description
- quantity
- rate
- rental_duration
- rental_type
- tax_percentage
- discount
- total_amount
- image_url
- remarks

TABLE: invoice_versions
- invoice_id
- version_number
- change_log
- changed_by
- changed_at

TABLE: payments
- id
- invoice_id
- customer_id
- payment_date
- payment_mode
- payment_reference
- amount_paid
- tds_deducted
- remaining_balance
- remarks

TABLE: payment_instalments
- payment_id
- due_date
- due_amount
- paid_status
- paid_date
- late_days

=========================================================
INVOICE NUMBER ENGINE
=========================================================

PROFORMA INVOICE: STG-PI-YYYY-0001
AUTO INCREMENT. NO DUPLICATES.

IF UPDATED:
- STG-PI-YYYY-0001-v1
- STG-PI-YYYY-0001-v2

OLD VERSIONS MUST NEVER BE DELETED. STORE COMPLETE VERSION HISTORY.

=========================================================
TRANSFER TO PROFORMA INVOICE
=========================================================

BUTTON VISIBLE ONLY WHEN: Quotation Status = Accepted

AUTO COPY FROM QUOTATION (NO MANUAL RE-ENTRY):
- Customer details
- GST
- Contacts
- MD details
- Delivery details
- Machine details
- Machine images
- Machine specifications
- Rental details
- Duration
- Quantity
- Rate
- Taxes
- Terms

=========================================================
PROFORMA INVOICE LAYOUT
=========================================================

MATCH STG FORMAT EXACTLY.

SECTIONS:
- Header (Company Logo, GST, PAN, MSME, Address, Contacts)
- Customer Section
- Machine Image Section
- Machine Specification Section
- Commercial Charges Section
- Rental Rate Box
- Bank Details Section
- QR Code Section
- Footer

=========================================================
BANK DETAILS ENGINE
=========================================================

COMPANY-WISE BANK ACCOUNTS:
- STG Rentals
- STG Infra
- STG Trading

FIELDS:
- Account Name
- Bank Name
- Account Number
- IFSC
- Branch
- UPI
- SWIFT
- Account Type

DISPLAY IN: Invoice Form, Preview, PDF

=========================================================
QR CODE ENGINE
=========================================================

GENERATE UPI QR CODE.
DISPLAY IN: Invoice Form, Invoice Preview, PDF
FEATURES: Download QR, Print QR, Copy UPI

=========================================================
RAZORPAY PAYMENT LINK ENGINE
=========================================================

GLOBAL TOGGLE: ON / OFF (Default OFF)

WHEN ENABLED:
- Generate Razorpay Link
- Generate Razorpay QR
- Show PAY NOW Button
- Show in: Invoice, PDF, WhatsApp, Email

STORE: Link ID, Link Status, Payment Status

=========================================================
RECIPIENT SELECTION ENGINE
=========================================================

SEND INVOICE BUTTON — LOAD:
- Company Email, Company Mobile
- MD Email, MD Mobile
- Delivery Contact
- Executive, Manager, Admin, MD

FEATURES:
- Select Individual
- Select Multiple
- Select All
- Add Recipient
- Remove Recipient
- Send Selected
- Send All

=========================================================
WHATSAPP ENGINE
=========================================================

Send PDF → Send Payment Link → Track Delivery → Track Read → Store Logs

=========================================================
EMAIL ENGINE
=========================================================

Send PDF → Send Payment Link → Track Open → Track Delivery → Store Logs

=========================================================
RESEND ENGINE
=========================================================

Load Previous Recipients → Allow New Recipients → Create Audit Log

=========================================================
REMINDER ENGINE
=========================================================

Day 1 → Customer + Executive
Day 3 → Customer + Manager
Day 5 → Customer + Admin
Day 7 → Customer + MD

TRACK: Sent, Delivered, Read, Failed

=========================================================
PAYMENT TRACKING ENGINE
=========================================================

STATUSES: Draft, Sent, Partially Paid, Paid, Cancelled

TRACK:
- Invoice Amount
- Received Amount
- Balance Amount
- Reference Number
- Remarks

=========================================================
RECEIVE PAYMENT ENGINE
=========================================================

FIELDS: Amount, Date, Reference, Remarks

AUTO UPDATE: Balance, Status, Dashboard, Audit Log

=========================================================
PAYMENT PROOF ENGINE
=========================================================

ALLOW UPLOAD:
- UTR
- Bank Receipt
- NEFT
- RTGS
- Screenshot

STORE AGAINST INVOICE.

=========================================================
TDS ENGINE
=========================================================

SUPPORT: 2% TDS
AUTO CALCULATE. TRACK DEDUCTED AMOUNT. SHOW REMAINING RECEIVABLE.

=========================================================
INSTALMENT ENGINE
=========================================================

ALLOW MULTIPLE INSTALMENTS.
AUTO UPDATE RUNNING BALANCE.
PAYMENT TIMELINE.
OVERDUE TRACKING.

=========================================================
PAYMENT APPROVAL WORKFLOW
=========================================================

Executive Receives Payment
↓
Accounts Verification
↓
Approve Payment
↓
Mark Paid
↓
Enable Convert To Tax Invoice

=========================================================
PAYMENT VALIDATION
=========================================================

BLOCK:
- Negative payments
- Duplicate transaction IDs
- Overpayment beyond invoice total
- Invalid payment modes

=========================================================
INVOICE EDIT SYSTEM
=========================================================

AFTER INVOICE CREATED — USER CAN:
✓ Add new machine
✓ Edit machine quantity
✓ Edit duration
✓ Add new service
✓ Modify pricing

EVERY CHANGE:
- Create version history
- Audit log mandatory

=========================================================
CUSTOMER HISTORY PANEL
=========================================================

SHOW:
- Previous Quotations
- Previous Proforma Invoices
- Previous Tax Invoices
- Outstanding Amount
- Paid Amount
- Collection History
- Payment History

=========================================================
ANALYTICS
=========================================================

SHOW:
- Outstanding Amount
- Collection Rate
- Revenue Generated
- Paid Invoices
- Partial Invoices
- Pending Invoices

=========================================================
OVERDUE ESCALATION ENGINE
=========================================================

30 DAYS → Send payment reminder
60 DAYS → Admin escalation
90 DAYS → Legal flag + Account freeze

FREEZE LOGIC:
WHEN ACCOUNT FROZEN:
- Cannot create new quotation
- Cannot create new invoice
- Show warning banner
- MD override available

=========================================================
AUDIT LOG ENGINE
=========================================================

TRACK: Create, Edit, Send, Payment, Reminder, Approval, Conversion

=========================================================
ZERO BROKEN BUTTON RULE
=========================================================

EVERY BUTTON MUST:
Click → Validate → Save To Supabase → Verify Database Update → Verify API Response → Refresh UI → Update Dashboard → Create Audit Log → Show Success Message → Retest

=========================================================
TESTING (MANDATORY — ALL 20 TESTS)
=========================================================

TEST 1 - Transfer From Quotation: Verified
TEST 2 - Invoice Creation: DB Save Success
TEST 3 - PDF Generation: Proper Formatting
TEST 4 - WhatsApp Sending: Message Delivered
TEST 5 - Email Sending: Email Delivered
TEST 6 - Recipient Selection: All Options Work
TEST 7 - Payment Tracking: Accurate
TEST 8 - Partial Payment: Balance Updated
TEST 9 - Full Payment: Status Updated
TEST 10 - Payment Proof Upload: Stored Against Invoice
TEST 11 - Payment Approval: Workflow Complete
TEST 12 - Razorpay Link: Generated and Working
TEST 13 - QR Code: Generated and Displayed
TEST 14 - Reminder Engine: Triggered On Correct Days
TEST 15 - Tax Invoice Conversion: Button Enabled After Full Payment
TEST 16 - GST Calculations: Accurate
TEST 17 - Status History: Tracked
TEST 18 - Communication Logs: Stored
TEST 19 - Analytics: Accurate
TEST 20 - Backend Verification: Supabase/RLS/APIs/No Errors/No Orphan Records

IF FAILED → AUTO DEBUG → FIX → RETEST → DO NOT CONTINUE

=========================================================
QA GATE — PHASE 7
=========================================================

VERIFY:
✓ Invoice creation works
✓ Quotation mapping works
✓ Image slot works
✓ PDF works
✓ Versioning works
✓ Permissions work
✓ Send options work
✓ Payment chain works
✓ TDS works
✓ Instalments work
✓ Overdue escalation works
✓ Freeze logic works
✓ Customer history works
✓ Analytics work
✓ Audit logs complete
✓ Backend verified
✓ Mobile responsive
✓ No broken buttons
✓ No console errors

ONLY THEN MOVE TO PHASE 8.