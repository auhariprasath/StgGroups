import jsPDF from "jspdf";
import type { Company, TaxInvoice } from "./data/types";
import { formatINRPdf } from "./format";

/**
 * Generates and downloads a GST-compliant 2-page Tax Invoice PDF.
 * Page 1: Invoice details, supplier/recipient, line items with SAC codes, GST breakdown,
 *          advance adjustment, balance due.
 * Page 2: Bank details for balance payment, declaration, signature.
 *
 * This IS a tax invoice — GST input credit CAN be claimed with this document.
 */
export function downloadTaxInvoicePdf(inv: TaxInvoice, company: Company) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40;
  const PW = 595;
  const PH = 842;
  const W = PW - 2 * M;
  let y = 32;

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────

  // Outer border
  doc.setDrawColor(180).rect(M - 10, y - 4, W + 20, PH - y - 30, "S");

  // Header band
  doc.setFillColor(30, 30, 30).rect(M - 10, y - 4, W + 20, 36, "F");
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", PW / 2, y + 16, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(200, 200, 200);
  doc.text("ORIGINAL FOR RECIPIENT", PW - M - 6, y + 24, { align: "right" });

  y += 44;

  // Supplier + Invoice meta (two columns)
  const colR = M + W / 2 + 10;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(216, 30, 39);
  doc.text(company.name, M, y);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
  company.billingAddress.split("\n").forEach((ln, i) => {
    doc.text(ln, M, y + 14 + i * 12);
  });
  const addrLines = company.billingAddress.split("\n").length;
  doc.text(`GSTIN: ${company.gstin}`, M, y + 14 + addrLines * 12);

  // Right column: invoice meta
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(20);
  doc.text("Invoice No:", colR, y);
  doc.text("Date:", colR, y + 14);
  doc.text("Due date:", colR, y + 28);
  doc.text("Place of supply:", colR, y + 42);
  if (inv.quotationNo) doc.text("Ref quotation:", colR, y + 56);

  doc.setFont("helvetica", "normal").setTextColor(60);
  doc.text(inv.invoiceNo, colR + 90, y);
  doc.text(inv.date, colR + 90, y + 14);
  doc.text(inv.dueDate, colR + 90, y + 28);
  doc.text(inv.placeOfSupply, colR + 90, y + 42);
  if (inv.quotationNo) doc.text(inv.quotationNo, colR + 90, y + 56);

  y += 76;
  doc.setDrawColor(200).line(M - 10, y, PW - M + 10, y);
  y += 14;

  // Supplier / Recipient boxes
  const boxW = W / 2 - 4;
  doc.setFillColor(248, 248, 248).rect(M - 10, y, boxW + 10, 70, "F");
  doc.setDrawColor(210).rect(M - 10, y, boxW + 10, 70, "S");
  doc.setFillColor(248, 248, 248).rect(M + boxW + 8, y, boxW + 12, 70, "F");
  doc.setDrawColor(210).rect(M + boxW + 8, y, boxW + 12, 70, "S");

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(100);
  doc.text("SUPPLIER", M - 4, y + 10);
  doc.text("RECIPIENT / BILL TO", M + boxW + 14, y + 10);

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(30);
  doc.text(company.name, M - 4, y + 22);
  doc.text(`GSTIN: ${company.gstin}`, M - 4, y + 34);

  const recLines = [
    inv.clientCompany || inv.clientName,
    inv.clientContactPerson ? `Attn: ${inv.clientContactPerson}` : "",
    inv.clientAddress || "",
    inv.clientGstin ? `GSTIN: ${inv.clientGstin}` : "",
  ].filter(Boolean);
  recLines.forEach((ln, i) => doc.text(ln, M + boxW + 14, y + 22 + i * 12));

  y += 78;
  doc.setDrawColor(200).line(M - 10, y, PW - M + 10, y);
  y += 14;

  // Determine intra vs inter-state
  const stgState = company.gstin.slice(0, 2);
  const clientState = inv.deliveryGstin ? inv.deliveryGstin.slice(0, 2)
    : inv.clientGstin ? inv.clientGstin.slice(0, 2)
    : stgState;
  const isInterstate = clientState !== stgState;

  // ── Line items table ─────────────────────────────────────────────────────
  doc.setFillColor(30, 30, 30).rect(M - 10, y, W + 20, 20, "F");
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255);
  doc.text("#", M - 4, y + 13);
  doc.text("Description", M + 14, y + 13);
  doc.text("SAC", 326, y + 13, { align: "right" });
  doc.text("Qty", 365, y + 13, { align: "right" });
  doc.text("Unit", 400, y + 13, { align: "center" });
  doc.text("Rate", 452, y + 13, { align: "right" });
  doc.text("Taxable", PW - M + 4, y + 13, { align: "right" });
  y += 20;

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(30);
  inv.lines.forEach((l, i) => {
    const bg = i % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    const descWrapped = doc.splitTextToSize(l.description, 270);
    const rowH = Math.max(20, descWrapped.length * 12 + 8);
    doc.rect(M - 10, y, W + 20, rowH, "F");
    doc.setDrawColor(230).line(M - 10, y + rowH, PW - M + 10, y + rowH);

    doc.setTextColor(30);
    doc.text(String(i + 1), M - 4, y + 13);
    doc.text(descWrapped, M + 14, y + 13);
    doc.text(l.sacCode || "—", 326, y + 13, { align: "right" });
    doc.text(String(l.qty), 365, y + 13, { align: "right" });
    doc.text(l.unit, 400, y + 13, { align: "center" });
    doc.text(formatINRPdf(l.rate), 452, y + 13, { align: "right" });
    doc.text(formatINRPdf(l.taxableAmount), PW - M + 4, y + 13, { align: "right" });
    y += rowH;
  });

  y += 10;

  // ── Tax summary ──────────────────────────────────────────────────────────
  const lx = 350;
  const rx = PW - M + 4;

  const sumRow = (label: string, val: number | string, opts?: { bold?: boolean; color?: number[] }) => {
    const isBold = opts?.bold ?? false;
    const color = opts?.color ?? [60, 60, 60];
    doc.setFont("helvetica", isBold ? "bold" : "normal")
      .setFontSize(isBold ? 9.5 : 9)
      .setTextColor(color[0], color[1], color[2]);
    doc.text(label, lx, y);
    doc.text(typeof val === "number" ? formatINRPdf(val) : val, rx, y, { align: "right" });
    y += isBold ? 16 : 14;
  };

  sumRow("Taxable value (subtotal)", inv.subtotal);

  if (inv.gstPercent > 0) {
    const half = Math.round(inv.gstAmount / 2);
    if (isInterstate) {
      sumRow(`IGST @ ${inv.gstPercent}%`, inv.gstAmount);
    } else {
      sumRow(`CGST @ ${inv.gstPercent / 2}%`, half);
      sumRow(`SGST @ ${inv.gstPercent / 2}%`, inv.gstAmount - half);
    }
  }

  doc.setDrawColor(60).line(lx - 6, y - 4, PW - M + 10, y - 4);
  sumRow("Total invoice value", inv.total, { bold: true, color: [20, 20, 20] });
  doc.setDrawColor(60).line(lx - 6, y - 10, PW - M + 10, y - 10);

  y += 4;
  if (inv.advanceReceived > 0) {
    sumRow(`Less: advance received`, inv.advanceReceived, { color: [40, 120, 40] });
    doc.setDrawColor(100).line(lx - 6, y - 4, PW - M + 10, y - 4);
  }

  // Balance due — highlighted box
  const balBoxH = 36;
  doc.setFillColor(254, 226, 226).rect(lx - 10, y, PW - M + 18 - lx, balBoxH, "F");
  doc.setDrawColor(220, 38, 38).rect(lx - 10, y, PW - M + 18 - lx, balBoxH, "S");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(180, 20, 20);
  doc.text("Balance due", lx, y + 14);
  doc.setFontSize(13).setTextColor(120, 0, 0);
  doc.text(formatINRPdf(inv.balanceDue), rx, y + 22, { align: "right" });
  y += balBoxH + 14;

  // Amount in words hint
  doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(120);
  doc.text(`Invoice value: ${formatINRPdf(inv.total)} (Rupees — amount in figures)`, M, y);
  y += 14;

  if (inv.note) {
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
    doc.text(`Note: ${inv.note}`, M, y);
    y += 14;
  }

  // Page 1 footer
  doc.setDrawColor(180).line(M - 10, PH - 36, PW - M + 10, PH - 36);
  doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(140);
  doc.text("This is a computer-generated Tax Invoice. GST input credit can be claimed on this document.", PW / 2, PH - 24, { align: "center" });
  doc.setFont("helvetica", "normal").setTextColor(160);
  doc.text(`${company.name}  ·  GSTIN: ${company.gstin}  ·  ${inv.invoiceNo}  ·  Page 1 of 2`, PW / 2, PH - 12, { align: "center" });

  // ── PAGE 2 ───────────────────────────────────────────────────────────────
  doc.addPage();
  y = 48;

  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(216, 30, 39);
  doc.text(company.name, M, y);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(20);
  doc.text("Bank details for balance payment", M, y + 20);
  doc.setDrawColor(200).line(M, y + 28, PW - M, y + 28);
  y += 44;

  // Bank details box
  doc.setFillColor(240, 249, 255).rect(M, y, W, 90, "F");
  doc.setDrawColor(59, 130, 246).rect(M, y, W, 90, "S");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30, 64, 175);
  doc.text("Please remit balance of " + formatINRPdf(inv.balanceDue) + " to:", M + 12, y + 16);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(30);
  company.bankDetails.split("\n").forEach((ln, i) => {
    doc.text(ln, M + 12, y + 30 + i * 13);
  });
  y += 104;

  // Payment instructions
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
  doc.text("Payment instructions", M, y);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(70);
  [
    "1. Transfer the balance amount to the account shown above.",
    "2. Use your company name or Invoice No as the payment reference.",
    "3. Email the UTR / transaction ID to confirm payment.",
    "4. This invoice must be paid by the due date to avoid interest charges.",
  ].forEach((ln, i) => { doc.text(ln, M + 6, y + 14 + i * 13); });
  y += 76;

  // Declaration
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
  doc.text("Declaration", M, y);
  doc.setDrawColor(200).line(M, y + 5, PW - M, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
  doc.text(
    "We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.",
    M, y + 18,
  );
  y += 44;

  // Signature block
  doc.setDrawColor(140);
  doc.line(M, y, M + 200, y);
  doc.line(PW - M - 200, y, PW - M, y);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  doc.text("Recipient acknowledgement", M, y + 12);
  doc.text("For " + company.name, PW - M - 200, y + 12);
  doc.text("Authorised signatory", PW - M - 200, y + 22);

  // Page 2 footer
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(160);
  doc.text(
    `${company.name}  ·  ${inv.invoiceNo}  ·  Page 2 of 2`,
    PW / 2, PH - 22, { align: "center" },
  );

  doc.save(`${inv.invoiceNo}.pdf`);
}
