CONTINUE BUILDING THE STG GROUPS ENTERPRISE CRM.

PHASE 12 — FLEET REGISTER & ACTIVE PROJECT OPERATIONS ENGINE

STRICT RULE:
DO NOT PROCEED UNTIL:
✓ FULLY IMPLEMENTED
✓ BACKEND CONNECTED
✓ DATABASE VERIFIED
✓ ROLE TESTED
✓ AVAILABILITY LOGIC TESTED
✓ SELF-QA PASSED

NO PLACEHOLDERS. NO MOCK DATA. EVERYTHING REAL.

=========================================================
OBJECTIVE
=========================================================

BUILD COMPLETE FLEET MANAGEMENT AND ACTIVE PROJECT OPERATIONS MODULE.

=========================================================
DATABASE TABLES
=========================================================

TABLE: fleet_registry
- machine_id (uuid)
- machine_name
- machine_type
- company_id
- availability_status (Available/Reserved/Under Maintenance/Booked)
- maintenance_due
- yard_location
- condition_status
- operator_assigned
- last_inspection_date
- created_at
- updated_at

TABLE: fleet_maintenance_logs
- id
- machine_id
- maintenance_type
- maintenance_date
- description
- cost
- performed_by
- next_due_date
- created_at

TABLE: fleet_breakdown_reports
- id
- machine_id
- report_date
- breakdown_type
- description
- reported_by
- resolved_at
- resolution_notes
- created_at

TABLE: active_projects
- id
- lead_id
- customer_id
- machine_id
- operator_id
- project_start_date
- project_end_date
- project_status
- delivery_date
- delivery_confirmed_at
- return_date
- return_confirmed_at
- extension_count
- created_at
- updated_at

TABLE: delivery_schedules
- id
- project_id
- scheduled_date
- actual_date
- delivered_by
- delivery_notes
- status
- created_at

TABLE: return_inspections
- id
- project_id
- machine_id
- inspection_date
- condition (Good/Minor Damage/Major Damage)
- damage_notes
- service_required
- pending_dues
- inspected_by
- created_at

TABLE: operator_logs
- id
- machine_id
- operator_name
- project_id
- assigned_date
- released_date
- performance_notes
- created_at

=========================================================
FEATURES
=========================================================

1. EQUIPMENT AVAILABILITY ENGINE:
- Show real-time availability of all machines
- Filter by type, company, status
- Show availability date if booked/maintenance

2. MAINTENANCE TRACKING:
- Schedule maintenance
- Track maintenance history
- Alert when maintenance due
- Block booking if under maintenance

3. BREAKDOWN REPORTS:
- Log breakdown
- Track resolution
- Notify relevant team

4. PROJECT EXTENSION:
- Allow project duration extension
- Track extension count
- Update availability accordingly

5. OPERATOR LOGS:
- Assign operator to machine
- Track operator assignment history

6. RETURN INSPECTION:
- Check damage
- Check working condition
- Check pending dues
- Check service requirement

7. DELIVERY SCHEDULE:
- Schedule delivery
- Confirm delivery
- Track actual vs scheduled

=========================================================
AVAILABILITY LOGIC
=========================================================

BEFORE QUOTATION CREATION:
- CHECK MACHINE AVAILABILITY
- IF NOT AVAILABLE → Show alert, suggest alternative, show availability date
- ALLOW ADMIN OVERRIDE with log

=========================================================
RETURN INSPECTION WORKFLOW
=========================================================

WHEN MACHINE RETURNS — CHECK:
1. Damage status
2. Working condition
3. Pending dues from customer
4. Service requirement

CREATE INSPECTION REPORT.
NOTIFY RELEVANT TEAM.
UPDATE FLEET STATUS.

=========================================================
AUTOMATION ENGINE
=========================================================

- Auto alert when maintenance due
- Auto update machine status when project starts/ends
- Auto notify when machine returned
- Auto flag overdue projects
- Auto create service ticket on breakdown

=========================================================
TESTING & VERIFICATION (MANDATORY)
=========================================================

VERIFY:
✓ Fleet registry loads
✓ Availability check works
✓ Maintenance tracking works
✓ Breakdown logging works
✓ Delivery tracking works
✓ Return process works
✓ Inspection report created
✓ Operator logs work
✓ Project extension works
✓ Audit logs generated
✓ Role permissions work
✓ Admin override logged
✓ No console errors
✓ Mobile responsive

=========================================================
QA GATE — PHASE 12
=========================================================

VERIFY:
✓ Fleet management complete
✓ Availability engine works
✓ Maintenance works
✓ Breakdown reporting works
✓ Delivery tracking works
✓ Return inspection works
✓ Operator management works
✓ Audit logs complete
✓ Backend verified
✓ No broken buttons
✓ No console errors

ONLY THEN MOVE TO PHASE 13.