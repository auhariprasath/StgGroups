CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 11 — WHATSAPP + JUSTDIAL + INDIAMART INTEGRATION ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ WEBHOOKS TESTED
✓ WHATSAPP TESTED
✓ RETRY LOGIC TESTED
✓ SELF-QA PASSED

NO PLACEHOLDERS. NO MOCK DATA. REAL API CONNECTIONS ONLY.

=========================================================
WHATSAPP BUSINESS API ENGINE
=========================================================

SUPPORT:
- Inbound leads (auto create lead from WhatsApp message)
- Outbound quotation send
- Outbound invoice send
- Follow-up reminder
- Payment reminder
- Delivery updates
- Return reminders

STORE FULL MESSAGE HISTORY.

TABLE: whatsapp_logs
- id
- lead_id
- customer_id
- direction (inbound/outbound)
- message_type
- message_content
- media_url
- delivery_status
- read_status
- sent_at
- delivered_at
- read_at
- created_by

=========================================================
JUSTDIAL WEBHOOK ENGINE
=========================================================

AUTO CREATE LEAD FROM JUSTDIAL WEBHOOK.

MAP FROM WEBHOOK PAYLOAD:
- name → customer_name
- phone → mobile_number
- service_request → requirement_text
- city → city
- equipment/category → identified_product

AUTO ASSIGN COMPANY USING PRODUCT INTELLIGENCE ENGINE.

STORE WEBHOOK PAYLOAD.
CREATE AUDIT LOG.

=========================================================
INDIAMART WEBHOOK ENGINE
=========================================================

AUTO IMPORT LEADS FROM INDIAMART.

DETECT FROM PAYLOAD:
- Equipment type → identified_product
- Location → city
- Priority → lead priority

AUTO ASSIGN COMPANY USING PRODUCT INTELLIGENCE ENGINE.

STORE WEBHOOK PAYLOAD.
CREATE AUDIT LOG.

=========================================================
FAILURE HANDLING ENGINE
=========================================================

IF WEBHOOK FAILS:
1. ADD TO RETRY QUEUE
2. LOG FAILURE WITH REASON
3. SEND ADMIN ALERT
4. RETRY AUTOMATICALLY (3 attempts)
5. IF STILL FAILED → MANUAL REVIEW QUEUE

TABLE: webhook_failure_logs
- id
- source (justdial/indiamart/whatsapp)
- payload
- error_reason
- retry_count
- resolved
- created_at

=========================================================
WEBHOOK SECURITY
=========================================================

VALIDATE:
- Webhook signature
- Source IP whitelist
- API key validation
- Rate limiting

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

VERIFY:
✓ Real webhook test from JustDial (or simulated payload)
✓ Real webhook test from IndiaMart (or simulated payload)
✓ Lead auto creation works
✓ Company auto assignment works
✓ Real WhatsApp send works
✓ Message delivery tracked
✓ Retry logic works
✓ Failure logging works
✓ Admin alert on failure
✓ Message history stored
✓ Audit logs created
✓ Role permissions enforced

=========================================================
QA GATE — PHASE 11
=========================================================

VERIFY:
✓ All webhooks working
✓ Lead auto creation verified
✓ WhatsApp engine working
✓ Retry logic working
✓ Failure handling working
✓ Logs stored
✓ Audit logs complete
✓ No broken flows
✓ No console errors

ONLY THEN MOVE TO PHASE 12.