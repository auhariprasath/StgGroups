CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 8 — TAX INVOICE MANAGEMENT ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL:
✓ FULLY IMPLEMENTED
✓ FRONTEND CONNECTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ SUPABASE VERIFIED
✓ ROLE TESTED
✓ PDF VERIFIED
✓ GST VERIFIED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDERS. NO MOCK DATA. NO DUMMY BUTTONS. EVERY BUTTON MUST WORK END TO END.

=========================================================
TAX INVOICE NUMBER ENGINE
=========================================================

FORMAT: STG-TI-YYYY-0001
AUTO INCREMENT. NO DUPLICATES. DATABASE ENFORCED.

=========================================================
CONVERT TO TAX INVOICE
=========================================================

BUTTON: Convert To Tax Invoice
VISIBLE ONLY IF: Payment Status = Paid

AUTO COPY (NO MANUAL RE-ENTRY):
- Customer details
- GST
- Machine Details
- Charges
- Taxes
- Bank Details
- Payment Details

=========================================================
GST ENGINE
=========================================================

AUTO CALCULATE:
- CGST
- SGST
- IGST
- Taxable Value
- Total Tax
- Invoice Total
- Amount In Words

=========================================================
GST COMPLIANCE
=========================================================

SHOW:
- HSN Code
- Place Of Supply
- GST Number
- Invoice Date
- Tax Invoice Number

=========================================================
TAX INVOICE PDF
=========================================================

GENERATE REAL PDF.
- Print Ready
- Download Ready
- WhatsApp Ready
- Email Ready

INCLUDE:
- Company Logo + Branding
- Watermark
- Customer Details
- GST Number
- Bank Details
- Machine Images
- Rental Duration
- Terms & Conditions
- Payment Terms
- Authorized Signature

=========================================================
INVOICE STATUS HISTORY ENGINE
=========================================================

STATUSES:
Draft → Sent → Partially Paid → Paid → Converted To Tax Invoice

TRACK FOR EVERY CHANGE:
- Old Status
- New Status
- Changed By
- Date
- Time
- Remarks

=========================================================
COMMUNICATION LOGS
=========================================================

STORE:
- Recipient
- Method (Email/Mobile)
- Delivery Status
- Read Status
- Timestamp

=========================================================
SEND OPTIONS
=========================================================

ONE CLICK:
- WhatsApp Send (PDF + Payment Link)
- Email Send (PDF + Payment Link)
- PDF Download

TRACK ALL SEND HISTORY.

=========================================================
ZERO BROKEN BUTTON RULE
=========================================================

EVERY BUTTON MUST:
Click → Validate → Save To Supabase → Verify Database Update → Verify API Response → Refresh UI → Update Dashboard → Create Audit Log → Show Success Message → Retest

=========================================================
BACKEND VALIDATION
=========================================================

VERIFY:
- Supabase Inserts
- Supabase Updates
- RLS Policies
- API Responses
- Database Integrity
- No Orphan Records

=========================================================
TESTING (MANDATORY)
=========================================================

TEST 1 - Convert To Tax Invoice: Works Only When Paid
TEST 2 - Auto Copy: All Data Copied Correctly
TEST 3 - Tax Invoice Number: Auto Generated, No Duplicates
TEST 4 - GST Calculations: CGST/SGST/IGST Accurate
TEST 5 - HSN Code: Displayed Correctly
TEST 6 - PDF Generation: Print/Download/WhatsApp/Email Ready
TEST 7 - Status History: Tracked Correctly
TEST 8 - Communication Logs: Stored
TEST 9 - Backend Verification: Supabase/RLS/APIs/No Errors
TEST 10 - Mobile Responsive: Works On All Devices

IF FAILED → AUTO DEBUG → FIX → RETEST → DO NOT CONTINUE

=========================================================
QA GATE — PHASE 8
=========================================================

VERIFY:
✓ Tax Invoice creation works
✓ Only visible when paid
✓ GST calculations accurate
✓ PDF generated correctly
✓ WhatsApp works
✓ Email works
✓ Status history tracked
✓ Communication logs stored
✓ Audit logs complete
✓ Backend verified
✓ Mobile responsive
✓ No broken buttons
✓ No console errors

ONLY THEN MOVE TO PHASE 9.