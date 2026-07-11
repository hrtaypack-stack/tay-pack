import * as XLSX from "xlsx";

export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  sheetName = "Sheet1",
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
