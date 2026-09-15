/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Layers, 
  Briefcase, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Percent,
  Calculator,
  Calendar,
  AlertTriangle,
  Wallet,
  BarChart,
  LineChart,
  Landmark
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell,
  BarChart as RechartsBarChart
} from 'recharts';
import { Expense, Income } from '../types';
import { SaudiRiyalIcon } from './SaudiRiyalIcon';

interface DashboardProps {
  expenses: Expense[];
  incomes: Income[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isLoading: boolean;
  onClickDueCard?: () => void;
}

export default function Dashboard({ 
  expenses, 
  incomes, 
  selectedMonth, 
  setSelectedMonth,
  isLoading,
  onClickDueCard
}: DashboardProps) {
  const [filterType, setFilterType] = useState<'monthly' | 'all'>('monthly');
  const [chartView, setChartView] = useState<'weekly' | 'daily' | 'totals'>('weekly');

  // Auto-align selected month to latest available records if current selection is empty and no custom month is saved
  useEffect(() => {
    if (expenses.length > 0 || incomes.length > 0) {
      const hasMonthData = expenses.some(e => e.date && e.date.startsWith(selectedMonth)) || 
                           incomes.some(i => i.date && i.date.startsWith(selectedMonth));
      const explicitlySelected = localStorage.getItem('careElevatorSelectedMonth');
      if (!hasMonthData && !explicitlySelected) {
        const allDates = [...expenses.map(e => e.date), ...incomes.map(i => i.date)]
          .filter(d => d && d.length >= 7)
          .sort()
          .reverse();
        if (allDates.length > 0) {
          const latestMonth = allDates[0].slice(0, 7);
          setSelectedMonth(latestMonth);
        }
      }
    }
  }, [expenses, incomes, selectedMonth, setSelectedMonth]);

  // Filter lists based on mode
  const filteredExpenses = filterType === 'monthly'
    ? expenses.filter(e => e.date.startsWith(selectedMonth))
    : expenses;

  const filteredIncomes = filterType === 'monthly'
    ? incomes.filter(i => i.date.startsWith(selectedMonth))
    : incomes;

  // Prepare chart data
  const getWeeklyData = () => {
    const weeks = [
      { name: 'Week 1 (1-7)', start: 1, end: 7, Income: 0, Paid: 0, Expense: 0 },
      { name: 'Week 2 (8-14)', start: 8, end: 14, Income: 0, Paid: 0, Expense: 0 },
      { name: 'Week 3 (15-21)', start: 15, end: 21, Income: 0, Paid: 0, Expense: 0 },
      { name: 'Week 4 (22-28)', start: 22, end: 28, Income: 0, Paid: 0, Expense: 0 },
      { name: 'Week 5 (29+)', start: 29, end: 31, Income: 0, Paid: 0, Expense: 0 },
    ];

    filteredExpenses.forEach(e => {
      const day = parseInt(e.date.split('-')[2]) || 1;
      const week = weeks.find(w => day >= w.start && day <= w.end) || weeks[4];
      week.Expense += e.amount;
    });

    filteredIncomes.forEach(i => {
      const day = parseInt(i.date.split('-')[2]) || 1;
      const week = weeks.find(w => day >= w.start && day <= w.end) || weeks[4];
      week.Income += i.totalAmt;
      week.Paid += i.paidAmt;
    });

    return weeks;
  };

  const getDailyData = () => {
    const yearStr = selectedMonth.split('-')[0];
    const monthStr = selectedMonth.split('-')[1];
    const daysCount = new Date(parseInt(yearStr) || 2026, parseInt(monthStr) || 7, 0).getDate();

    return Array.from({ length: daysCount }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
      
      const exp = filteredExpenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0);
      const inc = filteredIncomes.filter(i => i.date === dateStr).reduce((sum, i) => sum + i.totalAmt, 0);
      const paid = filteredIncomes.filter(i => i.date === dateStr).reduce((sum, i) => sum + i.paidAmt, 0);

      return {
        name: `${dayNum}`,
        Income: inc,
        Paid: paid,
        Expense: exp,
      };
    });
  };

  const getTotalsComparisonData = () => {
    return [
      { name: 'Invoiced Income', Amount: totalIncomeAll, color: '#3b82f6' },
      { name: 'Received (Paid)', Amount: totalPaidAll, color: '#10b981' },
      { name: 'Total Expense', Amount: totalExpenseAll, color: '#f43f5e' },
    ];
  };

  const getAllTimeMonthlyData = () => {
    const monthlyGroups: Record<string, { name: string; Income: number; Paid: number; Expense: number }> = {};

    expenses.forEach(e => {
      const m = e.date.slice(0, 7); // "YYYY-MM"
      if (!monthlyGroups[m]) {
        monthlyGroups[m] = { name: m, Income: 0, Paid: 0, Expense: 0 };
      }
      monthlyGroups[m].Expense += e.amount;
    });

    incomes.forEach(i => {
      const m = i.date.slice(0, 7); // "YYYY-MM"
      if (!monthlyGroups[m]) {
        monthlyGroups[m] = { name: m, Income: 0, Paid: 0, Expense: 0 };
      }
      monthlyGroups[m].Income += i.totalAmt;
      monthlyGroups[m].Paid += i.paidAmt;
    });

    return Object.values(monthlyGroups).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Calculate totals (Cash-only)
  const totalExpense = filteredExpenses.filter(e => e.account !== 'Bank').reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = filteredIncomes.filter(i => i.account !== 'Bank').reduce((sum, i) => sum + i.totalAmt, 0);
  const totalPaid = filteredIncomes.filter(i => i.account !== 'Bank').reduce((sum, i) => sum + i.paidAmt, 0);
  const totalDue = filteredIncomes.filter(i => i.account !== 'Bank').reduce((sum, i) => sum + i.dueAmt, 0);
  const netBalance = totalPaid - totalExpense; // Cash in hand
  const netInvoiceProfit = totalIncome - totalExpense; // Total invoiced book profit

  // All Accounts totals (for Net Cash Flow & Invoiced Net Profit widgets and comparison data)
  const totalExpenseAll = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomeAll = filteredIncomes.reduce((sum, i) => sum + i.totalAmt, 0);
  const totalPaidAll = filteredIncomes.reduce((sum, i) => sum + i.paidAmt, 0);
  const totalDueAll = filteredIncomes.reduce((sum, i) => sum + i.dueAmt, 0);
  const netBalanceAll = totalPaidAll - totalExpenseAll; // All accounts cash flow
  const netInvoiceProfitAll = totalIncomeAll - totalExpenseAll; // All accounts book profit

  // Bank calculations (Bank-only)
  const totalBankIncome = filteredIncomes.filter(i => i.account === 'Bank').reduce((sum, i) => sum + i.paidAmt, 0);
  const totalBankExpense = filteredExpenses.filter(e => e.account === 'Bank').reduce((sum, e) => sum + e.amount, 0);
  const bankBalance = totalBankIncome - totalBankExpense;

  // Specific requested Income Categories totals (Cash-only)
  const installationIncomeVal = filteredIncomes
    .filter(i => i.source === 'Installation' && i.account !== 'Bank')
    .reduce((sum, i) => sum + i.paidAmt, 0);

  const liftRepairIncomeVal = filteredIncomes
    .filter(i => i.source === 'Lift Repair' && i.account !== 'Bank')
    .reduce((sum, i) => sum + i.paidAmt, 0);

  const yearlyMaintenanceIncomeVal = filteredIncomes
    .filter(i => i.source === 'Yearly Lift Maintenance' && i.account !== 'Bank')
    .reduce((sum, i) => sum + i.paidAmt, 0);

  const totalSelectedIncome = installationIncomeVal + liftRepairIncomeVal + yearlyMaintenanceIncomeVal;

  // Specific requested Expense Categories totals (Cash-only)
  const installationExpenseVal = filteredExpenses
    .filter(e => e.category === 'Installation' && e.account !== 'Bank')
    .reduce((sum, e) => sum + e.amount, 0);

  const liftMaintenanceExpenseVal = filteredExpenses
    .filter(e => e.category === 'Maintenance' && e.subCategory === 'Lift Maintenance' && e.account !== 'Bank')
    .reduce((sum, e) => sum + e.amount, 0);

  const carMaintenanceExpenseVal = filteredExpenses
    .filter(e => e.category === 'Maintenance' && e.subCategory === 'Car Maintenance' && e.account !== 'Bank')
    .reduce((sum, e) => sum + e.amount, 0);

  const officeStaffExpenseVal = filteredExpenses
    .filter(e => e.category === 'Maintenance' && e.subCategory === 'Office & Staff House' && e.account !== 'Bank')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSelectedExpense = installationExpenseVal + liftMaintenanceExpenseVal + carMaintenanceExpenseVal + officeStaffExpenseVal;

  // Category distribution for expenses (Cash-only)
  const expenseCategories = filteredExpenses.filter(e => e.account !== 'Bank').reduce((acc, e) => {
    const key = e.category === 'Maintenance' && e.subCategory ? e.subCategory : e.category;
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  // Income distribution by source (Cash-only)
  const incomeSources = filteredIncomes.filter(i => i.account !== 'Bank').reduce((acc, i) => {
    acc[i.source] = (acc[i.source] || 0) + i.paidAmt;
    return acc;
  }, {} as Record<string, number>);

  // Recent logs
  const combinedRecentLogs = [
    ...filteredExpenses.map((e, idx) => ({
      id: e.id ? `exp-${e.id}` : `exp-${e.rowId || idx}-${idx}`,
      type: 'expense' as const,
      date: e.date,
      title: e.category === 'Maintenance' && e.subCategory ? `${e.category} - ${e.subCategory}` : e.category,
      subtitle: e.liftNo ? `Lift No: ${e.liftNo} (${e.owner || ''})` : e.description || 'Expense',
      amount: e.amount,
      badgeColor: 'bg-rose-50 text-rose-600 border-rose-100',
    })),
    ...filteredIncomes.map((i, idx) => ({
      id: i.id ? `inc-${i.id}` : `inc-${i.rowId || idx}-${idx}`,
      type: 'income' as const,
      date: i.date,
      title: i.source,
      subtitle: `Lift No: ${i.liftNo} (${i.owner})`,
      amount: i.paidAmt,
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    }))
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Upper Panel: Greetings, Filter, Timezone Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
            Welcome! Dashboard Overview
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Accounts Monitoring Portal of Care Elevator Limited.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setFilterType('monthly')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition ${
                filterType === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All-Time
            </button>
          </div>

          {filterType === 'monthly' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-700 font-bold text-sm w-36"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border rounded-3xl gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500 animate-pulse">Loading database, please wait...</p>
        </div>
      ) : (
        <>
          {/* Dashboard Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Total Invoiced Income */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Briefcase className="w-24 h-24 text-slate-900" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Total Income
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200/50">
                    <Calculator className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-slate-800 mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-slate-800 shrink-0" />
                <span>{totalIncomeAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2 font-medium">
                <span>Total invoices sent to clients</span>
              </div>
            </motion.div>

            {/* Received Cash (formerly Total Paid) */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-emerald-50/50 to-white p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24 text-emerald-600" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Received Cash
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-100">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-emerald-600 mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-emerald-600 shrink-0" />
                <span>{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-2 font-medium">
                <span>Total collected cash or payments</span>
              </div>
            </motion.div>

            {/* Cash on Hand (Liquid Cash) */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-3xl border border-emerald-500 shadow-md relative overflow-hidden"
            >
              <div className="absolute bottom-0 right-0 p-4 opacity-10">
                <Wallet className="w-24 h-24 text-white" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-extrabold text-emerald-100 uppercase tracking-widest">
                  Cash on Hand
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-white/20 text-white border border-white/10">
                    <Wallet className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-white mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-white shrink-0" />
                <span>{netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-100 mt-2 font-medium">
                <span>Paid amount minus expenses</span>
              </div>
            </motion.div>

            {/* Total Due (Receivable Cash) */}
            <motion.div
              whileHover={{ y: -4 }}
              onClick={onClickDueCard}
              className="bg-gradient-to-br from-amber-50/50 to-white p-6 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group"
              title="Click to view all due payments"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-24 h-24 text-amber-500" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                  Total Due
                  <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full lowercase font-normal opacity-0 group-hover:opacity-100 transition-opacity">click to view</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Percent className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-amber-600 mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-amber-600 shrink-0" />
                <span>{totalDueAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-2 font-medium">
                <span>Outstanding balance due from customers</span>
              </div>
            </motion.div>

            {/* Total Expense */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-rose-50/50 to-white p-6 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingDown className="w-24 h-24 text-rose-500" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  Total Expense
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-100">
                    <ArrowDownRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-rose-600 mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-rose-600 shrink-0" />
                <span>{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-rose-600 mt-2 font-medium">
                <span>Office, lift & vehicle maintenance cost</span>
              </div>
            </motion.div>

            {/* Bank Account Balance */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Landmark className="w-24 h-24 text-blue-900" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  Bank Balance
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Landmark className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-blue-600 mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-blue-600 shrink-0" />
                <span>{bankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-blue-500 mt-2 font-medium">
                <span>Current funds in company bank</span>
              </div>
            </motion.div>

            {/* Bank Expenses */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingDown className="w-24 h-24 text-rose-900" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  Bank Expenses
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                    <TrendingDown className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-rose-600 mt-4 flex items-center gap-1">
                <SaudiRiyalIcon className="w-6 h-6 lg:w-7 lg:h-7 text-rose-600 shrink-0" />
                <span>{totalBankExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-rose-500 mt-2 font-medium">
                <span>Expenses paid from company bank</span>
              </div>
            </motion.div>

          </div>

          {/* Recharts Analytics Visualization Component */}
          <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                  <LineChart className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Cash Flow & Accounts Analytics</h3>
                  <p className="text-xs text-slate-500">Visual comparison of total invoices, collected cash, and operational expenses.</p>
                </div>
              </div>

              {/* Chart View Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                {filterType === 'monthly' ? (
                  <>
                    <button
                      onClick={() => setChartView('daily')}
                      type="button"
                      className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-200 cursor-pointer ${
                        chartView === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setChartView('weekly')}
                      type="button"
                      className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-200 cursor-pointer ${
                        chartView === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setChartView('totals')}
                      type="button"
                      className={`px-3 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-200 cursor-pointer ${
                        chartView === 'totals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Totals
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1.5 text-[10px] font-extrabold text-slate-600 uppercase">
                    All-Time Monthly Trend
                  </span>
                )}
              </div>
            </div>

            {/* Responsive Container for Recharts */}
            <div className="h-[320px] w-full" id="dashboardRechartsContainer">
              <ResponsiveContainer width="100%" height="100%">
                {filterType === 'all' ? (
                  <ComposedChart data={getAllTimeMonthlyData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-xl text-xs space-y-1.5 font-sans">
                              <p className="font-extrabold text-slate-300">Month: {label}</p>
                              <div className="space-y-1 font-bold">
                                {payload.map((p: any) => (
                                  <p key={p.name} style={{ color: p.color }} className="flex items-center gap-4 justify-between">
                                    <span>{p.name}:</span>
                                    <span>{p.value.toLocaleString('en-US')} SAR</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Bar dataKey="Income" name="Invoiced Income" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Paid" name="Received Paid" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Area type="monotone" dataKey="Expense" name="Total Expense" fill="rgba(244, 63, 94, 0.08)" stroke="#f43f5e" strokeWidth={2.5} />
                  </ComposedChart>
                ) : chartView === 'totals' ? (
                  <RechartsBarChart data={getTotalsComparisonData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0];
                          return (
                            <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-xl text-xs font-sans">
                              <p className="font-extrabold text-slate-300">{label}</p>
                              <p style={{ color: p.payload?.color }} className="font-bold mt-1 text-sm">
                                {p.value?.toLocaleString('en-US')} SAR
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Amount" radius={[8, 8, 0, 0]} barSize={50}>
                      {getTotalsComparisonData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                ) : chartView === 'weekly' ? (
                  <ComposedChart data={getWeeklyData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-xl text-xs space-y-1.5 font-sans">
                              <p className="font-extrabold text-slate-300">{label}</p>
                              <div className="space-y-1 font-bold">
                                {payload.map((p: any) => (
                                  <p key={p.name} style={{ color: p.color }} className="flex items-center gap-4 justify-between">
                                    <span>{p.name}:</span>
                                    <span>{p.value.toLocaleString('en-US')} SAR</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Bar dataKey="Income" name="Invoiced Income" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Paid" name="Received Paid" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                    <Area type="monotone" dataKey="Expense" name="Total Expense" fill="rgba(244, 63, 94, 0.08)" stroke="#f43f5e" strokeWidth={2.5} />
                  </ComposedChart>
                ) : (
                  <ComposedChart data={getDailyData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" label={{ value: 'Day of Month', position: 'insideBottomRight', offset: -10, fill: '#64748b', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-xl text-xs space-y-1.5 font-sans">
                              <p className="font-extrabold text-slate-300">Day {label} ({selectedMonth})</p>
                              <div className="space-y-1 font-bold">
                                {payload.map((p: any) => (
                                  <p key={p.name} style={{ color: p.color }} className="flex items-center gap-4 justify-between">
                                    <span>{p.name}:</span>
                                    <span>{p.value.toLocaleString('en-US')} SAR</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="Income" name="Invoiced Income" fill="rgba(59, 130, 246, 0.03)" stroke="#3b82f6" strokeWidth={2} />
                    <Area type="monotone" dataKey="Paid" name="Received Paid" fill="rgba(16, 185, 129, 0.03)" stroke="#10b981" strokeWidth={2} />
                    <Area type="monotone" dataKey="Expense" name="Total Expense" fill="rgba(244, 63, 94, 0.03)" stroke="#f43f5e" strokeWidth={2} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit & Net Balance Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Real Balance Widget */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-500/10">
                  CASH-IN-HAND MARGIN (ALL ACCOUNTS)
                </span>
                <h3 className="text-slate-400 text-sm font-semibold mt-3">Net Cash Flow</h3>
                <p className="text-[11px] text-slate-500">Calculation: Total collected payments (Paid) - Total expenses (Expense) [All Accounts]</p>
              </div>
              <div className="mt-8">
                <p className={`text-3xl lg:text-4xl font-black flex items-center gap-1 ${netBalanceAll >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <SaudiRiyalIcon className={`w-8 h-8 shrink-0 ${netBalanceAll >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span>{netBalanceAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {netBalanceAll >= 0 ? '👍 Cash flow is positive' : '⚠️ Cash flow is in deficit'}
                </p>
              </div>
            </div>

            {/* Invoiced Profit Widget */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="px-3 py-1 bg-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-sky-500/10">
                  BOOK MARGIN (BILLING - ALL ACCOUNTS)
                </span>
                <h3 className="text-slate-400 text-sm font-semibold mt-3">Invoiced Net Profit</h3>
                <p className="text-[11px] text-slate-500">Calculation: Total Invoiced Income - Total Expenses [All Accounts]</p>
              </div>
              <div className="mt-8">
                <p className={`text-3xl lg:text-4xl font-black flex items-center gap-1 ${netInvoiceProfitAll >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  <SaudiRiyalIcon className={`w-8 h-8 shrink-0 ${netInvoiceProfitAll >= 0 ? 'text-blue-400' : 'text-rose-400'}`} />
                  <span>{netInvoiceProfitAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {netInvoiceProfitAll >= 0 ? '🎉 Healthy book profit achieved' : '⚠️ Operating at a loss or deficit'}
                </p>
              </div>
            </div>

          </div>

          {/* Graphics, Distribution, and Activity Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Visual breakdown of Expense */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Expense Category Share
                </h4>
                
                <div className="space-y-4 my-2">
                  {[
                    { label: 'Installation Expense', value: installationExpenseVal },
                    { label: 'Lift Maintenance', value: liftMaintenanceExpenseVal },
                    { label: 'Car Maintenance', value: carMaintenanceExpenseVal },
                    { label: 'Office & Staff House', value: officeStaffExpenseVal }
                  ].map((item) => {
                    const percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span className="truncate max-w-[180px]">{item.label}</span>
                          <span className="flex items-center gap-0.5">
                            <SaudiRiyalIcon className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
                Analysis of requested expenses by category.
              </div>
            </div>

            {/* Income Distribution by Source */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Income Revenue Share
                </h4>

                <div className="space-y-4 my-2">
                  {[
                    { label: 'Installation Income', value: installationIncomeVal },
                    { label: 'Lift Repair Income', value: liftRepairIncomeVal },
                    { label: 'Yearly Maintenance Income', value: yearlyMaintenanceIncomeVal }
                  ].map((item) => {
                    const percentage = totalPaid > 0 ? (item.value / totalPaid) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span className="truncate max-w-[180px]">{item.label}</span>
                          <span className="flex items-center gap-0.5">
                            <SaudiRiyalIcon className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
                Percentage distribution of received payments by source.
              </div>
            </div>

            {/* Recent Transaction Activity */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Recent 5 Activities
                </h4>

                {combinedRecentLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center">No recent transaction activities found.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {combinedRecentLogs.map((log, lIdx) => (
                      <div key={`${log.id}-${lIdx}`} className="py-3 flex items-start justify-between gap-3 text-xs">
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-800 truncate" title={log.title}>
                            {log.title}
                          </p>
                          <p className="text-slate-400 truncate mt-0.5" title={log.subtitle}>
                            {log.subtitle}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-black flex items-center justify-end gap-0.5 ${log.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            <span>{log.type === 'expense' ? '-' : '+'}</span>
                            <SaudiRiyalIcon className="w-3 h-3 shrink-0" />
                            <span>{log.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{log.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
                Real-time tracking of recent transactions.
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
