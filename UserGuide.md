# STG Groups CRM — User Guide

Complete walkthrough for every feature in the app, written for first-time users.

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Adding a New Lead](#2-adding-a-new-lead)
3. [Following Up](#3-following-up)
4. [Capturing the Requirement](#4-capturing-the-requirement)
5. [Negotiations & Common Requests](#5-negotiations--common-requests)
6. [Creating a Quotation](#6-creating-a-quotation)
7. [Proforma Invoice (PI)](#7-proforma-invoice-pi)
8. [Tax Invoice (GST Invoice)](#8-tax-invoice-gst-invoice)
9. [Customers Page](#9-customers-page)
10. [Dashboard (MD View)](#10-dashboard-md-view)
11. [Settings](#11-settings)
12. [Quotations List](#12-quotations-list)
13. [Reports & Analytics](#13-reports--analytics)
14. [Notifications Center](#14-notifications-center)
15. [WhatsApp Hub](#15-whatsapp-hub)
16. [Lead Stage Reference](#16-lead-stage-reference)

---

## 1. Logging In

1. Open the app in your browser
2. Enter your **email** and **password**
3. You'll land on the **Dashboard**

> **MD / Super Admin** — sees all leads across all 3 companies (Rentals, Infra, Trading).  
> **Executives** — see only their own company's leads.

---

## 2. Adding a New Lead

When someone calls, messages, or enquires about equipment:

1. Click **Leads** in the left sidebar
2. Click **"New Lead"** (top-right button)
3. Fill in:
   - Customer name
   - Phone number
   - What they are enquiring about (the app auto-detects the right company)
4. Click **Save**

The lead appears in your list with status **"New"**.

> If the app cannot figure out which company the lead belongs to, it marks it as **"Needs manual routing"** — click the lead and assign the company yourself.

---

## 3. Following Up

After adding a lead, call the customer and record what happened:

1. Open the lead → go to the **Follow-ups** tab
2. Click **"Schedule follow-up"**
3. Choose a date and write what you plan to discuss
4. After the call, click **Mark done** and write the outcome

The **Follow-ups page** (left sidebar) shows all pending calls sorted by urgency — overdue ones are highlighted in red at the top.

**Call outcomes you can record:**
- Interested → move the lead forward
- Callback scheduled → pick a callback date
- Not interested → close the lead with a reason
- No answer → auto-increments the attempt count

---

## 4. Capturing the Requirement

Once the customer is interested, record exactly what they need:

1. Open the lead → go to the **Requirements** tab
2. Click **"Add requirement"**
3. Fill in all fields (equipment type, duration, site address, delivery date, etc.)
4. Click **Save**

The delivery now appears on the **Deliveries & Tasks** page — colour-coded by urgency:

| Colour | Urgency |
|--------|---------|
| Red | Today or tomorrow |
| Amber | Within 3 days |
| Green | More than 3 days away |

---

## 5. Negotiations & Common Requests

### Price Negotiation

1. Open the lead → go to the **Negotiations** tab
2. Add a record: customer's offer, your counter-offer, notes
3. Keep adding entries until the price is agreed

### Product Not Available

If a customer asks for something STG does not carry:

1. It is automatically logged in **Common Requests** (left sidebar)
2. The MD can review this board to spot demand patterns and decide on new stock

---

## 6. Creating a Quotation

Once the requirement is clear and price is discussed:

1. Open the lead → go to the **Payment** tab
2. Click **"Create Quotation"**
3. Fill in:
   - **Line items** — description, quantity, rate per day/unit
   - **GST %** — default is 18%; change if needed (0, 5, 12, 18, 28)
   - **Delivery address** and **customer GSTIN**
   - **Validity date**
4. Click **"Send Quotation"** — automatically schedules a follow-up reminder 2 days later
5. Click **"Download PDF"** to get the quotation file to share with the customer

### What the PDF contains
- Company letterhead with GSTIN and billing address
- Client "Bill to" and "Deliver to" sections
- Line items table with rates
- GST breakdown — CGST + SGST if same state, IGST if different state
- Payment terms and grand total
- Page 2: 13 Terms & Conditions + bank details + signature block

---

## 7. Proforma Invoice (PI)

After the customer agrees to proceed and you need an advance payment:

1. On the Quotation page, click **"Generate Proforma Invoice (PI)"**
2. The PI is auto-filled from the approved quotation
3. Click **"Generate & Send PI"** — this:
   - Downloads the PI as a PDF
   - Updates the payment stage to "Proforma Sent"
   - Logs it as an activity on the lead

### What the PI PDF contains
- Proforma number (e.g. STGR-PI-2026-001)
- Highlighted **advance amount due** box (amber)
- Bank details with payment instructions
- Footer: *"This is a Proforma Invoice only. GST input credit cannot be claimed."*

> You can re-download any past PI from the PI history list at the bottom of the page.

---

## 8. Tax Invoice (GST Invoice)

After the job is done and the customer has paid:

1. On the Quotation page, click **"Issue Tax Invoice (GST)"**
2. Line items are pre-filled — edit if needed
3. SAC codes are auto-filled based on the company:
   - STG Rentals → 997313
   - STG Infra Equipment → 995432
   - STG Trading Corporation → 84795
4. Enter how much advance was already received
5. Click **"Issue Tax Invoice"** — downloads a GST-compliant invoice

### What the Tax Invoice PDF contains
- "TAX INVOICE — ORIGINAL FOR RECIPIENT" header
- Supplier and Recipient boxes (with GSTIN)
- Line items with SAC codes and taxable amounts
- Tax summary (CGST/SGST or IGST)
- Red **balance due** box
- Page 2: Bank details, payment instructions, declaration, signature
- Footer: *"GST input credit CAN be claimed."*

---

## 9. Customers Page

Converted leads (Quote Sent, Confirmed, Completed) appear here as customer records, grouped by phone number.

### Status dots

| Dot | Meaning | Action needed |
|-----|---------|--------------|
| Green | Active — contacted within 60 days | None |
| Amber | Re-engage — 60 to 120 days since last contact | Schedule a check-in call |
| Red | At risk — over 120 days since last contact | Call urgently |

### What you can do
- Search by name, company, phone, or GST number
- Click **Call** to dial directly
- Click the **WhatsApp** button to open a chat
- Click **View lead** to see the full lead history
- Filter by Active / Re-engage / At risk tabs

### Badges
- **Repeat** — customer has closed more than one deal with STG
- **At risk** / **Re-engage** — engagement health

---

## 10. Dashboard (MD View)

The dashboard is the MD's daily control room. Visible only to Super Admin.

### What it shows
- Total leads, follow-ups due today, revenue collected, pipeline value
- Overall win rate
- Per-company breakdown (Rentals vs Infra vs Trading) — leads, won, lost, revenue
- 7-stage pipeline funnel with counts
- Re-engagement alert banner (if customers need attention)
- Expiring quotations alert (within 3 days)
- Executive-by-executive performance summary

---

## 11. Settings

Only the MD (Super Admin) can access Settings.

### Editing company details

1. Go to **Settings** → click a company name to expand it
2. Edit any of:
   - **Legal name** — shown on all PDF documents
   - **GSTIN** — used for GST calculations and PDFs
   - **Billing address** — shown as "From" on quotations and invoices
   - **Bank details** — shown on Proforma and Tax Invoices
   - **Brand colour** — accent colour for that company in the UI
3. Click **"Save changes"**

> Bank details appear on every Proforma and Tax Invoice — make sure they are correct before sharing any documents.

### Setting monthly targets

1. Settings → **Targets & periods** section
2. For each executive, set:
   - **Period** — e.g. `Jul 2026`
   - **Goal** — number of deals to close
   - **Achieved** — update this as deals close
3. Click **Save**

### Product catalog keywords

1. Settings → **Product catalog & routing keywords**
2. Under each product category, type a word a customer might use and press **Enter** or click **+**
3. Example: under "Cranes" add keywords like `crane`, `hydra`, `pick and carry`
4. These keywords help the app automatically route new leads to the correct company

---

## 12. Quotations List

Click **Quotations** in the sidebar to see all quotations across all companies.

### How to use it
- Click a **filter tab** at the top: All / Draft / Sent / Accepted / Expired
- All amounts shown are **GST-inclusive** (the final amount the customer pays)
- Quotations expiring within 3 days show an **"Expiring soon"** amber badge
- An alert banner appears at the top if any are expiring — act immediately
- Click any row to open the quotation

---

## 13. Reports & Analytics

Click **Reports** in the sidebar (Super Admin only).

### Sections

**KPI Cards** — at a glance:
- Total leads in the system
- Overall win rate (won ÷ closed × 100)
- Revenue collected (fully paid deals)
- Pipeline value (open sent and accepted quotations)

**Pipeline Funnel** — horizontal bar chart showing how many leads are at each stage. Look for where leads are dropping off — that stage needs attention.

**By Company** — side-by-side comparison of Rentals, Infra, and Trading:
- Total leads, won, lost, win rate, revenue

**Executive Performance** — table showing each exec's:
- Total leads handled
- Won / lost / win rate
- Revenue generated
- Target progress (progress bar vs their monthly goal)

**Customer Health** — total customers, repeat customers, at-risk count

**Lead Sources** — which channels bring the most leads and which convert best

---

## 14. Notifications Center

Click **Notifications** in the sidebar — your daily action checklist.

### Alert types

| Badge | Meaning |
|-------|---------|
| **Urgent** (red) | Needs action today — overdue follow-up, new lead ignored for 24h+ |
| **Warning** (amber) | Needs action soon — quotation expiring, delivery in 1–2 days |
| **Info** (blue) | Awareness — customers due for re-engagement |

Click any notification card to go directly to the relevant lead or page. Clear this list every morning and nothing will fall through the cracks.

---

## 15. WhatsApp Hub

Click **WhatsApp Hub** in the sidebar. Lets you send professional, pre-written messages in seconds — no typing from scratch.

### How to use it

**Step 1 — Pick a lead**
- Use the search box on the left to find the customer by name or phone

**Step 2 — Choose a template**

| Template | When to use |
|----------|------------|
| Introduction | First time contacting a new lead |
| Quotation ready | When you've just sent a quotation |
| Quotation follow-up | 2–3 days after sending a quotation with no response |
| Advance payment reminder | Customer agreed but hasn't paid the advance yet |
| Delivery confirmation | Confirming delivery date and address |
| Re-engagement | Customer has gone quiet for 60+ days |
| Balance payment due | After delivery, reminding for final payment |
| Thank you / Completion | After full payment is received |

**Step 3 — Fill in the blanks**
- Fields like customer name and your name are auto-filled
- Add the quotation number, amount, date, etc.

**Step 4 — Preview and send**
- Read the preview to make sure it looks right
- Click **"Open in WhatsApp"** — WhatsApp opens with the message already typed
- Hit **Send** in WhatsApp

> Every message you send through the hub is automatically recorded as an activity on the lead — so there is always a history of communication.

---

## 16. Lead Stage Reference

### The journey of a lead

```
New → Follow-up → Interested → Negotiation → Quote Sent → Confirmed → Completed
                                                          ↘ Not Interested
                                                          ↘ Dormant
```

### Stage meanings

| Stage | What it means | Your next action |
|-------|--------------|-----------------|
| **New** | Just came in, not yet contacted | Call within 24 hours |
| **Follow-up** | You've called, waiting for their response | Check the Follow-ups page daily |
| **Interested** | They want to proceed | Fill in the Requirements tab |
| **Negotiation** | Discussing price / terms | Use the Negotiations tab |
| **Quote Sent** | Quotation issued | Follow up in 2 days |
| **Confirmed** | Deal agreed, advance stage | Generate Proforma Invoice |
| **Completed** | Fully paid, job done | Issue Tax Invoice |
| **Not Interested** | They declined | Log the reason for analytics |
| **Dormant** | Unresponsive after multiple attempts | Try re-engagement in 30 days |

### Priority colours (on lead cards)

| Colour | Priority | Meaning |
|--------|----------|---------|
| Red | Hot | High-value or time-sensitive |
| Amber | Warm | Active discussion |
| Blue | Cold | Early stage or slow-moving |

---

*Last updated: June 2026 — STG Groups Internal CRM*
