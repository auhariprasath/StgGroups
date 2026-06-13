CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 2 — DUPLICATE DETECTION ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL PHASE 2 HAS BEEN:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ ROLE TESTED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDER UI. NO MOCK DATA. NO FAKE LOGIC.

=========================================================
OBJECTIVE
=========================================================

BUILD 5-LAYER DUPLICATE DETECTION SYSTEM.

=========================================================
LAYER 1 — MOBILE EXACT MATCH
=========================================================

ACTION: Hard block
SHOW: History popup with full customer record

=========================================================
LAYER 2 — GST MATCH
=========================================================

ACTION: Auto merge suggestion

=========================================================
LAYER 3 — COMPANY + PINCODE 85% MATCH
=========================================================

ACTION: Warning shown to user

=========================================================
LAYER 4 — FUZZY COMPANY MATCH 70%
=========================================================

ACTION: Soft recommendation

=========================================================
LAYER 5 — EMAIL DOMAIN MATCH
=========================================================

ACTION: Information alert

=========================================================
DUPLICATE UI
=========================================================

SHOW POPUP: "Potential duplicate found."

DISPLAY:
- Previous quotation
- Previous invoice
- Previous follow-up
- Customer history

ALLOW:
- Merge
- Ignore
- Link customer

=========================================================
DATABASE TABLES
=========================================================

Use existing: leads, existing_customer_history
Add duplicate_detection_logs:
- id
- lead_id
- matched_lead_id
- match_type (mobile/gst/company/fuzzy/email)
- confidence_score
- action_taken (merged/ignored/linked)
- actioned_by
- created_at

=========================================================
VALIDATION RULES
=========================================================

- Block duplicate mobile number (hard block)
- Warn on GST match
- Warn on similar company + pincode
- Soft alert on fuzzy company name
- Info alert on email domain match

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

SIMULATE:
- Same mobile → hard blocked
- Same GST → merge suggestion shown
- Similar company names → warning shown
- Email domain duplicate → info alert shown

VERIFY:
✓ correct detection at each layer
✓ false positives are low
✓ merge logic works
✓ history preserved after merge
✓ audit logs created for every action
✓ no silent failures
✓ backend verified
✓ supabase verified

=========================================================
QA GATE — PHASE 2
=========================================================

VERIFY:
✓ All 5 layers work
✓ Popup UI works
✓ Merge works
✓ Ignore works
✓ Link customer works
✓ History preserved
✓ Audit logs created
✓ No broken buttons
✓ No console errors

ONLY THEN MOVE TO PHASE 3.