export type ExcelRow = Record<string, unknown>;

export const REQUIRED_UPLOAD_COLUMNS = [
  'Pers.No.',
  'Employee Name',
  'Gender Key',
  'Street and House Number',
  'District',
  'Employment Status',
  'Birth date',
];

const COLUMN_ALIASES: Record<string, string[]> = {
  'Pers.No.': ['Pers.No.', 'Pers No.', 'Personnel Number', 'Persno', 'persno'],
  'Employee Name': ['Employee Name', 'Name', 'Full Name'],
  'Gender Key': ['Gender Key', 'Gender'],
  'Street and House Number': ['Street and House Number', 'Street Address', 'Address', 'Alamat'],
  District: ['District', 'District Name', 'Kecamatan'],
  'Employment Status': ['Employment Status', 'Status', 'Employment Status Text'],
  'Birth date': ['Birth date', 'Birth Date', 'Date of Birth', 'Tanggal Lahir'],
};

function normalizeColumnName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeEmploymentStatus(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';

  const normalized = raw.replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    active: 'active',
    aktif: 'active',
    inactive: 'inactive',
    inaktif: 'inactive',
    resign: 'resign',
    resigned: 'resign',
    terminated: 'terminated',
    retired: 'retired',
  };

  return aliases[normalized] ?? normalized;
}

export function getMissingColumns(sheetKeys: string[], requiredColumns: string[] = REQUIRED_UPLOAD_COLUMNS): string[] {
  const available = new Set(sheetKeys.map(key => normalizeColumnName(key)));

  return requiredColumns.filter(required => {
    const aliases = COLUMN_ALIASES[required] ?? [required];
    return !aliases.some(alias => available.has(normalizeColumnName(alias)));
  });
}

export function validateUploadTemplate(sheetKeys: string[]): { missingColumns: string[]; isValid: boolean } {
  const missingColumns = getMissingColumns(sheetKeys, REQUIRED_UPLOAD_COLUMNS);
  return { missingColumns, isValid: missingColumns.length === 0 };
}

export function filterValidUploadRows(rows: ExcelRow[]): { validRows: ExcelRow[]; invalidRows: number; skippedNonActive: number } {
  let invalidRows = 0;
  let skippedNonActive = 0;
  const validRows: ExcelRow[] = [];

  for (const row of rows) {
    const employeeName = String(row['Employee Name'] ?? row.Name ?? row['Full Name'] ?? '').trim();
    const persNo = String(row['Pers.No.'] ?? row['Pers No.'] ?? row['Personnel Number'] ?? row.Persno ?? row.persno ?? '').trim();
    const streetAddress = String(row['Street and House Number'] ?? '').trim();
    const gender = String(row['Gender Key'] ?? '').trim();
    const status = normalizeEmploymentStatus(row['Employment Status'] ?? row.Status ?? '');

    if (!employeeName || !persNo || !streetAddress || !gender || !status) {
      invalidRows += 1;
      continue;
    }

    if (status !== 'active') {
      skippedNonActive += 1;
      continue;
    }

    validRows.push(row);
  }

  return { validRows, invalidRows, skippedNonActive };
}
