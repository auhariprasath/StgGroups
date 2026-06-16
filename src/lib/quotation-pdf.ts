import jsPDF from "jspdf";
import type { Company, Quotation } from "./data/types";
import { formatINRPdf, numberToWords } from "./format";

const STG_TERMS = [
  "This quotation is valid only for the period stated on Page 1. No commitment is implied beyond the validity date.",
  "All equipment remains the sole property of STG Groups at all times during the rental / deployment period.",
  "The rental period commences on the date of delivery to site, irrespective of when the equipment is actually put to use.",
  "Fuel, consumables, and lubricants are to be arranged by the client unless explicitly included in the quoted line items.",
  "The client shall ensure a safe, accessible working environment, obtain all necessary statutory permits, and comply with applicable safety regulations throughout the contract period.",
  "Any damage to equipment arising from misuse, overloading, negligence, unauthorised modification, or site accidents shall be charged to the client at repair / replacement cost, as assessed by STG.",
  "Advance payment (percentage stated in payment terms) must be remitted before dispatch of equipment from STG's yard. Delivery will not be initiated without receipt of confirmed advance.",
  "Balance payment is due strictly as per the terms stated on Page 1. Delayed payments attract interest at 24% per annum from the due date.",
  "No deduction, withholding, or set-off shall be made from the agreed amounts for any reason whatsoever without prior written consent from STG.",
  "In the event of a mechanical breakdown attributable solely to STG's equipment, STG will carry out repairs at no additional cost; downtime directly caused by such breakdown will not be billed. Force-majeure or site-caused stoppages are not covered.",
  "Mobilisation and demobilisation charges are as quoted. Cancellation or postponement after equipment has been dispatched from STG's yard attracts a minimum cancellation charge of 50% of the total quoted amount.",
  "All disputes arising from or relating to this quotation and any resulting contract shall be subject to the exclusive jurisdiction of competent courts in Bengaluru, Karnataka, India.",
  "GST and other applicable statutory levies are charged at the rates in force on the date of invoice. Rates may be revised in line with government notifications without prior notice to the client.",
];

/** Parse a #rrggbb hex string into an [r,g,b] tuple (falls back to STG red). */
function hexToRgb(hex: string | undefined): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return [216, 30, 39];
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export interface QuotationClientInfo {
  name: string;
  companyName?: string;
  address?: string;
  gstin?: string;
  contactPerson?: string;
  mdName?: string;
  mdNumber?: string;
  mdEmail?: string;
}

/**
 * Generates a 2-page A4 quotation PDF and returns the jsPDF document.
 * Page 1: header, addresses, line items, GST breakdown, payment terms.
 * Page 2: Terms & Conditions, bank details, acceptance signature.
 */
export function generateQuotationPdf(
  q: Quotation,
  company: Company,
  client: QuotationClientInfo,
): jsPDF {
  const gstPercent = q.gstPercent ?? 0;
  const lineSubtotal = q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const mobilization = q.mobilizationCharge ?? 0;
  const demobilization = q.demobilizationCharge ?? 0;
  const subtotal = lineSubtotal + mobilization + demobilization;
  const gstAmt = Math.round((subtotal * gstPercent) / 100);
  const grandTotal = subtotal + gstAmt;

  // Per-company branding accent (Company Branding Engine).
  const [br, bg, bb] = hexToRgb(company.accent);

  // Determine intra-state vs inter-state from first 2 chars of GSTIN (state code)
  const stgState = company.gstin.slice(0, 2);
  const clientState = q.deliveryGstin ? q.deliveryGstin.slice(0, 2) : stgState;
  const isInterstate = q.deliveryGstin.length > 0 && clientState !== stgState;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40; // left/right margin
  const PW = 595; // page width (A4 portrait)
  const PH = 842; // page height
  const W = PW - 2 * M; // usable width = 515
  let y = 48;

  // Revision watermark (V2+)
  if (q.version > 1) {
    doc.saveGraphicsState();
    doc.setFont("helvetica", "bold").setFontSize(72).setTextColor(220, 220, 220);
    doc.text("REVISED", PW / 2, PH / 2, { align: "center", angle: -35 });
    doc.restoreGraphicsState();
  }

  // ── PAGE 1 ─────────────────────────────────────────────────────────────────

  // Company branding band (accent-coloured) + name
  doc.setFillColor(br, bg, bb).rect(0, 0, PW, 6, "F");
  doc.setFont("helvetica", "bold").setFontSize(17).setTextColor(br, bg, bb);
  doc.text(company.name, M, y);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(80);
  const addrOneLiner = company.billingAddress.split("\n").join("  |  ");
  doc.text(addrOneLiner, M, y + 14);
  doc.text(`GSTIN: ${company.gstin}`, M, y + 26);

  // Quotation label + meta (top right)
  doc.setFont("helvetica", "bold").setFontSize(19).setTextColor(20);
  doc.text("QUOTATION", PW - M, y, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70);
  doc.text(`No:  ${q.quotationNo}  (v${q.version})`, PW - M, y + 18, { align: "right" });
  doc.text(`Date:  ${q.date}`, PW - M, y + 30, { align: "right" });
  doc.text(`Valid till:  ${q.validityDate}`, PW - M, y + 42, { align: "right" });
  if (q.projectNo) doc.text(`Proj:  ${q.projectNo}`, PW - M, y + 54, { align: "right" });

  y += 74;
  doc.setDrawColor(210).line(M, y, PW - M, y);
  y += 20;

  // Bill to / Deliver to
  const colMid = M + W / 2 + 10;
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(20);
  doc.text("Bill to", M, y);
  doc.text("Deliver to", colMid, y);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70);

  const billLines = [
    client.companyName || client.name,
    client.contactPerson ? `Attn: ${client.contactPerson}` : "",
    client.address || "",
    client.gstin ? `GSTIN: ${client.gstin}` : "",
  ].filter(Boolean);
  doc.text(doc.splitTextToSize(billLines.join("\n"), W / 2 - 14), M, y + 14);

  const deliverLines = [
    client.name,
    q.deliveryAddress,
    q.deliveryGstin ? `GSTIN: ${q.deliveryGstin}` : "",
  ].filter(Boolean);
  doc.text(doc.splitTextToSize(deliverLines.join("\n"), W / 2 - 14), colMid, y + 14);

  y += 82;

  // Line items table
  doc.setFillColor(br, bg, bb).rect(M, y, W, 22, "F");
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(255, 255, 255);
  doc.text("#", M + 4, y + 14);
  doc.text("Description", M + 22, y + 14);
  doc.text("Qty", 356, y + 14, { align: "right" });
  doc.text("Unit", 400, y + 14, { align: "center" });
  doc.text("Rate", 458, y + 14, { align: "right" });
  doc.text("Amount", PW - M - 6, y + 14, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(50);
  q.lines.forEach((l, i) => {
    const amt = l.qty * l.rate;
    const descWrapped = doc.splitTextToSize(l.description, 310);
    const rowH = Math.max(22, descWrapped.length * 13 + 8);
    doc.text(String(i + 1), M + 4, y + 13);
    doc.text(descWrapped, M + 22, y + 13);
    doc.text(String(l.qty), 356, y + 13, { align: "right" });
    doc.text(l.unit, 400, y + 13, { align: "center" });
    doc.text(formatINRPdf(l.rate), 458, y + 13, { align: "right" });
    doc.text(formatINRPdf(amt), PW - M - 6, y + 13, { align: "right" });
    doc.setDrawColor(234).line(M, y + rowH, PW - M, y + rowH);
    y += rowH;
  });

  y += 10;

  // Totals block
  const lx = 384; // label left-align x
  const rx = PW - M - 6; // amount right-align x

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(80);
  doc.text("Line items", lx, y);
  doc.text(formatINRPdf(lineSubtotal), rx, y, { align: "right" });

  if (mobilization > 0) {
    y += 13;
    doc.text("Mobilisation", lx, y);
    doc.text(formatINRPdf(mobilization), rx, y, { align: "right" });
  }
  if (demobilization > 0) {
    y += 13;
    doc.text("Demobilisation", lx, y);
    doc.text(formatINRPdf(demobilization), rx, y, { align: "right" });
  }

  y += 13;
  doc.text("Subtotal", lx, y);
  doc.text(formatINRPdf(subtotal), rx, y, { align: "right" });

  if (gstPercent > 0) {
    if (isInterstate) {
      y += 15;
      doc.text(`IGST @ ${gstPercent}%`, lx, y);
      doc.text(formatINRPdf(gstAmt), rx, y, { align: "right" });
    } else {
      const half = Math.round(gstAmt / 2);
      y += 15;
      doc.text(`CGST @ ${gstPercent / 2}%`, lx, y);
      doc.text(formatINRPdf(half), rx, y, { align: "right" });
      y += 13;
      doc.text(`SGST @ ${gstPercent / 2}%`, lx, y);
      doc.text(formatINRPdf(gstAmt - half), rx, y, { align: "right" });
    }
  }

  y += 14;
  doc.setDrawColor(80).line(lx - 6, y - 3, PW - M, y - 3);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
  doc.text("Grand Total", lx, y + 7);
  doc.text(formatINRPdf(grandTotal), rx, y + 7, { align: "right" });
  doc.setDrawColor(80).line(lx - 6, y + 12, PW - M, y + 12);

  y += 16;
  doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(100);
  const inWords = "Rupees " + numberToWords(grandTotal);
  doc.text(doc.splitTextToSize(inWords, PW - M * 2), M, y + 4);

  y += 16;

  // Payment terms
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(20);
  doc.text("Payment terms", M, y);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70);
  const payLines = [
    `Advance: ${q.advancePercent}% of Grand Total on order confirmation.`,
    q.balanceTerms,
    q.ratePerDayNote ? `Extension beyond period: ${q.ratePerDayNote}` : "",
    q.approvedBy ? `Authorised by: ${q.approvedBy}` : "",
  ].filter(Boolean);
  doc.text(payLines, M, y + 14);

  y += 14 + payLines.length * 14 + 12;
  doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(140);
  doc.text("Terms & Conditions, bank details and acceptance clause on Page 2.", M, y);

  // Page 1 footer
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(160);
  doc.text(`${company.name}  ·  GSTIN: ${company.gstin}  ·  Page 1 of 2`, PW / 2, PH - 22, {
    align: "center",
  });

  // ── PAGE 2: Terms & Conditions ─────────────────────────────────────────────
  doc.addPage();
  y = 48;

  doc.setFillColor(br, bg, bb).rect(0, 0, PW, 6, "F");
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(br, bg, bb);
  doc.text(company.name, M, y);
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20);
  doc.text("Terms & Conditions", M, y);
  doc.setDrawColor(200).line(M, y + 6, PW - M, y + 6);
  y += 22;

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(55);
  STG_TERMS.forEach((clause, idx) => {
    const wrapped = doc.splitTextToSize(`${idx + 1}.  ${clause}`, W - 10);
    doc.text(wrapped, M + 6, y);
    y += wrapped.length * 13 + 5;
  });

  y += 14;

  // Bank details
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
  doc.text("Bank details", M, y);
  doc.setDrawColor(200).line(M, y + 5, M + 180, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
  const bankWrapped = doc.splitTextToSize(company.bankDetails, W / 2);
  doc.text(bankWrapped, M, y + 16);
  y += bankWrapped.length * 13 + 26;

  // MD Contact details (collected from requirement — critical for payment follow-up)
  const mdLines = [
    client.mdName ? `Contact: ${client.mdName}` : "",
    client.mdNumber ? `Phone: ${client.mdNumber}` : "",
    client.mdEmail ? `Email: ${client.mdEmail}` : "",
  ].filter(Boolean);
  if (mdLines.length > 0) {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(20);
    doc.text("Client MD Contact", M, y);
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
    mdLines.forEach((ln, i) => {
      doc.text(ln, M, y + 12 + i * 12);
    });
    y += mdLines.length * 12 + 16;
  }

  // Acceptance
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
  doc.text("Acceptance", M, y);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
  doc.text(
    "I / We have read and accept the above quotation and the Terms & Conditions stated herein.",
    M,
    y + 14,
  );
  y += 44;
  doc.setDrawColor(140);
  doc.line(M, y, M + 190, y);
  doc.line(PW - M - 190, y, PW - M, y);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  doc.text("Client signature & company stamp", M, y + 12);
  doc.text("For " + company.name, PW - M - 190, y + 12);
  doc.text("Authorised signatory", PW - M - 190, y + 22);

  // Page 2 footer
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(160);
  doc.text(`${company.name}  ·  ${q.quotationNo} v${q.version}  ·  Page 2 of 2`, PW / 2, PH - 22, {
    align: "center",
  });

  return doc;
}

/**
 * Generates and downloads a 2-page A4 quotation PDF.
 */
export function downloadQuotationPdf(q: Quotation, company: Company, client: QuotationClientInfo) {
  const doc = generateQuotationPdf(q, company, client);
  doc.save(`${q.quotationNo}-v${q.version}.pdf`);
}
