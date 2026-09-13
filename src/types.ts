/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Expense {
  id?: string; // Firestore document ID
  rowId: number;
  date: string;
  invoice: string;
  category: 'Installation' | 'Maintenance' | 'Cash Advance' | 'Owner Payment' | string;
  subCategory?: string;
  liftNo?: string;
  owner?: string;
  location?: string;
  description?: string;
  amount: number;
  account?: 'Cash' | 'Bank';
  isAdvance?: boolean; // Cash advance for purchasing goods/materials
  advancePerson?: string; // Advance given to (person/vendor name)
  advanceStatus?: 'Pending' | 'Adjusted'; // Status of the advance
}

export interface Income {
  id?: string; // Firestore document ID
  rowId: number;
  date: string;
  source: string;
  liftNo: string;
  owner: string;
  location: string;
  totalAmt: number; // Total invoiced / billed amount before discount
  discountAmt?: number; // Discount given to customer
  netAmt?: number; // Net bill amount (totalAmt - discountAmt)
  paidAmt: number; // Amount collected / paid
  dueAmt: number; // Remaining due ((totalAmt - discountAmt) - paidAmt)
  description?: string;
  account?: 'Cash' | 'Bank';
}

export interface SheetRow {
  rowId: number;
  values: string[];
}

export interface SheetDataResponse {
  expenses: SheetRow[];
  incomes: SheetRow[];
}

export type TabType = 'dashboard' | 'expense' | 'income' | 'reports' | 'settings';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export const FULL_ACCESS_EMAILS: readonly string[] = [
  'careelevator90@gmail.com',
  'elevcen@hotmail.com',
  'ji.tft90@gmail.com'
];

export const isFullAccessEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  return FULL_ACCESS_EMAILS.includes(clean);
};

export const isMissingInvoice = (inv: any): boolean => {
  if (inv === undefined || inv === null) return true;
  const str = String(inv).trim().toLowerCase();
  return (
    str === '' ||
    str === '0' ||
    str === 'no invoice' ||
    str === 'n/a' ||
    str === 'na' ||
    str === 'none' ||
    str === '-' ||
    str === 'nil' ||
    str === 'null'
  );
};
