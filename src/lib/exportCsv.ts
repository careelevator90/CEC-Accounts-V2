/**
 * Utility functions for exporting financial data to CSV format.
 */

import { Expense, Income } from '../types';

/**
 * Escapes a single cell for CSV formatting.
 * Encapsulates in quotes if cell contains commas, quotes, or newlines.
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates and triggers download of a CSV file.
 * Includes UTF-8 BOM so Excel and spreadsheet tools handle character encoding correctly.
 */
export function downloadCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string
): boolean {
  if (!rows || rows.length === 0) {
    return false;
  }

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map(escapeCsvCell).join(','));

  // Data rows
  for (const row of rows) {
    csvRows.push(row.map(escapeCsvCell).join(','));
  }

  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Exports a list of expenses to a CSV file.
 */
export function exportExpensesToCsv(expenses: Expense[], customFilename?: string): boolean {
  const headers = [
    'Date',
    'Invoice No',
    'Category',
    'Sub Category',
    'Lift / Unit No',
    'Owner / Project',
    'Location',
    'Description',
    'Amount (BDT)',
    'Payment Account',
    'Advance Payment',
    'Advance Person',
    'Advance Status'
  ];

  const rows = expenses.map((exp) => [
    exp.date || '',
    exp.invoice || '',
    exp.category || '',
    exp.subCategory || '',
    exp.liftNo || '',
    exp.owner || '',
    exp.location || '',
    exp.description || '',
    typeof exp.amount === 'number' ? exp.amount : (parseFloat(String(exp.amount)) || 0),
    exp.account || 'Cash',
    exp.isAdvance ? 'Yes' : 'No',
    exp.advancePerson || '',
    exp.advanceStatus || ''
  ]);

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `care_elevator_expenses_${dateStr}.csv`;

  return downloadCsv(headers, rows, customFilename || defaultName);
}

/**
 * Exports a list of incomes to a CSV file.
 */
export function exportIncomesToCsv(incomes: Income[], customFilename?: string): boolean {
  const headers = [
    'Date',
    'Income Source',
    'Lift / Unit No',
    'Owner / Project',
    'Location',
    'Total Bill (BDT)',
    'Discount (BDT)',
    'Net Bill (BDT)',
    'Paid / Collected (BDT)',
    'Due Amount (BDT)',
    'Payment Account',
    'Description'
  ];

  const rows = incomes.map((inc) => {
    const total = typeof inc.totalAmt === 'number' ? inc.totalAmt : (parseFloat(String(inc.totalAmt)) || 0);
    const discount = typeof inc.discountAmt === 'number' ? inc.discountAmt : (parseFloat(String(inc.discountAmt)) || 0);
    const net = inc.netAmt !== undefined ? inc.netAmt : (total - discount);
    const paid = typeof inc.paidAmt === 'number' ? inc.paidAmt : (parseFloat(String(inc.paidAmt)) || 0);
    const due = typeof inc.dueAmt === 'number' ? inc.dueAmt : (parseFloat(String(inc.dueAmt)) || 0);

    return [
      inc.date || '',
      inc.source || '',
      inc.liftNo || '',
      inc.owner || '',
      inc.location || '',
      total,
      discount,
      net,
      paid,
      due,
      inc.account || 'Cash',
      inc.description || ''
    ];
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `care_elevator_incomes_${dateStr}.csv`;

  return downloadCsv(headers, rows, customFilename || defaultName);
}
