// RFC 4180 CSV builder. Quote only when necessary; escape embedded quotes.

export type CsvRow = readonly (string | number | null | undefined)[];

export function buildCsv(headers: readonly string[], rows: readonly CsvRow[]): string {
  return [headers, ...rows]
    .map((row) => row.map(csvField).join(","))
    .join("\r\n");
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
