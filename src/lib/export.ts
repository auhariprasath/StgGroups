import type { Db, Lead, Quotation, Payment } from "./data/types";

function escape(v: string | number | undefined | null): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function download(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
): void {
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportLeadsCSV(leads: Lead[], db: Db): void {
  const headers = [
    "Name",
    "Phone",
    "Email",
    "Company",
    "Status",
    "Priority",
    "Source",
    "Assigned To",
    "STG Company",
    "Created At",
  ];
  const rows = leads.map((l) => {
    const assignee = db.users.find((u) => u.id === l.assignedToUserId);
    const company = db.companies.find((c) => c.id === l.companyId);
    return [
      l.name,
      l.phone,
      l.email,
      l.customerCompany,
      l.status,
      l.priority,
      l.source,
      assignee?.name,
      company?.name,
      new Date(l.createdAt).toLocaleDateString("en-IN"),
    ];
  });
  download(`leads-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportQuotationsCSV(quotations: Quotation[], db: Db): void {
  const headers = [
    "Quotation No",
    "Version",
    "Lead",
    "STG Company",
    "Date",
    "Validity",
    "Status",
    "GST %",
    "Subtotal",
    "GST Amount",
    "Grand Total",
  ];
  const rows = quotations.map((q) => {
    const lead = db.leads.find((l) => l.id === q.leadId);
    const company = db.companies.find((c) => c.id === q.companyId);
    const sub = q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
    const gstAmt = Math.round((sub * q.gstPercent) / 100);
    return [
      q.quotationNo,
      q.version,
      lead?.name,
      company?.name,
      q.date,
      q.validityDate,
      q.status,
      q.gstPercent,
      sub,
      gstAmt,
      sub + gstAmt,
    ];
  });
  download(`quotations-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportPaymentsCSV(payments: Payment[], db: Db): void {
  const headers = [
    "Lead",
    "STG Company",
    "Stage",
    "Total",
    "Advance",
    "Balance",
    "Paid Amount",
    "Remaining",
    "Updated At",
  ];
  const rows = payments.map((p) => {
    const lead = db.leads.find((l) => l.id === p.leadId);
    const quotation = db.quotations.find((q) => q.id === p.quotationId);
    const company = db.companies.find((c) => c.id === quotation?.companyId);
    return [
      lead?.name,
      company?.name,
      p.stage,
      p.total,
      p.advanceAmount,
      p.balanceAmount,
      p.balanceAmount,
      p.total - p.balanceAmount,
      new Date(p.updatedAt).toLocaleDateString("en-IN"),
    ];
  });
  download(`payments-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportCustomersCSV(leads: Lead[], db: Db): void {
  const converted = leads.filter((l) =>
    ["completed", "quote_sent", "active_project", "work_order"].includes(l.status),
  );
  const headers = [
    "Name",
    "Phone",
    "Email",
    "Company",
    "GST No",
    "Status",
    "STG Company",
    "Revenue (INR)",
    "Deals",
    "Last Activity",
  ];
  const rows = converted.map((l) => {
    const stg = db.companies.find((c) => c.id === l.companyId);
    const payment = db.payments.filter((p) => p.leadId === l.id && p.stage === "fully_paid");
    const revenue = payment.reduce((s, p) => s + p.total, 0);
    const lastAct = db.activities
      .filter((a) => a.leadId === l.id)
      .sort((a, b) => b.at.localeCompare(a.at))[0];
    return [
      l.name,
      l.phone,
      l.email,
      l.customerCompany,
      l.gstNumber,
      l.status,
      stg?.name,
      revenue,
      payment.length,
      lastAct ? new Date(lastAct.at).toLocaleDateString("en-IN") : "",
    ];
  });
  download(`customers-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
