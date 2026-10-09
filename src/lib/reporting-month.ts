export function getEffectiveReportDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const reportDate = new Date(date);
  reportDate.setMonth(date.getMonth() - 1);
  return reportDate;
}

export function getEffectiveMonthKey(value: string | Date | null | undefined): string | null {
  const reportDate = getEffectiveReportDate(value);
  if (!reportDate) return null;

  return `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
}

export function getEffectiveMonthLabel(value: string | Date | null | undefined): string {
  const reportDate = getEffectiveReportDate(value);
  if (!reportDate) return '—';

  return reportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function getUploadMonthLabel(value: string | Date | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}
