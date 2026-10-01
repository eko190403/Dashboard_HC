export type ExcelRow = Record<string, unknown>;

function getEmployeeKey(row: ExcelRow): string | null {
  const persNo = String(
    row['Pers.No.'] ?? row['Pers No.'] ?? row['Personnel Number'] ?? row.Persno ?? row.persno ?? ''
  ).trim();

  const employeeName = String(
    row['Employee Name'] ?? row.Name ?? row['Full Name'] ?? ''
  ).trim().toLowerCase();

  const birthDate = String(row['Birth date'] ?? '').trim();

  if (persNo) return `pers:${persNo}`;
  if (employeeName && birthDate) return `name:${employeeName}|${birthDate}`;
  if (employeeName) return `name:${employeeName}`;

  return null;
}

function scoreEmployeeRow(row: ExcelRow): number {
  let score = 0;

  if (String(row['Employment Status'] ?? '').trim().toLowerCase() === 'active') score += 5;
  if (String(row['Street and House Number'] ?? '').trim()) score += 2;
  if (String(row['Gender Key'] ?? '').trim()) score += 2;
  if (String(row['Pers.No.'] ?? row['Pers No.'] ?? row['Personnel Number'] ?? row.Persno ?? row.persno ?? '').trim()) score += 3;
  if (String(row['Employee Name'] ?? row.Name ?? row['Full Name'] ?? '').trim()) score += 1;

  return score;
}

export function deduplicateRows(rows: ExcelRow[]): { data: ExcelRow[]; duplicatesSkipped: number } {
  const uniqueMap = new Map<string, ExcelRow>();
  let duplicatesSkipped = 0;

  rows.forEach((row, index) => {
    const employeeKey = getEmployeeKey(row) || `fallback:${index}`;
    const existing = uniqueMap.get(employeeKey);

    if (!existing) {
      uniqueMap.set(employeeKey, row);
      return;
    }

    duplicatesSkipped += 1;

    if (scoreEmployeeRow(row) > scoreEmployeeRow(existing)) {
      uniqueMap.set(employeeKey, row);
    }
  });

  return {
    data: Array.from(uniqueMap.values()),
    duplicatesSkipped,
  };
}
