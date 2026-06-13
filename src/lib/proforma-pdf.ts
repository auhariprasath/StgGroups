import jsPDF from "jspdf";
import type { Company, ProformaInvoice } from "./data/types";
import { formatINRPdf } from "./format";

/**
 * Generates and downloads a single-page Proforma Invoice PDF.
 * This is NOT a tax invoice — GST credit cannot be claimed on this document.
 * Purpose: formally request the advance payment with bank details prominently shown.
 */
export function downloadProformaPdf(pi: ProformaInvoice, company: Company) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40;
  const PW = 595;
  const PH = 842;
  const W = PW - 2 * M;
  let y = 48;

  // ── Company letterhead ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(17).setTextColor(216, 30, 39);
  doc.text(company.name, M, y);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(80);
  doc.text(company.billingAddress.split("\n").join("  |  "), M, y + 14);
  doc.text(`GSTIN: ${company.gstin}`, M, y + 26);

  // ── PI label top-right ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(20);
  doc.text("PROFORMA INVOICE", PW - M, y, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70);
  doc.text(`PI No:  ${pi.proformaNo}`, PW - M, y + 18, { align: "right" });
  doc.text(`Date:  ${pi.date}`, PW - M, y + 30, { align: "right" });
  doc.text(`Valid till:  ${pi.validUntil}`, PW - M, y + 42, { align: "right" });
  doc.text(`Ref Quotation:  ${pi.quotationNo}`, PW - M, y + 54, { align: "right" });

  y += 74;
  doc.setDrawColor(210).line(M, y, PW - M, y);
  y += 20;

  // ── Billed to ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(20);
  doc.text("Billed to", M, y);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70);
  const billLines = [
    pi.clientCompany || pi.clientName,
    pi.clientContactPerson ? `Attn: ${pi.clientContactPerson}` : "",
    pi.clientAddress || "",
    pi.clientGstin ? `GSTIN: ${pi.clientGstin}` : "",
  ].filter(Boolean);
  doc.text(doc.splitTextToSize(billLines.join("\n"), W / 2 - 10), M, y + 14);

  y += 72;
  doc.setDrawColor(220).line(M, y, PW - M, y);
  y += 18;

  // ── Amount summary table ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(20);
  doc.text("Amount summary", M, y);
  y += 16;

  const lx = M + 8;
  const rx = PW - M - 8;

  const amtRow = (label: string, value: number, bold = false) => {
    if (bold) {
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
    } else {
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70);
    }
    doc.text(label, lx, y);
    doc.text(formatINRPdf(value), rx, y, { align: "right" });
    y += bold ? 16 : 14;
  };

  amtRow("Value of order (subtotal, excl. GST)", pi.subtotal);

  // Determine intra vs inter state
  const stgState = company.gstin.slice(0, 2);
  const clientState = pi.deliveryGstin ? pi.deliveryGstin.slice(0, 2) : stgState;
  const isInterstate = (pi.deliveryGstin ?? "").length > 0 && clientState !== stgState;

  if (pi.gstPercent > 0 && pi.gstAmount > 0) {
    const half = Math.round(pi.gstAmount / 2);
    if (isInterstate) {
      amtRow(`IGST @ ${pi.gstPercent}%`, pi.gstAmount);
    } else {
      amtRow(`CGST @ ${pi.gstPercent / 2}%`, half);
      amtRow(`SGST @ ${pi.gstPercent / 2}%`, pi.gstAmount - half);
    }
  }

  doc.setDrawColor(80).line(lx, y - 4, PW - M, y - 4);
  amtRow("Grand total (inclusive of GST)", pi.total, true);
  doc.setDrawColor(80).line(lx, y - 10, PW - M, y - 10);

  y += 10;

  // Advance due box
  doc.setFillColor(254, 243, 199).rect(M, y, W, 48, "F");
  doc.setDrawColor(245, 158, 11).rect(M, y, W, 48, "S");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(120, 80, 0);
  doc.text(`Advance due now (${pi.advancePercent}% of grand total)`, M + 12, y + 16);
  doc.setFontSize(16).setTextColor(20);
  doc.text(formatINRPdf(pi.advanceAmount), PW - M - 12, y + 30, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(80, 60, 0);
  doc.text(`Balance of ${formatINRPdf(pi.balanceAmount)} due as per quotation payment terms.`, M + 12, y + 36);

  y += 62;

  // ── Bank details box ───────────────────────────────────────────────────────
  doc.setFillColor(240, 249, 255).rect(M, y, W, 90, "F");
  doc.setDrawColor(59, 130, 246).rect(M, y, W, 90, "S");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30, 64, 175);
  doc.text("Bank details for advance payment", M + 12, y + 16);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(30);
  const bankLines = company.bankDetails.split("\n");
  bankLines.forEach((line, i) => {
    doc.text(line, M + 12, y + 30 + i * 13);
  });

  y += 104;

  // ── Payment instructions ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(20);
  doc.text("Payment instructions", M, y);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(70);
  const instructions = [
    `1. Transfer ${formatINRPdf(pi.advanceAmount)} to the account above.`,
    "2. Use your company name or PI number as the payment reference.",
    "3. Email the UTR / transaction ID to confirm payment.",
    "4. Equipment will be dispatched within 2–3 working days of advance receipt.",
  ];
  instructions.forEach((line, i) => {
    doc.text(line, M + 6, y + 14 + i * 13);
  });

  y += 14 + instructions.length * 13 + 18;

  if (pi.note) {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(20);
    doc.text("Note:", M, y);
    doc.setFont("helvetica", "normal").setTextColor(70);
    doc.text(doc.splitTextToSize(pi.note, W), M + 32, y);
    y += 20;
  }

  // ── Footer disclaimer ──────────────────────────────────────────────────────
  doc.setDrawColor(220).line(M, PH - 50, PW - M, PH - 50);
  doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(140);
  doc.text(
    "This is a Proforma Invoice only and not a Tax Invoice. GST input credit cannot be claimed on this document.",
    PW / 2, PH - 36, { align: "center" },
  );
  doc.setFont("helvetica", "normal").setTextColor(160);
  doc.text(
    `${company.name}  ·  GSTIN: ${company.gstin}  ·  ${pi.proformaNo}`,
    PW / 2, PH - 22, { align: "center" },
  );

  doc.save(`${pi.proformaNo}.pdf`);
}
