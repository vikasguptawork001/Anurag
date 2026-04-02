import * as XLSX from "xlsx";

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} filename without extension
 * @param {string} sheetName
 */
export function exportRowsToXlsx(rows, filename, sheetName = "Sheet1") {
  if (!rows?.length) {
    throw new Error("No rows to export");
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
