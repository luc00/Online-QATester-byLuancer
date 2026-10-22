import { TestCase, Bug, WebsiteAuditReport } from '../types/qa.ts';

/**
 * Utility to download raw text or CSV as a client-side file
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV field
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export Test Cases as CSV for any client
 */
export function exportTestCasesToCsv(testCases: TestCase[], filename = 'test-cases.csv') {
  const headers = [
    'ID',
    'Suite',
    'Title',
    'Type',
    'Priority',
    'Status',
    'Preconditions',
    'Steps',
    'Expected Result',
    'Automated',
    'Created At',
  ];

  const rows = testCases.map((tc) => [
    escapeCsv(tc.id),
    escapeCsv(tc.suite),
    escapeCsv(tc.title),
    escapeCsv(tc.type),
    escapeCsv(tc.priority),
    escapeCsv(tc.status),
    escapeCsv(tc.preconditions || ''),
    escapeCsv(tc.steps),
    escapeCsv(tc.expectedResult),
    escapeCsv(tc.automated ? 'YES' : 'NO'),
    escapeCsv(tc.createdAt),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8');
}

/**
 * Export Defects & Bugs as CSV for any client
 */
export function exportBugsToCsv(bugs: Bug[], filename = 'defects-report.csv') {
  const headers = [
    'Bug ID',
    'Title',
    'Severity',
    'Priority',
    'Status',
    'Environment',
    'Description',
    'Steps to Reproduce',
    'Created At',
    'Updated At',
  ];

  const rows = bugs.map((b) => [
    escapeCsv(b.id),
    escapeCsv(b.title),
    escapeCsv(b.severity),
    escapeCsv(b.priority),
    escapeCsv(b.status),
    escapeCsv(b.environment || ''),
    escapeCsv(b.description),
    escapeCsv(b.stepsToReproduce),
    escapeCsv(b.createdAt),
    escapeCsv(b.updatedAt),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8');
}
