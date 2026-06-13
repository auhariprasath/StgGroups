CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 3 — FOLLOW-UP MANAGEMENT ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL PHASE 3 HAS BEEN:
✓ FULLY IMPLEMENTED
✓ FRONTEND CONNECTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ SUPABASE CONNECTED
✓ REALTIME WORKS
✓ ROLE PERMISSIONS WORK
✓ ALL BUTTONS WORK
✓ NOTIFICATIONS WORK
✓ TIMELINE WORKS
✓ REMINDERS WORK
✓ TESTING PASSED
✓ NO SILENT FAILURE
✓ ZERO CONSOLE ERRORS

=========================================================
BUSINESS FLOW
=========================================================

THIS FOLLOW-UP MODULE STARTS AFTER NEW LEAD HAS BEEN CONTACTED.

LEAD STATUS FLOW:
NEW LEAD → CONTACTED → FOLLOW-UP / QUOTATION / NEGATIVE / DORMANT

=========================================================
ROLE STRUCTURE
=========================================================

A → STG RENTALS
B → STG INFRA EQUIPMENTS
C → STG TRADING CORPORATION LTD

SUPER ADMIN: OBSERVER ONLY
CAN: View follow-ups, view lead status, view negative reasons, view conversion reports, view reminders, view team performance
CANNOT: Handle leads, modify follow-up, change outcomes

=========================================================
DATABASE TABLES
=========================================================

TABLE: lead_followups
- id (uuid)
- lead_id
- handler_name
- company_name
- call_attempt_count
- followup_status
- outcome_type
- priority
- next_action
- followup_notes
- callback_date
- callback_time
- competitor_name
- negative_reason
- dormant_status
- created_at
- updated_at

TABLE: followup_timeline
- id
- lead_id
- action_type
- description
- created_by
- timestamp

TABLE: followup_reminders
- id
- lead_id
- handler_name
- reminder_date
- reminder_time
- status
- notification_sent
- created_at

TABLE: negative_reason_analytics
- id
- lead_id
- company_name
- reason_type
- competitor_name
- notes
- created_at

=========================================================
FOLLOW-UP ENTRY LOGIC
=========================================================

WHEN USER A/B/C CLICKS: START FOLLOW-UP

SYSTEM MUST:
1. VALIDATE LEAD EXISTS
2. CHANGE STATUS: NEW LEAD → CONTACTED
3. CREATE FOLLOW-UP RECORD
4. CREATE TIMELINE ENTRY
5. UPDATE DASHBOARD
6. SAVE TO SUPABASE
7. VERIFY DATABASE UPDATE
8. SHOW SUCCESS MESSAGE

IF FAIL: SHOW REAL ERROR. NO SILENT FAILURE.

=========================================================
FOLLOW-UP OUTCOME SYSTEM
=========================================================

AFTER CONTACTING CUSTOMER — MANDATORY: USER MUST SELECT ONE OUTCOME:
1. POSITIVE
2. NEGATIVE
3. NEUTRAL

USER CANNOT SAVE WITHOUT SELECTING.

=========================================================
POSITIVE SCENARIO
=========================================================

CUSTOMER SAYS: Interested / Send quotation / Need pricing / Proceed / Share details
USER SELECTS: POSITIVE

REQUIRED FIELDS:
✓ Requirement Confirmed
✓ Product (auto-filled editable)
✓ Duration (optional for rental)
✓ Site Location
✓ Additional Notes
✓ Lead Priority (HOT / WARM / COLD)

BUTTON: MOVE TO QUOTATION

WHEN BUTTON CLICKED — SYSTEM MUST:
1. VALIDATE REQUIRED FIELDS
2. CHANGE STATUS: CONTACTED → QUOTATION
3. MOVE LEAD TO QUOTATION PIPELINE
4. CREATE TIMELINE ENTRY
5. SAVE TO SUPABASE
6. VERIFY DATABASE UPDATE
7. UPDATE DASHBOARD REALTIME
8. SEND REMINDER TO A/B/C
9. SEND NOTIFICATION TO SUPER ADMIN
10. SEND CUSTOMER MESSAGE: "Thank you for your interest. Quotation will be shared shortly."
11. VERIFY NOTIFICATION DELIVERY
12. SHOW SUCCESS MESSAGE

=========================================================
NEGATIVE SCENARIO
=========================================================

CUSTOMER SAYS: Not interested / Too costly / Already purchased / Wrong timing / Competitor selected
USER SELECTS: NEGATIVE

MANDATORY NEGATIVE REASON (CANNOT SAVE WITHOUT):
1. Price Too High
2. Already Purchased
3. Competitor Selected
4. No Requirement
5. Budget Issue
6. Wrong Contact
7. No Response
8. Timing Issue
9. Product Not Available
10. Other

DETAILED NOTES: MANDATORY

COMPETITOR TRACKING:
IF REASON = Competitor Selected → SHOW FIELD: Competitor Name

WHEN SAVED — SYSTEM MUST:
1. CHANGE STATUS: CONTACTED → NEGATIVE / LOST
2. SAVE REASON
3. SAVE NOTES
4. SAVE COMPETITOR DATA
5. CREATE ANALYTICS ENTRY
6. CREATE TIMELINE ENTRY
7. UPDATE DASHBOARD
8. NOTIFY SUPER ADMIN
9. VERIFY DATABASE UPDATE
10. SHOW SUCCESS MESSAGE

=========================================================
NEUTRAL SCENARIO
=========================================================

CUSTOMER SAYS: Call later / Need time / Internal discussion / Requirement later / Next month
USER SELECTS: NEUTRAL

MANDATORY FIELDS (CANNOT SAVE WITHOUT):
✓ CALLBACK DATE
✓ CALLBACK TIME
✓ NOTES
✓ NEXT ACTION

NEXT ACTION OPTIONS:
1. Call Again
2. Waiting For Decision
3. Meeting
4. Site Visit
5. Price Negotiation
6. Send Quotation

WHEN SAVED — SYSTEM MUST:
1. CHANGE STATUS: CONTACTED → FOLLOW-UP
2. CREATE REMINDER
3. SAVE CALLBACK DATE/TIME
4. SAVE NOTES
5. CREATE TIMELINE ENTRY
6. UPDATE DASHBOARD
7. SAVE TO SUPABASE
8. VERIFY DATABASE UPDATE
9. SHOW SUCCESS MESSAGE

=========================================================
SMART CALLBACK SYSTEM
=========================================================

SUPPORT EXACT TIME.
EXAMPLE: Customer says "Call after 4 PM" → SET: Friday 4 PM Reminder
SEND NOTIFICATION EXACTLY AT TIME.

=========================================================
FOLLOW-UP ATTEMPT COUNTER
=========================================================

TRACK CALL ATTEMPTS: Attempt 1, 2, 3, 4, 5

AUTO SUGGESTION: IF >5 ATTEMPTS → SUGGEST: MARK NO RESPONSE OR MOVE NEGATIVE

=========================================================
NO RESPONSE WORKFLOW
=========================================================

IF CUSTOMER DOES NOT ANSWER → ALLOW: NO RESPONSE
REQUIRED: RETRY DATE, RETRY TIME
AFTER MULTIPLE ATTEMPTS → MOVE TO: DORMANT LEAD (NOT IMMEDIATE NEGATIVE)

=========================================================
DORMANT LEAD SYSTEM
=========================================================

BUILD DORMANT LEAD SECTION.
FOR: UNRESPONSIVE LEADS.
SUPER ADMIN CAN REVIEW.
ALLOW: REOPEN LEAD

=========================================================
REMINDER ESCALATION ENGINE
=========================================================

1 DAY MISSED → REMIND HANDLER AGAIN
3 DAYS MISSED → NOTIFY SUPER ADMIN
7 DAYS MISSED → FLAG: HIGH RISK LEAD

=========================================================
LEAD PRIORITY ENGINE
=========================================================

HOT → URGENT REQUIREMENT
WARM → INTERESTED LATER
COLD → FUTURE REQUIREMENT

=========================================================
DAILY MORNING DIGEST
=========================================================

EVERY MORNING SEND:
- WhatsApp
- SMS
- Push Notification
TO EXECUTIVES.
MESSAGE: Today's pending follow-ups.

=========================================================
NEGOTIATION RULE
=========================================================

AFTER 3 NEGOTIATION ROUNDS → AUTO ESCALATE TO MD

=========================================================
MISSED FOLLOW-UP ESCALATION
=========================================================

3+ DAYS → notify company admin
7+ DAYS → notify MD

=========================================================
FOLLOW-UP TIMELINE HISTORY
=========================================================

STORE ALL ACTIONS:
- Lead contacted
- Reminder created
- Callback scheduled
- Quotation requested
- Negative marked
- Lead reopened

DISPLAY COMPLETE HISTORY WITH TIMESTAMPS.

=========================================================
AUTO CUSTOMER COMMUNICATION
=========================================================

POSITIVE: "Thank you for your interest. Quotation will be shared shortly."
NEUTRAL: "As discussed, we will follow up on the scheduled date."
NEGATIVE: "Thank you for your time. Please contact us anytime."

CHANNELS: ✓ WhatsApp ✓ SMS ✓ Email

=========================================================
REOPEN NEGATIVE LEAD
=========================================================

BUTTON: REOPEN LEAD
WHEN CLICKED:
1. RESTORE HISTORY
2. RESTORE TIMELINE
3. CHANGE STATUS: NEGATIVE → FOLLOW-UP
4. UPDATE DASHBOARD
5. VERIFY DATABASE UPDATE

=========================================================
SUPER ADMIN ANALYTICS
=========================================================

SHOW:
✓ Positive %
✓ Negative %
✓ Neutral %
✓ Lost Reasons
✓ Executive Performance
✓ Follow-Up Delays
✓ Conversion Rate
✓ Competitor Analytics

=========================================================
BUTTONS REQUIRED
=========================================================

✓ Start Follow-Up
✓ Save Follow-Up
✓ Move To Quotation
✓ Mark Negative
✓ Set Reminder
✓ Edit Follow-Up
✓ Reopen Lead
✓ No Response

EVERY BUTTON MUST EXECUTE:
1. VALIDATE INPUT
2. SAVE TO SUPABASE
3. VERIFY DATABASE UPDATE
4. UPDATE STATUS
5. REFRESH UI
6. VERIFY DASHBOARD UPDATE
7. VERIFY REALTIME SYNC
8. VERIFY NOTIFICATIONS
9. SHOW SUCCESS MESSAGE

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

TEST POSITIVE FLOW:
Lead contacted → Interested → Move quotation → Reminder triggered → Super admin notified

TEST NEGATIVE FLOW:
Lead contacted → Not interested → Reason saved → Analytics updated → Admin review works

TEST NEUTRAL FLOW:
Lead contacted → Call later → Reminder set → Escalation works

TEST NO RESPONSE FLOW:
Customer unreachable → Retry reminder → Multiple attempts → Dormant lead

VERIFY:
✓ follow-up save works
✓ notification sent
✓ digest sent
✓ escalation works
✓ timeline visible
✓ permissions work
✓ quotation locked until follow-up exists
✓ analytics updated
✓ all buttons work
✓ database actions verified
✓ frontend verified
✓ backend verified
✓ realtime verified
✓ reminders work
✓ role permissions work
✓ no silent failures
✓ zero console errors
✓ testing passed
✓ retesting passed

=========================================================
QA GATE — PHASE 3
=========================================================

IF ANYTHING FAILS: AUTO DEBUG → FIX → RETEST → VERIFY AGAIN
ONLY THEN MARK PHASE 3 COMPLETE AND MOVE TO PHASE 4.