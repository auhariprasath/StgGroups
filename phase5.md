CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 5 — REQUIREMENTS ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL PHASE 5 HAS BEEN:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ ROLE TESTED
✓ EDGE CASES TESTED
✓ SELF-QA PASSED

NO PLACEHOLDER UI. NO MOCK DATA. NO PARTIAL FEATURES.

=========================================================
OBJECTIVE
=========================================================

BUILD COMPANY-SPECIFIC REQUIREMENT FORMS.
EACH COMPANY HAS DIFFERENT FIELDS.
FORM MUST LOAD DYNAMICALLY BASED ON ASSIGNED COMPANY.

=========================================================
STG RENTALS — REQUIREMENT FIELDS
=========================================================

- Height
- Capacity
- Lift Type
- Duration
- Operator Needed (Yes/No)
- Power Type (Diesel/Battery)
- Location

=========================================================
STG INFRA — REQUIREMENT FIELDS
=========================================================

- Terrain
- Machine Model
- Project Duration
- Site Condition
- Operator Required (Yes/No)

=========================================================
STG TRADING — REQUIREMENT FIELDS
=========================================================

- Brand
- Product Type
- Size
- Quantity
- Model

=========================================================
VALIDATION RULES
=========================================================

IF ANY REQUIRED FIELD IS EMPTY:
- NIL + REASON REQUIRED
- ADMIN ALERT GENERATED
- BLOCK QUOTATION CREATION

USER CANNOT CREATE QUOTATION WITHOUT COMPLETING REQUIREMENTS.

=========================================================
DATABASE TABLES
=========================================================

TABLE: requirements
- id (uuid)
- lead_id
- company_id
- requirement_data (JSONB — stores company-specific fields)
- status
- created_by
- created_at
- updated_at

TABLE: requirement_audit_logs
- id
- requirement_id
- action_type
- old_value
- new_value
- changed_by
- changed_at

=========================================================
CONDITIONAL FORM ENGINE
=========================================================

WHEN LEAD IS ASSIGNED TO STG RENTALS → LOAD RENTALS FORM
WHEN LEAD IS ASSIGNED TO STG INFRA → LOAD INFRA FORM
WHEN LEAD IS ASSIGNED TO STG TRADING → LOAD TRADING FORM

FORM MUST SWITCH DYNAMICALLY.
NO PAGE REFRESH.

=========================================================
NIL HANDLING ENGINE
=========================================================

IF FIELD LEFT EMPTY:
- SHOW PROMPT: "Enter NIL and reason or fill this field"
- STORE NIL + REASON IN DATABASE
- CREATE ADMIN ALERT
- CREATE AUDIT LOG
- BLOCK QUOTATION CREATION UNTIL RESOLVED OR NIL+REASON PROVIDED

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

VERIFY:
✓ conditional forms load correctly per company
✓ correct company fields shown
✓ wrong company fields not shown
✓ validation works
✓ NIL handling works
✓ audit logs created
✓ quotation blocked when requirements incomplete
✓ form saves to supabase
✓ form updates work
✓ no silent failures
✓ no console errors
✓ mobile responsive

=========================================================
QA GATE — PHASE 5
=========================================================

VERIFY:
✓ All company-specific forms work
✓ Validation enforced
✓ NIL handling works
✓ Audit logs complete
✓ Quotation correctly blocked
✓ No broken UI
✓ No console errors

ONLY THEN MOVE TO PHASE 6.