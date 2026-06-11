"use client";

import { FileText, FileSpreadsheet, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";

const REPORTS = [
  { type: "task", label: "Task Report" },
  { type: "expense", label: "Expense Report" },
  { type: "settlement", label: "Settlement Report" },
  { type: "fairness", label: "Fairness Report" },
] as const;

const FORMATS = [
  { format: "csv", label: "CSV", icon: FileText },
  { format: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", icon: FileType },
] as const;

export function ReportDownloads({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {REPORTS.map((r) => (
        <div key={r.type} className="rounded-xl border p-4">
          <p className="font-medium">{r.label}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <Button key={f.format} variant="outline" size="sm" asChild>
                <a
                  href={`/api/workspaces/${workspaceId}/reports?type=${r.type}&format=${f.format}`}
                >
                  <f.icon className="h-4 w-4" /> {f.label}
                </a>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
