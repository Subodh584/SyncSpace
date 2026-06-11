import { requireMember } from "@/lib/auth-helpers";
import {
  buildReport,
  type ReportType,
  type ReportData,
} from "@/lib/services/reports";
import { jsonError, json } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const REPORT_TYPES: ReportType[] = [
  "task",
  "expense",
  "settlement",
  "fairness",
];

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireMember(id);

    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "task") as ReportType;
    const format = url.searchParams.get("format") ?? "csv";
    if (!REPORT_TYPES.includes(type))
      return json({ error: "Invalid report type" }, 400);

    const data = await buildReport(id, type);
    const filename = `${type}-report`;

    switch (format) {
      case "csv":
        return csvResponse(data, filename);
      case "xlsx":
        return await xlsxResponse(data, filename);
      case "pdf":
        return await pdfResponse(data, filename);
      default:
        return json({ error: "Invalid format" }, 400);
    }
  } catch (err) {
    return jsonError(err);
  }
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvResponse(data: ReportData, filename: string): Response {
  const lines = [
    data.columns.map(csvEscape).join(","),
    ...data.rows.map((r) => r.map(csvEscape).join(",")),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

async function xlsxResponse(
  data: ReportData,
  filename: string,
): Promise<Response> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(data.title);
  ws.addRow(data.columns);
  ws.getRow(1).font = { bold: true };
  data.rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => {
    c.width = 22;
  });
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

async function pdfResponse(
  data: ReportData,
  filename: string,
): Promise<Response> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(data.title, 14, 18);
  autoTable(doc, {
    head: [data.columns],
    body: data.rows.map((r) => r.map(String)),
    startY: 26,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });
  const buffer = doc.output("arraybuffer");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
