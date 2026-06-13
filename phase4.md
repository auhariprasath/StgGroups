CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 4 — CRM STATE MACHINE

STRICT RULE:
DO NOT PROCEED UNTIL PHASE 4 HAS BEEN:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ ROLE TESTED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDER UI. NO MOCK DATA. NO PARTIAL FEATURES.

=========================================================
STRICT LEAD STATUS FLOW
=========================================================

NEW
↓
FIRST CONTACT
↓
FOLLOW-UP
↓
REQUIREMENTS
↓
QUOTATION SENT
↓
NEGOTIATION
↓
WORK ORDER
↓
ACTIVE PROJECT
↓
COMPLETED

OR ALTERNATIVE STATUSES:
LOST
DORMANT
MERGED

=========================================================
STRICT VALIDATION RULES
=========================================================

NO ILLEGAL STATUS SKIP.

RULES:
- Cannot create quotation without requirements
- Cannot create invoice without quotation approval
- Cannot start project without work order
- Cannot skip any stage in the flow

=========================================================
STATUS HISTORY ENGINE
=========================================================

EVERY STATUS CHANGE MUST:
1. BE VALIDATED AGAINST ALLOWED TRANSITIONS
2. STORE OLD STATUS
3. STORE NEW STATUS
4. STORE CHANGED BY
5. STORE TIMESTAMP
6. CREATE AUDIT LOG
7. BLOCK INVALID TRANSITIONS WITH CLEAR ERROR MESSAGE

=========================================================
DATABASE REQUIREMENTS
=========================================================

Add to leads table:
- current_status
- previous_status
- status_changed_at
- status_changed_by

TABLE: lead_status_history
- id
- lead_id
- old_status
- new_status
- changed_by
- changed_at
- reason
- audit_log_id

=========================================================
VALID TRANSITION MAP
=========================================================

NEW → FIRST CONTACT (allowed)
FIRST CONTACT → FOLLOW-UP (allowed)
FIRST CONTACT → REQUIREMENTS (allowed)
FOLLOW-UP → REQUIREMENTS (allowed)
FOLLOW-UP → LOST (allowed)
FOLLOW-UP → DORMANT (allowed)
REQUIREMENTS → QUOTATION SENT (allowed)
QUOTATION SENT → NEGOTIATION (allowed)
QUOTATION SENT → LOST (allowed)
NEGOTIATION → WORK ORDER (allowed)
NEGOTIATION → LOST (allowed)
WORK ORDER → ACTIVE PROJECT (allowed)
ACTIVE PROJECT → COMPLETED (allowed)
ANY → MERGED (admin only)

ALL OTHER TRANSITIONS → BLOCKED WITH ERROR

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

TEST ILLEGAL TRANSITIONS:
- Try to create quotation from NEW status → BLOCKED
- Try to create invoice without quotation → BLOCKED
- Try to start project without work order → BLOCKED

VERIFY:
✓ all invalid transitions blocked correctly
✓ valid transitions work
✓ status history preserved
✓ audit logs created for every change
✓ error messages shown clearly
✓ no silent failures
✓ backend verified
✓ supabase verified
✓ no console errors

=========================================================
QA GATE — PHASE 4
=========================================================

VERIFY:
✓ State machine works
✓ All transitions validated
✓ History preserved
✓ Audit logs complete
✓ No broken buttons
✓ No console errors

ONLY THEN MOVE TO PHASE 5.