import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { exportRowsToXlsx } from "../lib/exportXlsx.js";

/**
 * Renders Export PDF + Excel for a table element ref or row data.
 * @param {"tableRef"|"rows"} mode
 */
export default function ExportButtons({
  label = "Export",
  pdfTitle,
  filenameBase,
  tableRef,
  rows,
  sheetName = "Export",
  className = "",
}) {
  const pdf = async () => {
    try {
      if (tableRef?.current) {
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `${filenameBase}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: document.documentElement.classList.contains("dark") ? "#0f172a" : "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        };
        const el = tableRef.current;
        await html2pdf().set(opt).from(el).save();
        toast.success("PDF downloaded");
        return;
      }
      if (rows?.length) {
        const wrap = document.createElement("div");
        wrap.style.padding = "16px";
        wrap.style.fontFamily = "system-ui, sans-serif";
        wrap.style.fontSize = "11px";
        wrap.style.color = document.documentElement.classList.contains("dark") ? "#f1f5f9" : "#0f172a";
        wrap.style.background = document.documentElement.classList.contains("dark") ? "#0f172a" : "#ffffff";
        if (pdfTitle) {
          const h = document.createElement("h2");
          h.textContent = pdfTitle;
          h.style.marginBottom = "12px";
          wrap.appendChild(h);
        }
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        const keys = Object.keys(rows[0]);
        const thead = document.createElement("thead");
        const trh = document.createElement("tr");
        keys.forEach((k) => {
          const th = document.createElement("th");
          th.textContent = k;
          th.style.border = "1px solid #94a3b8";
          th.style.padding = "6px";
          th.style.textAlign = "left";
          trh.appendChild(th);
        });
        thead.appendChild(trh);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        rows.forEach((row) => {
          const tr = document.createElement("tr");
          keys.forEach((k) => {
            const td = document.createElement("td");
            const v = row[k];
            td.textContent = v == null ? "" : String(v);
            td.style.border = "1px solid #cbd5e1";
            td.style.padding = "6px";
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        document.body.appendChild(wrap);
        wrap.style.position = "fixed";
        wrap.style.left = "-12000px";
        const opt = {
          margin: [8, 8, 8, 8],
          filename: `${filenameBase}.pdf`,
          image: { type: "jpeg", quality: 0.92 },
          html2canvas: { scale: 1.5, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        };
        await html2pdf().set(opt).from(wrap).save();
        document.body.removeChild(wrap);
        toast.success("PDF downloaded");
        return;
      }
      toast.error("Nothing to export");
    } catch {
      toast.error("PDF export failed");
    }
  };

  const xlsx = () => {
    try {
      if (!rows?.length) {
        toast.error("Nothing to export");
        return;
      }
      exportRowsToXlsx(rows, filenameBase, sheetName);
      toast.success("Excel downloaded");
    } catch (e) {
      toast.error(e.message || "Excel export failed");
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void pdf()}
        className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        PDF
      </button>
      <button
        type="button"
        onClick={xlsx}
        disabled={!rows?.length}
        className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-lg border border-emerald-700/40 bg-emerald-600/10 px-3 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-600/20 disabled:opacity-40 dark:border-emerald-500/40 dark:text-emerald-300"
      >
        Excel
      </button>
    </div>
  );
}
