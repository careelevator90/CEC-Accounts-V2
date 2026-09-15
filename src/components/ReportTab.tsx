import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Printer, 
  Eye, 
  Wrench, 
  Building, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Car,
  Home,
  Wallet,
  BarChart3,
  Landmark,
  ChevronDown,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Tag,
  Search,
  X,
  User,
  MapPin,
  ArrowUpDown
} from 'lucide-react';
import { Expense, Income, isMissingInvoice } from '../types';
import { SaudiRiyalIcon } from './SaudiRiyalIcon';

interface ReportTabProps {
  expenses: Expense[];
  incomes: Income[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export type ReportCategory = 
  | 'Expense_All'
  | 'Expense_Overview'
  | 'Expense_Bank'
  | 'Expense_Installation'
  | 'Expense_Lift_Maintenance'
  | 'Expense_Car_Maintenance'
  | 'Expense_Office'
  | 'Expense_Owner_Payment'
  | 'Expense_Advances'
  | 'Income_All' 
  | 'Income_Overview'
  | 'Income_Bank'
  | 'Income_Installation' 
  | 'Income_Repair' 
  | 'Income_Maintenance' 
  | 'Lift_Statement';

export default function ReportTab({
  expenses,
  incomes,
  selectedMonth,
  setSelectedMonth,
  addToast
}: ReportTabProps) {
  const [activeReport, setActiveReport] = useState<ReportCategory>('Expense_All');
  const [accountFilter, setAccountFilter] = useState<'All' | 'Cash' | 'Bank'>('All');
  const [selectedLift, setSelectedLift] = useState<string>('All');
  const [liftSearchQuery, setLiftSearchQuery] = useState<string>('');
  const [searchViewMode, setSearchViewMode] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightMissingInvoices, setHighlightMissingInvoices] = useState<boolean>(true);
  const [timeMode, setTimeMode] = useState<'monthly' | 'all'>('monthly');

  // Extract list of all unique lifts across incomes & expenses with rich summary
  const allLifts = useMemo(() => {
    const liftMap = new Map<string, { 
      owner: string; 
      location: string;
      incomeCount: number;
      expenseCount: number;
      totalIncome: number;
      totalExpense: number;
    }>();

    incomes.forEach(i => {
      const liftVal = i.liftNo != null ? String(i.liftNo).trim() : '';
      if (liftVal) {
        const existing = liftMap.get(liftVal) || { 
          owner: i.owner ? String(i.owner).trim() : '', 
          location: i.location ? String(i.location).trim() : '',
          incomeCount: 0,
          expenseCount: 0,
          totalIncome: 0,
          totalExpense: 0
        };
        if (!existing.owner && i.owner) existing.owner = String(i.owner).trim();
        if (!existing.location && i.location) existing.location = String(i.location).trim();
        existing.incomeCount += 1;
        existing.totalIncome += (i.paidAmt || 0);
        liftMap.set(liftVal, existing);
      }
    });

    expenses.forEach(e => {
      const liftVal = e.liftNo != null ? String(e.liftNo).trim() : '';
      if (liftVal && e.subCategory !== 'Car Maintenance') {
        const existing = liftMap.get(liftVal) || { 
          owner: e.owner ? String(e.owner).trim() : '', 
          location: e.location ? String(e.location).trim() : '',
          incomeCount: 0,
          expenseCount: 0,
          totalIncome: 0,
          totalExpense: 0
        };
        if (!existing.owner && e.owner) existing.owner = String(e.owner).trim();
        if (!existing.location && e.location) existing.location = String(e.location).trim();
        existing.expenseCount += 1;
        existing.totalExpense += (e.amount || 0);
        liftMap.set(liftVal, existing);
      }
    });

    return Array.from(liftMap.entries()).map(([liftNo, info]) => ({
      liftNo,
      owner: info.owner,
      location: info.location,
      incomeCount: info.incomeCount,
      expenseCount: info.expenseCount,
      totalIncome: info.totalIncome,
      totalExpense: info.totalExpense
    })).sort((a, b) => String(a.liftNo).localeCompare(String(b.liftNo), undefined, { numeric: true }));
  }, [incomes, expenses]);

  // Is specific lift/owner search active?
  const isLiftSearchActive = Boolean(liftSearchQuery.trim()) || selectedLift !== 'All';

  // Matching lifts for dropdown / auto-complete
  const matchingLifts = useMemo(() => {
    const q = liftSearchQuery.trim().toLowerCase();
    if (!q) return allLifts.slice(0, 10);
    return allLifts.filter(l => 
      l.liftNo.toLowerCase().includes(q) ||
      l.owner.toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [allLifts, liftSearchQuery]);

  // Information of selected lift
  const activeLiftInfo = useMemo(() => {
    if (selectedLift !== 'All') {
      return allLifts.find(l => l.liftNo.toLowerCase() === selectedLift.toLowerCase());
    }
    const q = liftSearchQuery.trim().toLowerCase();
    if (q) {
      return allLifts.find(l => l.liftNo.toLowerCase() === q || l.owner.toLowerCase() === q);
    }
    return null;
  }, [allLifts, selectedLift, liftSearchQuery]);

  // Check if an entry matches current lift/owner search
  const matchesLiftSearch = (item: { liftNo?: string | number; owner?: string; location?: string; description?: string }) => {
    if (!isLiftSearchActive) return true;
    if (selectedLift !== 'All') {
      return String(item.liftNo ?? '').trim().toLowerCase() === selectedLift.trim().toLowerCase();
    }
    const q = liftSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const liftStr = String(item.liftNo ?? '').trim().toLowerCase();
    const ownerStr = String(item.owner ?? '').trim().toLowerCase();
    const locStr = String(item.location ?? '').trim().toLowerCase();
    const descStr = String(item.description ?? '').trim().toLowerCase();
    return liftStr.includes(q) || ownerStr.includes(q) || locStr.includes(q) || descStr.includes(q);
  };

  const clearLiftSearch = () => {
    setLiftSearchQuery('');
    setSelectedLift('All');
    setShowSuggestions(false);
  };

  // Filtered by account
  const filteredExpensesByAccount = useMemo(() => {
    return expenses.filter(e => {
      if (accountFilter === 'Cash') return e.account !== 'Bank';
      if (accountFilter === 'Bank') return e.account === 'Bank';
      return true;
    });
  }, [expenses, accountFilter]);

  const filteredIncomesByAccount = useMemo(() => {
    return incomes.filter(i => {
      if (accountFilter === 'Cash') return i.account !== 'Bank';
      if (accountFilter === 'Bank') return i.account === 'Bank';
      return true;
    });
  }, [incomes, accountFilter]);

  // Title resolver
  const getReportTitle = (report: ReportCategory) => {
    if (isLiftSearchActive || report === 'Lift_Statement') {
      const target = selectedLift !== 'All' 
        ? `Lift #${selectedLift}${activeLiftInfo?.owner ? ` (${activeLiftInfo.owner})` : ''}` 
        : (liftSearchQuery ? `Search: "${liftSearchQuery}"` : 'All Lifts Combined');
      
      if (searchViewMode === 'INCOME') return `Lift Income Statement: ${target}`;
      if (searchViewMode === 'EXPENSE') return `Lift Expense Statement: ${target}`;
      return `Lift Financial Statement: ${target} (Income & Expenses)`;
    }
    if (report === 'Expense_All') return 'Total Expenses Report (All)';
    if (report === 'Expense_Overview') return 'Expense Overview (by Category)';
    if (report === 'Expense_Bank') return 'Bank Account Outflow Report';
    if (report === 'Expense_Installation') return 'Installation Expense Report';
    if (report === 'Expense_Lift_Maintenance') return 'Lift Maintenance Expense Report';
    if (report === 'Expense_Car_Maintenance') return 'Car Maintenance Expense Report';
    if (report === 'Expense_Office') return 'Office & Staff House Expense Report';
    if (report === 'Expense_Owner_Payment') return 'Owner Payment Report';
    if (report === 'Expense_Advances') return 'Cash Advances for Purchasing Materials';
    if (report === 'Income_All') return 'Total Incomes Report (All)';
    if (report === 'Income_Overview') return 'Income Overview (Cash vs Bank & Dues)';
    if (report === 'Income_Bank') return 'Bank Account Inflow Report';
    if (report === 'Income_Installation') return 'Installation Income Report';
    if (report === 'Income_Repair') return 'Lift Repair Income Report';
    if (report === 'Income_Maintenance') return 'Yearly Lift Maintenance Income Report';
    return 'Report';
  };

  // Computes active data for reporting preview
  const reportData = useMemo(() => {
    const isMonthly = timeMode === 'monthly';

    // 1. SPECIFIC LIFT / OWNER SEARCH OR LIFT STATEMENT SPECIFIC REPORT
    if (isLiftSearchActive || activeReport === 'Lift_Statement') {
      const rawLiftExpenses = filteredExpensesByAccount.filter(e => {
        if (isMonthly && (!e.date || !e.date.startsWith(selectedMonth))) return false;
        return matchesLiftSearch(e);
      });

      const rawLiftIncomes = filteredIncomesByAccount.filter(i => {
        if (isMonthly && (!i.date || !i.date.startsWith(selectedMonth))) return false;
        return matchesLiftSearch(i);
      });

      // Filter based on selected view mode (All, Income only, Expense only)
      const liftExpenses = searchViewMode === 'INCOME' ? [] : rawLiftExpenses;
      const liftIncomes = searchViewMode === 'EXPENSE' ? [] : rawLiftIncomes;

      const totalExpense = rawLiftExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalBilled = rawLiftIncomes.reduce((sum, i) => sum + (i.totalAmt || 0), 0);
      const totalDiscount = rawLiftIncomes.reduce((sum, i) => sum + (i.discountAmt || 0), 0);
      const totalNetBilled = rawLiftIncomes.reduce((sum, i) => sum + (i.netAmt !== undefined ? i.netAmt : ((i.totalAmt || 0) - (i.discountAmt || 0))), 0);
      const totalPaid = rawLiftIncomes.reduce((sum, i) => sum + (i.paidAmt || 0), 0);
      const totalDue = rawLiftIncomes.reduce((sum, i) => sum + (i.dueAmt || 0), 0);
      const netProfit = totalPaid - totalExpense;

      // Count missing invoices
      const missingExpenseInvoices = rawLiftExpenses.filter(e => isMissingInvoice(e.invoice)).length;
      const missingIncomeInvoices = rawLiftIncomes.filter(i => isMissingInvoice(i.liftNo)).length;

      return {
        type: 'lift_statement',
        liftExpenses,
        liftIncomes,
        rawLiftExpenses,
        rawLiftIncomes,
        totalExpense,
        totalBilled,
        totalDiscount,
        totalNetBilled,
        totalPaid,
        totalDue,
        netProfit,
        missingInvoicesCount: missingExpenseInvoices + missingIncomeInvoices
      };
    }

    // 2. EXPENSE REPORTS
    if (activeReport.startsWith('Expense')) {
      if (activeReport === 'Expense_Overview') {
        const matches = filteredExpensesByAccount.filter(e => {
          if (isMonthly && (!e.date || !e.date.startsWith(selectedMonth))) return false;
          if (selectedLift !== 'All' && e.liftNo) {
            return String(e.liftNo ?? '').trim().toLowerCase() === String(selectedLift ?? '').trim().toLowerCase();
          }
          return true;
        });

        const totalInstallation = matches.filter(e => e.category === 'Installation').reduce((sum, e) => sum + e.amount, 0);
        const totalLiftMaintenance = matches.filter(e => e.category === 'Maintenance' && e.subCategory === 'Lift Maintenance').reduce((sum, e) => sum + e.amount, 0);
        const totalCarMaintenance = matches.filter(e => e.category === 'Maintenance' && e.subCategory === 'Car Maintenance').reduce((sum, e) => sum + e.amount, 0);
        const totalOffice = matches.filter(e => e.category === 'Maintenance' && (e.subCategory === 'Office & Staff House' || e.subCategory === 'Office & Housing')).reduce((sum, e) => sum + e.amount, 0);
        const totalAdvances = matches.filter(e => e.isAdvance || e.category === 'Cash Advance').reduce((sum, e) => sum + e.amount, 0);
        const totalOwner = matches.filter(e => e.category === 'Owner Payment').reduce((sum, e) => sum + e.amount, 0);

        const grandTotal = matches.reduce((sum, e) => sum + e.amount, 0);
        const totalCash = matches.filter(e => e.account !== 'Bank').reduce((sum, e) => sum + e.amount, 0);
        const totalBank = matches.filter(e => e.account === 'Bank').reduce((sum, e) => sum + e.amount, 0);
        const missingInvoicesCount = matches.filter(e => isMissingInvoice(e.invoice)).length;

        return {
          type: 'expense_overview',
          list: matches,
          grandTotal,
          totalCash,
          totalBank,
          missingInvoicesCount,
          categories: [
            { name: 'Installation Expense', amount: totalInstallation },
            { name: 'Lift Maintenance', amount: totalLiftMaintenance },
            { name: 'Car Maintenance', amount: totalCarMaintenance },
            { name: 'Office & Housing', amount: totalOffice },
            { name: 'Material Advances', amount: totalAdvances },
            { name: 'Owner Payments', amount: totalOwner },
          ]
        };
      }

      const list = filteredExpensesByAccount.filter(e => {
        if (isMonthly && (!e.date || !e.date.startsWith(selectedMonth))) return false;
        if (selectedLift !== 'All') {
          if (String(e.liftNo ?? '').trim().toLowerCase() !== String(selectedLift ?? '').trim().toLowerCase()) return false;
        }

        if (activeReport === 'Expense_Installation') {
          return e.category === 'Installation';
        }
        if (activeReport === 'Expense_Bank') {
          return e.account === 'Bank';
        }
        if (activeReport === 'Expense_Lift_Maintenance') {
          return e.category === 'Maintenance' && e.subCategory === 'Lift Maintenance';
        }
        if (activeReport === 'Expense_Car_Maintenance') {
          return e.category === 'Maintenance' && e.subCategory === 'Car Maintenance';
        }
        if (activeReport === 'Expense_Office') {
          return e.category === 'Maintenance' && (e.subCategory === 'Office & Staff House' || e.subCategory === 'Office & Housing');
        }
        if (activeReport === 'Expense_Owner_Payment') {
          return e.category === 'Owner Payment';
        }
        if (activeReport === 'Expense_Advances') {
          return e.isAdvance || e.category === 'Cash Advance';
        }
        return true;
      });

      const grandTotal = list.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalCash = list.filter(e => e.account !== 'Bank').reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalBank = list.filter(e => e.account === 'Bank').reduce((sum, e) => sum + (e.amount || 0), 0);
      const missingInvoicesCount = list.filter(e => isMissingInvoice(e.invoice)).length;

      return {
        type: 'expense_list',
        list,
        grandTotal,
        totalCash,
        totalBank,
        missingInvoicesCount
      };
    }

    // 3. INCOME REPORTS
    if (activeReport.startsWith('Income')) {
      const list = filteredIncomesByAccount.filter(i => {
        if (isMonthly && (!i.date || !i.date.startsWith(selectedMonth))) return false;
        if (selectedLift !== 'All') {
          if (String(i.liftNo ?? '').trim().toLowerCase() !== String(selectedLift ?? '').trim().toLowerCase()) return false;
        }

        if (activeReport === 'Income_Bank') {
          return i.account === 'Bank';
        }
        if (activeReport === 'Income_Installation') {
          return i.source === 'Installation';
        }
        if (activeReport === 'Income_Repair') {
          return i.source === 'Lift Repair';
        }
        if (activeReport === 'Income_Maintenance') {
          return i.source === 'Yearly Lift Maintenance';
        }
        return true;
      });

      const totalBilled = list.reduce((sum, i) => sum + (i.totalAmt || 0), 0);
      const totalDiscount = list.reduce((sum, i) => sum + (i.discountAmt || 0), 0);
      const totalNetBilled = list.reduce((sum, i) => sum + (i.netAmt !== undefined ? i.netAmt : ((i.totalAmt || 0) - (i.discountAmt || 0))), 0);
      const totalPaid = list.reduce((sum, i) => sum + (i.paidAmt || 0), 0);
      const totalDue = list.reduce((sum, i) => sum + (i.dueAmt || 0), 0);
      const paidCash = list.filter(i => i.account !== 'Bank').reduce((sum, i) => sum + (i.paidAmt || 0), 0);
      const paidBank = list.filter(i => i.account === 'Bank').reduce((sum, i) => sum + (i.paidAmt || 0), 0);
      const missingInvoicesCount = list.filter(i => isMissingInvoice(i.liftNo)).length;

      if (activeReport === 'Income_Overview') {
        const totalYearly = list.filter(i => i.source === 'Yearly Lift Maintenance').reduce((sum, i) => sum + (i.paidAmt || 0), 0);
        const totalInstall = list.filter(i => i.source === 'Installation').reduce((sum, i) => sum + (i.paidAmt || 0), 0);
        const totalRepair = list.filter(i => i.source === 'Lift Repair').reduce((sum, i) => sum + (i.paidAmt || 0), 0);

        return {
          type: 'income_overview',
          list,
          totalBilled,
          totalDiscount,
          totalNetBilled,
          totalPaid,
          totalDue,
          paidCash,
          paidBank,
          missingInvoicesCount,
          categories: [
            { name: 'Yearly Lift Maintenance', amount: totalYearly },
            { name: 'Installation Income', amount: totalInstall },
            { name: 'Lift Repair Income', amount: totalRepair },
          ]
        };
      }

      return {
        type: 'income_list',
        list,
        totalBilled,
        totalDiscount,
        totalNetBilled,
        totalPaid,
        totalDue,
        paidCash,
        paidBank,
        missingInvoicesCount
      };
    }

    return { type: 'empty', list: [], grandTotal: 0, missingInvoicesCount: 0 };
  }, [
    activeReport, 
    filteredExpensesByAccount, 
    filteredIncomesByAccount, 
    selectedMonth, 
    selectedLift, 
    liftSearchQuery, 
    searchViewMode, 
    timeMode, 
    isLiftSearchActive
  ]);

  // Professional Print Handler
  const handlePrint = () => {
    const monthName = timeMode === 'all' 
      ? 'All Time' 
      : new Date(selectedMonth + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    const printRiyalIcon = `
      <svg viewBox="0 0 355 400" style="width: 11px; height: 11px; display: inline-block; vertical-align: middle; margin-right: 3px; fill: currentColor;" xmlns="http://www.w3.org/2000/svg">
        <path d="M125 24 L167 0 L167 285 L125 315 L32 339 L0 358 L12 390 L42 371 L125 348 L125 24 Z" />
        <path d="M208 54 L250 30 L250 312 L208 325 L208 54 Z" />
        <path d="M35 245 L350 152 L350 188 L20 280 Z" />
        <path d="M208 260 L350 219 L350 255 L208 296 Z" />
        <path d="M208 350 L350 309 L350 345 L208 386 Z" />
      </svg>
    `;

    const printTitle = getReportTitle(activeReport).toUpperCase();
    let bodyContent = '';

    // LIFT STATEMENT PRINT FORMAT
    if (reportData.type === 'lift_statement') {
      const data = reportData as any;
      const targetName = selectedLift !== 'All' 
        ? `Lift #${selectedLift}${activeLiftInfo?.owner ? ` (${activeLiftInfo.owner})` : ''}` 
        : (liftSearchQuery ? `Search: "${liftSearchQuery}"` : 'All Lifts Combined');

      const showIncomes = searchViewMode !== 'EXPENSE' && data.rawLiftIncomes && data.rawLiftIncomes.length > 0;
      const showExpenses = searchViewMode !== 'INCOME' && data.rawLiftExpenses && data.rawLiftExpenses.length > 0;

      bodyContent = `
        <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin:20px 0; display:grid; grid-template-columns: repeat(${searchViewMode === 'ALL' ? '4' : '3'}, 1fr); gap:15px; text-align:center;">
          <div style="border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#64748b; margin:0 0 4px 0; text-transform:uppercase;">Lift Details</p>
            <h4 style="font-size:13px; font-weight:900; color:#0f172a; margin:0;">${targetName}</h4>
            ${activeLiftInfo?.location ? `<p style="font-size:10px; color:#64748b; margin:2px 0 0 0;">📍 ${activeLiftInfo.location}</p>` : ''}
          </div>
          ${searchViewMode !== 'EXPENSE' ? `
          <div style="border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#16a34a; margin:0 0 4px 0; text-transform:uppercase;">Income Collected</p>
            <h4 style="font-size:15px; font-weight:900; color:#16a34a; margin:0;">${printRiyalIcon} ${data.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
            <span style="font-size:9px; color:#b45309;">Due: ${data.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>` : ''}
          ${searchViewMode !== 'INCOME' ? `
          <div style="border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#dc2626; margin:0 0 4px 0; text-transform:uppercase;">Total Expenses</p>
            <h4 style="font-size:15px; font-weight:900; color:#dc2626; margin:0;">${printRiyalIcon} ${data.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>` : ''}
          ${searchViewMode === 'ALL' ? `
          <div>
            <p style="font-size:10px; font-weight:bold; color:#2563eb; margin:0 0 4px 0; text-transform:uppercase;">Net Lift Margin</p>
            <h4 style="font-size:15px; font-weight:900; color:${data.netProfit >= 0 ? '#16a34a' : '#dc2626'}; margin:0;">${printRiyalIcon} ${data.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>` : ''}
        </div>

        ${showIncomes ? `
        <h4 style="font-size:13px; font-weight:bold; text-transform:uppercase; margin:25px 0 10px 0; border-bottom:1.5px solid #0f172a; padding-bottom:5px;">Lift Income Records (${(data.rawLiftIncomes || []).length})</h4>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th>Owner / Loc</th>
              <th style="text-align:right;">Gross</th>
              <th style="text-align:right;">Discount</th>
              <th style="text-align:right;">Net Bill</th>
              <th style="text-align:right;">Paid</th>
              <th style="text-align:right;">Due</th>
            </tr>
          </thead>
          <tbody>
            ${(data.rawLiftIncomes || []).map((i: any) => {
              const missing = isMissingInvoice(i.liftNo);
              const highlightStyle = (highlightMissingInvoices && missing) ? 'background-color:#fffbeb; border-left:3px solid #f59e0b;' : '';
              return `
                <tr style="${highlightStyle}">
                  <td>${i.date}</td>
                  <td><b>${i.source}</b></td>
                  <td>${i.owner || '-'} | ${i.location || '-'}</td>
                  <td style="text-align:right;">${(i.totalAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right; color:#b45309;">${i.discountAmt ? `-${i.discountAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style="text-align:right; font-weight:bold; color:#1e3a8a;">${(i.netAmt || (i.totalAmt - (i.discountAmt || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right; font-weight:bold; color:#16a34a;">${(i.paidAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right; font-weight:bold; color:#dc2626;">${(i.dueAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : ''}

        ${showExpenses ? `
        <h4 style="font-size:13px; font-weight:bold; text-transform:uppercase; margin:30px 0 10px 0; border-bottom:1.5px solid #0f172a; padding-bottom:5px;">Lift Expenses Records (${(data.rawLiftExpenses || []).length})</h4>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice No</th>
              <th>Category</th>
              <th>Details & Notes</th>
              <th>Account</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(data.rawLiftExpenses || []).map((e: any) => {
              const missing = isMissingInvoice(e.invoice);
              const highlightStyle = (highlightMissingInvoices && missing) ? 'background-color:#fffbeb; border-left:3px solid #f59e0b;' : '';
              return `
                <tr style="${highlightStyle}">
                  <td>${e.date}</td>
                  <td style="font-family:monospace; font-weight:bold;">
                    ${missing ? '<span style="color:#b45309; font-weight:bold;">⚠️ Missing Invoice</span>' : e.invoice}
                  </td>
                  <td>${e.category} ${e.subCategory ? `(${e.subCategory})` : ''}</td>
                  <td>${e.description || '-'}</td>
                  <td>${e.account === 'Bank' ? 'Company Bank' : 'My Cash'}</td>
                  <td style="text-align:right; font-weight:bold; color:#dc2626;">${(e.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : ''}
      `;
    } else if (reportData.type === 'expense_overview') {
      const data = reportData as any;
      bodyContent = `
        <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin:20px 0; display:flex; justify-content:space-between; text-align:center;">
          <div style="flex:1; border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#64748b; margin:0 0 5px 0;">Total Expenses</p>
            <h4 style="font-size:16px; font-weight:900; color:#dc2626; margin:0;">${printRiyalIcon} ${data.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div style="flex:1; border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#64748b; margin:0 0 5px 0;">Paid From My Cash</p>
            <h4 style="font-size:16px; font-weight:900; color:#475569; margin:0;">${printRiyalIcon} ${data.totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div style="flex:1;">
            <p style="font-size:10px; font-weight:bold; color:#64748b; margin:0 0 5px 0;">Paid From Company Bank</p>
            <h4 style="font-size:16px; font-weight:900; color:#2563eb; margin:0;">${printRiyalIcon} ${data.totalBank.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Expense Category</th>
              <th style="text-align:right;">Total Outflow</th>
            </tr>
          </thead>
          <tbody>
            ${data.categories.map((c: any) => `
              <tr>
                <td style="padding:10px 8px; font-weight:bold;">${c.name}</td>
                <td style="padding:10px 8px; text-align:right; font-weight:bold; color:#0f172a;">${printRiyalIcon} ${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td style="text-align:right; padding:15px; font-weight:bold; font-size:13px;">GRAND TOTAL:</td>
              <td style="text-align:right; padding:15px; font-weight:900; font-size:15px; color:#dc2626; border-top:2px double #334155;">
                ${printRiyalIcon} ${data.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (reportData.type === 'expense_list') {
      const data = reportData as any;
      bodyContent = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice No</th>
              <th>Category</th>
              <th>Details & Lift</th>
              <th>Paid Through</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.list.map((item: any) => {
              const missing = isMissingInvoice(item.invoice);
              const highlightStyle = (highlightMissingInvoices && missing) ? 'background-color:#fffbeb; border-left:3px solid #f59e0b;' : '';
              return `
                <tr style="${highlightStyle}">
                  <td>${item.date}</td>
                  <td style="font-family:monospace; font-weight:bold;">
                    ${missing ? '<span style="color:#b45309; font-weight:bold;">⚠️ Missing Invoice</span>' : item.invoice}
                  </td>
                  <td><b>${item.category}</b> ${item.subCategory ? `(${item.subCategory})` : ''}</td>
                  <td>
                    ${item.liftNo ? `Lift: <b>${item.liftNo}</b> | ` : ''}
                    ${item.owner ? `Owner: ${item.owner} | ` : ''}
                    ${item.description || '-'}
                  </td>
                  <td><span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1;">${item.account === 'Bank' ? 'Company Bank' : 'My Cash'}</span></td>
                  <td style="text-align:right; font-weight:bold; color:#0f172a;">${printRiyalIcon} ${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right; padding:15px; font-weight:bold; font-size:13px;">GRAND TOTAL:</td>
              <td style="text-align:right; padding:15px; font-weight:900; font-size:15px; color:#dc2626; border-top:2px double #334155;">
                ${printRiyalIcon} ${data.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (reportData.type === 'income_list' || reportData.type === 'income_overview') {
      const data = reportData as any;
      bodyContent = `
        <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin:20px 0; display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; text-align:center;">
          <div style="border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#64748b; margin:0 0 5px 0;">Total Contract Bill</p>
            <h4 style="font-size:15px; font-weight:900; color:#0f172a; margin:0;">${printRiyalIcon} ${data.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div style="border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#b45309; margin:0 0 5px 0;">Discounts Given</p>
            <h4 style="font-size:15px; font-weight:900; color:#b45309; margin:0;">${printRiyalIcon} ${data.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div style="border-right:1px solid #cbd5e1;">
            <p style="font-size:10px; font-weight:bold; color:#16a34a; margin:0 0 5px 0;">Total Collected</p>
            <h4 style="font-size:15px; font-weight:900; color:#16a34a; margin:0;">${printRiyalIcon} ${data.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div>
            <p style="font-size:10px; font-weight:bold; color:#dc2626; margin:0 0 5px 0;">Remaining Due</p>
            <h4 style="font-size:15px; font-weight:900; color:#dc2626; margin:0;">${printRiyalIcon} ${data.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th>Client & Lift Info</th>
              <th>Account</th>
              <th style="text-align:right;">Gross</th>
              <th style="text-align:right;">Discount</th>
              <th style="text-align:right;">Net Bill</th>
              <th style="text-align:right;">Paid</th>
              <th style="text-align:right;">Due</th>
            </tr>
          </thead>
          <tbody>
            ${data.list.map((item: any) => {
              const missing = isMissingInvoice(item.liftNo);
              const highlightStyle = (highlightMissingInvoices && missing) ? 'background-color:#fffbeb; border-left:3px solid #f59e0b;' : '';
              return `
                <tr style="${highlightStyle}">
                  <td>${item.date}</td>
                  <td><b>${item.source}</b></td>
                  <td>
                    ${missing ? '<span style="color:#b45309; font-weight:bold;">⚠️ Missing Lift Info | </span>' : `Lift: <b>${item.liftNo}</b> | `}
                    ${item.owner} | ${item.location}
                  </td>
                  <td>${item.account === 'Bank' ? 'Company Bank' : 'My Cash'}</td>
                  <td style="text-align:right;">${(item.totalAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right; color:#b45309;">${item.discountAmt ? `-${item.discountAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style="text-align:right; font-weight:bold; color:#1e3a8a;">${(item.netAmt || (item.totalAmt - (item.discountAmt || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right; font-weight:bold; color:#16a34a;">${(item.paidAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right; font-weight:bold; color:#dc2626;">${(item.dueAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right; padding:15px; font-weight:bold;">TOTALS:</td>
              <td style="text-align:right; padding:15px; font-weight:bold;">${data.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; padding:15px; font-weight:bold; color:#b45309;">${data.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; padding:15px; font-weight:bold; color:#1e3a8a;">${data.totalNetBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; padding:15px; font-weight:bold; color:#16a34a;">${data.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; padding:15px; font-weight:bold; color:#dc2626;">${data.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Popup window blocked! Please allow popups in your browser settings.', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CARE ELEVATOR CENTER - ${printTitle}</title>
        <style>
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            padding: 30px; 
            color: #0f172a; 
            line-height: 1.4;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
            margin-bottom: 25px; 
          }
          th, td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
            text-align: left;
          }
          th { 
            background-color: #f8fafc; 
            font-weight: 800; 
            border-bottom: 2px solid #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 10px;
          }
          @media print {
            body { padding: 10px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 22px; font-weight: 900; letter-spacing: 1px; margin: 0 0 4px 0; color:#1e3a8a;">CARE ELEVATOR CENTER</h2>
          <p style="font-size: 10px; color:#64748b; margin: 0; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">High Quality Elevator Engineering & Maintenance Services</p>
          <div style="height: 2px; background: linear-gradient(to right, #ffffff, #0f172a, #ffffff); margin: 12px 0 16px 0;"></div>
          
          <h3 style="font-size: 16px; font-weight: 900; margin: 4px 0 0 0; color: #0f172a; text-transform: uppercase;">${printTitle}</h3>
          <p style="font-size: 12px; color:#475569; margin: 4px 0 0 0; font-weight: 600;">
            Period: ${monthName} &nbsp;|&nbsp; 
            Account: ${accountFilter === 'All' ? 'All Accounts' : accountFilter === 'Cash' ? 'My Cash' : 'Company Bank'}
            ${selectedLift !== 'All' ? ` &nbsp;|&nbsp; Lift: <b>${selectedLift}</b>` : ''}
          </p>
        </div>

        ${bodyContent}

        <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569;">
          <div style="text-align: center;">
            <div style="width: 160px; border-bottom: 1.5px solid #64748b; margin-bottom: 6px;"></div>
            Prepared By (Accountant)
          </div>
          <div style="text-align: center;">
            <div style="width: 160px; border-bottom: 1.5px solid #64748b; margin-bottom: 6px;"></div>
            Manager Approval
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sleek Top Control Bar with Dropdown Menu (Requirement 4.1) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-slate-900 text-white rounded-xl">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                Reports & Statements
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select report type, target lift number, and payment account from the dropdown below.
            </p>
          </div>

          {/* Quick Print Button */}
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto bg-slate-900 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF Statement</span>
          </button>
        </div>

        {/* Dropdown Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. Report Category Dropdown (Grouped) */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Select Report *
            </label>
            <div className="relative">
              <select
                value={activeReport}
                onChange={(e) => setActiveReport(e.target.value as ReportCategory)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-xs outline-none focus:border-slate-800 focus:bg-white transition cursor-pointer appearance-none pr-10"
              >
                <optgroup label="🏢 Lift Specific Statements">
                  <option value="Lift_Statement">Lift Financial Statement (Profit & Loss)</option>
                </optgroup>
                <optgroup label="📉 Expense Reports">
                  <option value="Expense_All">Total Expenses Report (All)</option>
                  <option value="Expense_Overview">Expense Overview (by Category)</option>
                  <option value="Expense_Advances">Material Purchase Advances</option>
                  <option value="Expense_Bank">Company Bank Outflows</option>
                  <option value="Expense_Installation">Installation Expenses</option>
                  <option value="Expense_Lift_Maintenance">Lift Maintenance Expenses</option>
                  <option value="Expense_Car_Maintenance">Car Maintenance Expenses</option>
                  <option value="Expense_Office">Office & Staff House Expenses</option>
                  <option value="Expense_Owner_Payment">Owner Payments</option>
                </optgroup>
                <optgroup label="📈 Income Reports">
                  <option value="Income_All">Total Incomes Report (All)</option>
                  <option value="Income_Overview">Income Overview (Cash vs Bank & Dues)</option>
                  <option value="Income_Bank">Company Bank Inflows</option>
                  <option value="Income_Maintenance">Yearly Lift Maintenance</option>
                  <option value="Income_Installation">Installation Incomes</option>
                  <option value="Income_Repair">Lift Repair Incomes</option>
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Specific Lift & Owner Search Input */}
          <div className="flex flex-col relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                Lift / Owner Search
              </label>
              {isLiftSearchActive && (
                <button
                  type="button"
                  onClick={clearLiftSearch}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={selectedLift !== 'All' ? selectedLift : liftSearchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSelectedLift('All');
                  setLiftSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search Lift No or Owner name..."
                className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-xs outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {isLiftSearchActive && (
                <button
                  type="button"
                  onClick={clearLiftSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions / Auto-Complete Popover */}
            {showSuggestions && matchingLifts.length > 0 && (
              <div 
                className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100"
                onMouseLeave={() => setShowSuggestions(false)}
              >
                <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Lifts & Owners ({matchingLifts.length})</span>
                  <button 
                    type="button" 
                    onClick={() => setShowSuggestions(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
                {matchingLifts.map((lift) => (
                  <button
                    key={lift.liftNo}
                    type="button"
                    onClick={() => {
                      setSelectedLift(lift.liftNo);
                      setLiftSearchQuery(lift.liftNo);
                      setShowSuggestions(false);
                      // Auto switch to lift statement view if not already in it
                      if (!activeReport.startsWith('Expense') && !activeReport.startsWith('Income')) {
                        setActiveReport('Lift_Statement');
                      }
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 transition flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600">
                          Lift #{lift.liftNo}
                        </span>
                        {lift.owner && (
                          <span className="text-[11px] font-bold text-slate-600 truncate">
                            • {lift.owner}
                          </span>
                        )}
                      </div>
                      {lift.location && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          📍 {lift.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-emerald-600">
                        +{(lift.totalIncome || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-rose-500">
                        -{(lift.totalExpense || 0).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Account Filter Dropdown */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              Payment Channel
            </label>
            <div className="relative">
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value as 'All' | 'Cash' | 'Bank')}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-xs outline-none focus:border-slate-800 focus:bg-white transition cursor-pointer appearance-none pr-10"
              >
                <option value="All">All Payment Accounts</option>
                <option value="Cash">My Cash Only</option>
                <option value="Bank">Company Bank Account</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Month / Period Picker */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Time Period
              </label>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setTimeMode('monthly')}
                  className={`px-1.5 py-0.5 rounded ${timeMode === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode('all')}
                  className={`px-1.5 py-0.5 rounded ${timeMode === 'all' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
                >
                  All
                </button>
              </div>
            </div>
            {timeMode === 'monthly' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-xs outline-none focus:border-slate-800 focus:bg-white transition"
              />
            ) : (
              <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-600 text-xs text-center">
                All-Time Records Included
              </div>
            )}
          </div>
        </div>

        {/* Missing Invoices Highlighting Toolbar & Calculation Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHighlightMissingInvoices(!highlightMissingInvoices)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                highlightMissingInvoices
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${highlightMissingInvoices ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Highlight Missing Invoices</span>
              <span className={`w-2 h-2 rounded-full ${highlightMissingInvoices ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
            </button>

            {reportData.missingInvoicesCount > 0 ? (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span>⚠️</span> {reportData.missingInvoicesCount} record(s) with missing or invalid invoice
              </span>
            ) : (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All invoices present
              </span>
            )}
          </div>

          {/* Lift Search Calculation Filter: All, Income (আয়), Expense (ব্যয়) */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Calculation:
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSearchViewMode('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  searchViewMode === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (আয় ও ব্যয়)
              </button>
              <button
                type="button"
                onClick={() => setSearchViewMode('INCOME')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                  searchViewMode === 'INCOME'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <span>Income (আয়)</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchViewMode('EXPENSE')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                  searchViewMode === 'EXPENSE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                <span>Expense (ব্যয়)</span>
              </button>
            </div>

            {isLiftSearchActive && (
              <button
                type="button"
                onClick={clearLiftSearch}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold ml-2 underline cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Active Lift Banner (if searched or selected) */}
        {isLiftSearchActive && (
          <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {selectedLift !== 'All' ? `Lift #${selectedLift}` : `Filter: "${liftSearchQuery}"`}
                  </h4>
                  {activeLiftInfo?.owner && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <User className="w-3 h-3" /> {activeLiftInfo.owner}
                    </span>
                  )}
                </div>
                {activeLiftInfo?.location && (
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {activeLiftInfo.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold self-end sm:self-center">
              {searchViewMode !== 'EXPENSE' && (
                <div className="text-emerald-700 text-right">
                  <span className="text-[10px] uppercase text-emerald-600 block">আয় (Income)</span>
                  <span>{((reportData as any).totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                </div>
              )}
              {searchViewMode !== 'INCOME' && (
                <div className="text-rose-700 text-right">
                  <span className="text-[10px] uppercase text-rose-600 block">ব্যয় (Expense)</span>
                  <span>{((reportData as any).totalExpense || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                </div>
              )}
              {searchViewMode === 'ALL' && (
                <div className={`text-right ${(reportData as any).netProfit >= 0 ? 'text-blue-900' : 'text-amber-800'}`}>
                  <span className="text-[10px] uppercase text-slate-500 block">নেট হিসাব (Margin)</span>
                  <span>{((reportData as any).netProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Preview Console */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Preview Top Ribbon */}
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-blue-500/20">
                Live Console
              </span>
              {selectedLift !== 'All' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Lift: {selectedLift}
                </span>
              )}
            </div>
            <h4 className="font-black text-lg uppercase tracking-tight mt-1 text-white">
              {getReportTitle(activeReport)}
            </h4>
          </div>

          <button
            onClick={handlePrint}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition duration-150 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>

        {/* Render Live Report Table */}
        <div className="p-4 sm:p-6 bg-slate-50/50 overflow-x-auto">
          {/* LIFT STATEMENT VIEW */}
          {reportData.type === 'lift_statement' && (
            <div className="space-y-6">
              {/* Lift Statement Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                {searchViewMode !== 'EXPENSE' && (
                  <>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Invoiced</p>
                      <p className="text-md sm:text-lg font-black text-slate-800 flex items-center gap-0.5 mt-1">
                        <SaudiRiyalIcon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span>{(reportData as any).totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Income Collected</p>
                      <p className="text-md sm:text-lg font-black text-emerald-600 flex items-center gap-0.5 mt-1">
                        <SaudiRiyalIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{(reportData as any).totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </>
                )}
                {searchViewMode === 'INCOME' && (
                  <>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Discount Granted</p>
                      <p className="text-md sm:text-lg font-black text-amber-700 flex items-center gap-0.5 mt-1">
                        <SaudiRiyalIcon className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{(reportData as any).totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <p className="text-[10px] font-bold text-rose-600 uppercase">Outstanding Due</p>
                      <p className="text-md sm:text-lg font-black text-rose-600 flex items-center gap-0.5 mt-1">
                        <SaudiRiyalIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{(reportData as any).totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </>
                )}
                {searchViewMode !== 'INCOME' && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-500 uppercase">Total Lift Expenses</p>
                    <p className="text-md sm:text-lg font-black text-rose-600 flex items-center gap-0.5 mt-1">
                      <SaudiRiyalIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{(reportData as any).totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                )}
                {searchViewMode === 'EXPENSE' && (
                  <>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-700 uppercase">Bank Outflow</p>
                      <p className="text-md sm:text-lg font-black text-blue-900 flex items-center gap-0.5 mt-1">
                        <SaudiRiyalIcon className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                        <span>{((reportData as any).rawLiftExpenses || []).filter((e: any) => e.account === 'Bank').reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Cash Outflow</p>
                      <p className="text-md sm:text-lg font-black text-emerald-800 flex items-center gap-0.5 mt-1">
                        <SaudiRiyalIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{((reportData as any).rawLiftExpenses || []).filter((e: any) => e.account !== 'Bank').reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </>
                )}
                {searchViewMode === 'ALL' && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Net Lift Margin</p>
                    <p className="text-md sm:text-lg font-black text-blue-900 flex items-center gap-0.5 mt-1">
                      <SaudiRiyalIcon className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                      <span>{(reportData as any).netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Lift Incomes Section - shown when not in EXPENSE only mode */}
              {searchViewMode !== 'EXPENSE' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 p-3.5 font-bold text-xs uppercase text-slate-700 border-b border-slate-200 flex items-center justify-between">
                    <span>Lift Incomes ({((reportData as any).rawLiftIncomes || (reportData as any).liftIncomes).length} records)</span>
                    <span className="text-emerald-600 font-extrabold">Paid: {(reportData as any).totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Source</th>
                        <th className="px-3 py-2.5 min-w-[130px]">Lift & Owner</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">Gross</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">Discount</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">Net Bill</th>
                        <th className="px-3 py-2.5 text-right text-emerald-600 whitespace-nowrap">Paid</th>
                        <th className="px-3 py-2.5 text-right text-rose-600 whitespace-nowrap">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((reportData as any).rawLiftIncomes || (reportData as any).liftIncomes).map((i: any, idx: number) => {
                        const missing = isMissingInvoice(i.liftNo);
                        return (
                          <tr
                            key={i.id ? `rep-inc-${i.id}` : `rep-inc-${i.rowId}-${idx}`}
                            className={highlightMissingInvoices && missing ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'}
                          >
                            <td className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{i.date}</td>
                            <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">{i.source}</td>
                            <td className="px-3 py-2 min-w-[130px]">
                              <span className="font-bold">Lift: {i.liftNo || 'N/A'}</span>
                              {missing && <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">⚠️ Check</span>}
                              <span className="block text-[10px] text-slate-400 break-words">{i.owner} | {i.location}</span>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{i.totalAmt?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right text-amber-700 whitespace-nowrap">{i.discountAmt ? `-${i.discountAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-900 whitespace-nowrap">{(i.netAmt || (i.totalAmt - (i.discountAmt || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-black text-emerald-600 whitespace-nowrap">{i.paidAmt?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right font-black text-rose-600 whitespace-nowrap">{i.dueAmt?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Lift Expenses Section - shown when not in INCOME only mode */}
              {searchViewMode !== 'INCOME' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 p-3.5 font-bold text-xs uppercase text-slate-700 border-b border-slate-200 flex items-center justify-between">
                    <span>Lift Expenses ({((reportData as any).rawLiftExpenses || (reportData as any).liftExpenses).length} records)</span>
                    <span className="text-rose-600 font-extrabold">Total Outflow: {(reportData as any).totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Invoice No</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Category</th>
                        <th className="px-3 py-2.5 min-w-[140px]">Details & Notes</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Account</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((reportData as any).rawLiftExpenses || (reportData as any).liftExpenses).map((e: any, idx: number) => {
                        const missing = isMissingInvoice(e.invoice);
                        return (
                          <tr
                            key={e.id ? `rep-exp-${e.id}` : `rep-exp-${e.rowId}-${idx}`}
                            className={highlightMissingInvoices && missing ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'}
                          >
                            <td className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{e.date}</td>
                            <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">
                              {missing ? (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px]">
                                  ⚠️ Missing Invoice
                                </span>
                              ) : (
                                e.invoice
                              )}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">
                              {e.category} {e.subCategory ? `(${e.subCategory})` : ''}
                            </td>
                            <td className="px-3 py-2 text-slate-600 min-w-[140px] break-words">{e.description || '-'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                                e.account === 'Bank' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {e.account === 'Bank' ? 'Company Bank' : 'My Cash'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-black text-rose-600 whitespace-nowrap">
                              {e.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* EXPENSE OVERVIEW VIEW */}
          {reportData.type === 'expense_overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <div className="p-3 border-r border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Expenses</p>
                  <p className="text-lg font-black text-rose-600 mt-1">
                    {(reportData as any).grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                  </p>
                </div>
                <div className="p-3 border-r border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">My Cash</p>
                  <p className="text-lg font-black text-slate-800 mt-1">
                    {(reportData as any).totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                  </p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Company Bank</p>
                  <p className="text-lg font-black text-blue-600 mt-1">
                    {(reportData as any).totalBank.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase">
                    <tr>
                      <th className="p-4">Expense Category</th>
                      <th className="p-4 text-right">Total Outflow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reportData as any).categories.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">{c.name}</td>
                        <td className="p-4 text-right font-black text-slate-900">
                          {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                    <tr>
                      <td className="p-4 text-right uppercase">Grand Total:</td>
                      <td className="p-4 text-right text-rose-600 text-sm">
                        {(reportData as any).grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* EXPENSE LIST VIEW */}
          {reportData.type === 'expense_list' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 whitespace-nowrap">Invoice No</th>
                    <th className="px-3 py-3 whitespace-nowrap">Category</th>
                    <th className="px-3 py-3 min-w-[150px]">Details & Notes</th>
                    <th className="px-3 py-3 whitespace-nowrap">Account</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData as any).list.map((item: any, idx: number) => {
                    const missing = isMissingInvoice(item.invoice);
                    return (
                      <tr
                        key={item.id ? `rep-exp-all-${item.id}` : `rep-exp-all-${item.rowId}-${idx}`}
                        className={highlightMissingInvoices && missing ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'}
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">{item.date}</td>
                        <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap">
                          {missing ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] inline-flex items-center gap-1 font-bold">
                              <span>⚠️</span> Missing
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px]">
                              {item.invoice}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {item.category} {item.subCategory ? `(${item.subCategory})` : ''}
                          {(item.isAdvance || item.category === 'Cash Advance') && (
                            <span className="ml-1 text-[8px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold border border-amber-200">
                              Advance: {item.advancePerson || 'Materials'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 min-w-[150px]">
                          {item.liftNo ? <span className="font-bold">Lift: {item.liftNo} | </span> : ''}
                          {item.owner ? <span>Owner: {item.owner} | </span> : ''}
                          <span className="italic break-words">{item.description || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                            item.account === 'Bank' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {item.account === 'Bank' ? 'Company Bank' : 'My Cash'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-rose-600 whitespace-nowrap">
                          {item.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right uppercase">Grand Total:</td>
                    <td className="px-3 py-3 text-right text-rose-600 text-sm whitespace-nowrap">
                      {(reportData as any).grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* INCOME LIST & OVERVIEW VIEW */}
          {(reportData.type === 'income_list' || reportData.type === 'income_overview') && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 whitespace-nowrap">Source</th>
                    <th className="px-3 py-3 min-w-[150px]">Client & Lift Info</th>
                    <th className="px-3 py-3 whitespace-nowrap">Account</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Gross Bill</th>
                    <th className="px-3 py-3 text-right text-amber-300 whitespace-nowrap">Discount</th>
                    <th className="px-3 py-3 text-right text-blue-300 whitespace-nowrap">Net Bill</th>
                    <th className="px-3 py-3 text-right text-emerald-300 whitespace-nowrap">Paid</th>
                    <th className="px-3 py-3 text-right text-rose-300 whitespace-nowrap">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData as any).list.map((item: any, idx: number) => {
                    const missing = isMissingInvoice(item.liftNo);
                    return (
                      <tr
                        key={item.id ? `rep-inc-all-${item.id}` : `rep-inc-all-${item.rowId}-${idx}`}
                        className={highlightMissingInvoices && missing ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'}
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">{item.date}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">{item.source}</td>
                        <td className="px-3 py-2.5 min-w-[150px]">
                          <span className="font-bold">Lift: {item.liftNo || 'N/A'}</span>
                          {missing && (
                            <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                              ⚠️ Check
                            </span>
                          )}
                          <span className="block text-[10px] text-slate-400 break-words">{item.owner} | {item.location}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                            item.account === 'Bank' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {item.account === 'Bank' ? 'Company Bank' : 'My Cash'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{item.totalAmt?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 text-right text-amber-700 whitespace-nowrap">{item.discountAmt ? `-${item.discountAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-900 whitespace-nowrap">{(item.netAmt || (item.totalAmt - (item.discountAmt || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 text-right font-black text-emerald-600 whitespace-nowrap">{item.paidAmt?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 text-right font-black text-rose-600 whitespace-nowrap">{item.dueAmt?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-right uppercase">Grand Totals:</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{(reportData as any).totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-right text-amber-700 whitespace-nowrap">{(reportData as any).totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-right text-blue-900 whitespace-nowrap">{(reportData as any).totalNetBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-right text-emerald-600 whitespace-nowrap">{(reportData as any).totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-right text-rose-600 whitespace-nowrap">{(reportData as any).totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
