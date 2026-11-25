// Stops spreadsheet apps from running text such as "=SUM(...)" typed into a name
const safe = (v) => {
  const s = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

export function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${safe(v).replace(/"/g, '""')}"`;
  const text = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  saveBlob(filename, new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
}

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";
