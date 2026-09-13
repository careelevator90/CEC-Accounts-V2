/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  ArrowUpDown, 
  X, 
  Lock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Tag,
  Receipt,
  ChevronUp,
  ChevronDown,
  Download
} from 'lucide-react';
import { Income, isMissingInvoice } from '../types';
import { SaudiRiyalIcon } from './SaudiRiyalIcon';
import { exportIncomesToCsv } from '../lib/exportCsv';

interface IncomeTabProps {
  incomes: Income[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onSave: (payload: any) => Promise<boolean>;
  onDelete: (id: any) => Promise<boolean>;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
  filterDueOnly?: boolean;
  setFilterDueOnly?: (val: boolean) => void;
  timeFilter?: 'monthly' | 'all';
  setTimeFilter?: (val: 'monthly' | 'all') => void;
  userRole?: 'Read Only' | 'Full Access';
}

export default function IncomeTab({
  incomes,
  selectedMonth,
  setSelectedMonth,
  onSave,
  onDelete,
  addToast,
  filterDueOnly,
  setFilterDueOnly,
  timeFilter,
  setTimeFilter,
  userRole = 'Full Access'
}: IncomeTabProps) {
  // Local fallback for Due Only filter in case it isn't managed globally
  const [localFilterDueOnly, setLocalFilterDueOnly] = useState(false);
  const isDueFiltered = filterDueOnly !== undefined ? filterDueOnly : localFilterDueOnly;
  const toggleDueFilter = () => {
    if (setFilterDueOnly !== undefined) {
      setFilterDueOnly(!filterDueOnly);
    } else {
      setLocalFilterDueOnly(!localFilterDueOnly);
    }
  };

  // Local fallback for Time Filter
  const [localTimeFilter, setLocalTimeFilter] = useState<'monthly' | 'all'>('monthly');
  const activeTimeFilter = timeFilter !== undefined ? timeFilter : localTimeFilter;
  const changeTimeFilter = (val: 'monthly' | 'all') => {
    if (setTimeFilter !== undefined) {
      setTimeFilter(val);
    } else {
      setLocalTimeFilter(val);
    }
  };

  // Account Filter (Requirement 1: My Cash vs Company Bank)
  const [accountFilter, setAccountFilter] = useState<'All' | 'Cash' | 'Bank'>('All');

  // Form States
  const [editId, setEditId] = useState<number | null>(null);
  const [editDocId, setEditDocId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState('Yearly Lift Maintenance');
  const [liftNo, setLiftNo] = useState('');
  const [owner, setOwner] = useState('');
  const [location, setLocation] = useState('');
  const [totalAmt, setTotalAmt] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [paidAmt, setPaidAmt] = useState('');
  const [description, setDescription] = useState('');
  const [account, setAccount] = useState<'Cash' | 'Bank'>('Cash');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Dynamic calculations for form (Requirement 3: Discount -> Net Bill -> Paid -> Due)
  const rawTotal = parseFloat(totalAmt) || 0;
  const rawDiscount = parseFloat(discountAmt) || 0;
  const computedNet = Math.max(0, rawTotal - rawDiscount);
  const rawPaid = parseFloat(paidAmt) || 0;
  const computedDue = Math.max(0, computedNet - rawPaid);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'date' | 'due' | 'paid'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Security Modal States
  const [securityModal, setSecurityModal] = useState<{
    open: boolean;
    type: 'edit' | 'delete';
    targetId: number | string;
    passwordValue: string;
  }>({ open: false, type: 'delete', targetId: 0, passwordValue: '' });

  // Reset Form
  const resetForm = () => {
    setEditId(null);
    setEditDocId(undefined);
    setDate(new Date().toISOString().slice(0, 10));
    setSource('Yearly Lift Maintenance');
    setLiftNo('');
    setOwner('');
    setLocation('');
    setTotalAmt('');
    setDiscountAmt('');
    setPaidAmt('');
    setDescription('');
    setAccount('Cash');
    setFormOpen(false);
  };

  // Submit Income Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Read Only') {
      addToast('Action denied! You have Read Only permission.', 'error');
      return;
    }
    if (!source || !liftNo || !owner || !location || !totalAmt || !date) {
      addToast('Please fill out all required (*) fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const total = parseFloat(totalAmt) || 0;
      const discount = parseFloat(discountAmt) || 0;
      const net = Math.max(0, total - discount);
      const paid = parseFloat(paidAmt) || 0;
      const due = Math.max(0, net - paid);

      const payload = {
        action: editId || editDocId ? 'editIncome' : 'addIncome',
        id: editDocId,
        rowId: editId || Date.now(),
        date,
        source,
        liftNo,
        owner,
        location,
        totalAmt: total,
        discountAmt: discount,
        netAmt: net,
        paidAmt: paid,
        dueAmt: due,
        description,
        account
      };

      const success = await onSave(payload);
      if (success) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Income submit error:', err);
      addToast(err?.message || 'Failed to save income', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Security Dialog
  const handleActionSecurely = (type: 'edit' | 'delete', id: number | string) => {
    if (userRole === 'Read Only') {
      addToast('Action denied! You have Read Only permission.', 'error');
      return;
    }
    setSecurityModal({
      open: true,
      type,
      targetId: id,
      passwordValue: ''
    });
  };

  // Execute secured action upon password validation
  const executeSecuredAction = async () => {
    if (securityModal.passwordValue !== 'Bangladesh123') {
      addToast('Incorrect password! Action cancelled.', 'error');
      return;
    }

    const targetId = securityModal.targetId;
    const actionType = securityModal.type;
    
    setSecurityModal(prev => ({ ...prev, open: false }));

    if (actionType === 'delete') {
      const success = await onDelete(targetId);
      if (success) {
        addToast('Income record successfully deleted.', 'success');
      }
    } else {
      // Edit mode: populate form
      const item = incomes.find(x => x.rowId === targetId || x.id === targetId);
      if (item) {
        setEditId(item.rowId);
        setEditDocId(item.id);
        setDate(item.date ? item.date.split('T')[0] : '');
        setSource(item.source || 'Yearly Lift Maintenance');
        setLiftNo(item.liftNo || '');
        setOwner(item.owner || '');
        setLocation(item.location || '');
        setTotalAmt(item.totalAmt?.toString() || '');
        setDiscountAmt(item.discountAmt ? item.discountAmt.toString() : '');
        setPaidAmt(item.paidAmt?.toString() || '');
        setDescription(item.description || '');
        setAccount(item.account || 'Cash');
        setFormOpen(true);
        addToast('Record is ready for editing. Please check the form at the top of the screen.', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Filter & Sort core computational pipeline
  const filteredList = incomes.filter(item => {
    // Due Filter
    if (isDueFiltered && (!item.dueAmt || item.dueAmt <= 0)) {
      return false;
    }

    // Account Filter (Requirement 1: My Cash vs Company Bank)
    if (accountFilter === 'Cash' && item.account !== 'Cash') return false;
    if (accountFilter === 'Bank' && item.account !== 'Bank') return false;

    const q = searchQuery.trim().toLowerCase();

    // Search Query (multiple fields matching) - if active, searches all records (bypassing month filter)
    if (q) {
      const matchesSearch = (
        String(item.source || '').toLowerCase().includes(q) ||
        String(item.liftNo || '').toLowerCase().includes(q) ||
        String(item.owner || '').toLowerCase().includes(q) ||
        String(item.location || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
      if (sourceFilter !== 'All' && item.source !== sourceFilter) return false;
      return true;
    }

    // Month Filter
    if (activeTimeFilter === 'monthly') {
      if (!item.date || !item.date.startsWith(selectedMonth)) return false;
    }

    // Source Filter
    if (sourceFilter !== 'All' && item.source !== sourceFilter) return false;

    return true;
  });

  // Calculate dynamic totals
  const totalInvoiced = filteredList.reduce((sum, item) => sum + (item.totalAmt || 0), 0);
  const totalDiscount = filteredList.reduce((sum, item) => sum + (item.discountAmt || 0), 0);
  const totalNet = filteredList.reduce((sum, item) => sum + (item.netAmt !== undefined ? item.netAmt : ((item.totalAmt || 0) - (item.discountAmt || 0))), 0);
  const totalPaid = filteredList.reduce((sum, item) => sum + (item.paidAmt || 0), 0);
  const totalDue = filteredList.reduce((sum, item) => sum + (item.dueAmt || 0), 0);
  const totalCashCollected = filteredList
    .filter(i => i.account === 'Cash' || !i.account)
    .reduce((sum, item) => sum + (item.paidAmt || 0), 0);
  const totalBankCollected = filteredList
    .filter(i => i.account === 'Bank')
    .reduce((sum, item) => sum + (item.paidAmt || 0), 0);

  // Sorting
  const sortedList = [...filteredList].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = String(a.date || '').localeCompare(String(b.date || ''));
    } else if (sortField === 'due') {
      comparison = a.dueAmt - b.dueAmt;
    } else if (sortField === 'paid') {
      comparison = a.paidAmt - b.paidAmt;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'date' | 'due' | 'paid') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    if (sortedList.length === 0) {
      addToast('No income records found to export.', 'info');
      return;
    }
    const cleanMonth = activeTimeFilter === 'monthly' && selectedMonth ? selectedMonth.replace(/\s+/g, '_') : 'all_time';
    const filename = `care_elevator_incomes_${cleanMonth}_${new Date().toISOString().slice(0, 10)}.csv`;
    const success = exportIncomesToCsv(sortedList, filename);
    if (success) {
      addToast(`Successfully downloaded ${sortedList.length} income records as CSV!`, 'success');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top filter + summary widgets banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Monthly vs All-Time */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => changeTimeFilter('monthly')}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase rounded-xl transition ${
                  activeTimeFilter === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => changeTimeFilter('all')}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase rounded-xl transition ${
                  activeTimeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All-Time
              </button>
            </div>

            {/* Account Filter Toggle: All, My Cash, Company Bank (Requirement 1) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <Wallet className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <button
                type="button"
                onClick={() => setAccountFilter('All')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-xl transition ${
                  accountFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setAccountFilter('Cash')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-xl transition ${
                  accountFilter === 'Cash'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Cash
              </button>
              <button
                type="button"
                onClick={() => setAccountFilter('Bank')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-xl transition ${
                  accountFilter === 'Bank'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Company Bank
              </button>
            </div>

            {/* Due Only Toggle */}
            <button
              onClick={toggleDueFilter}
              className={`px-3.5 py-2 text-xs font-bold uppercase rounded-2xl border transition flex items-center gap-1.5 ${
                isDueFiltered
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Due Only</span>
            </button>

            {activeTimeFilter === 'monthly' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-700 font-bold text-sm w-36"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
            <button
              onClick={() => {
                if (editId) {
                  resetForm();
                } else {
                  setFormOpen(!formOpen);
                }
              }}
              className={`w-full xl:w-auto px-5 py-3.5 rounded-2xl font-bold text-sm uppercase flex items-center justify-center gap-2 transition ${
                editId 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : formOpen
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-lg shadow-slate-900/10'
              }`}
            >
              {editId ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Cancel Edit</span>
                </>
              ) : formOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Income</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards: Invoiced, Discounts, Net Bill, Paid & Due */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Invoiced</p>
            <p className="text-md sm:text-lg font-black text-slate-800 flex items-center gap-0.5 mt-1">
              <SaudiRiyalIcon className="w-4 h-4 text-slate-700 shrink-0" />
              <span>{totalInvoiced.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
          <div className="bg-amber-50/60 px-4 py-3 rounded-2xl border border-amber-200/80">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-600" />
              Discounts
            </p>
            <p className="text-md sm:text-lg font-black text-amber-800 flex items-center gap-0.5 mt-1">
              <SaudiRiyalIcon className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{totalDiscount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
          <div className="bg-blue-50/60 px-4 py-3 rounded-2xl border border-blue-200/80">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <Receipt className="w-3 h-3 text-blue-600" />
              Net Billed
            </p>
            <p className="text-md sm:text-lg font-black text-blue-900 flex items-center gap-0.5 mt-1">
              <SaudiRiyalIcon className="w-4 h-4 text-blue-800 shrink-0" />
              <span>{totalNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
          <div className="bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Collected</p>
            <p className="text-md sm:text-lg font-black text-emerald-600 flex items-center gap-0.5 mt-1">
              <SaudiRiyalIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
          <div className="col-span-2 md:col-span-1 bg-rose-50 px-4 py-3 rounded-2xl border border-rose-200">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Remaining Due</p>
            <p className="text-md sm:text-lg font-black text-rose-600 flex items-center gap-0.5 mt-1">
              <SaudiRiyalIcon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{totalDue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
        </div>

        {/* Breakdown Badges: Cash vs Bank Collection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 border border-slate-200/70 p-2.5 rounded-xl flex items-center justify-between">
            <span className="font-bold text-slate-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Collected in My Cash:
            </span>
            <span className="font-black text-slate-800 flex items-center gap-1">
              <SaudiRiyalIcon className="w-3.5 h-3.5 text-slate-700" />
              {totalCashCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 p-2.5 rounded-xl flex items-center justify-between">
            <span className="font-bold text-slate-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Collected in Company Bank:
            </span>
            <span className="font-black text-blue-700 flex items-center gap-1">
              <SaudiRiyalIcon className="w-3.5 h-3.5 text-blue-700" />
              {totalBankCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Income Panel */}
      <AnimatePresence>
        {(formOpen || editId !== null) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative">
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              <h3 className="text-lg lg:text-xl font-black text-emerald-600 mb-6 uppercase flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                {editId ? 'Update Income Details' : 'Add New Income'}
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Date */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Income Source Select */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Income Source *
                  </label>
                  <select
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-emerald-400 focus:bg-white transition"
                  >
                    <option value="Yearly Lift Maintenance">Yearly Lift Maintenance</option>
                    <option value="Installation">Installation</option>
                    <option value="Lift Repair">Lift Repair</option>
                  </select>
                </div>

                {/* Account Destination Select */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Account Destination *
                  </label>
                  <select
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value as 'Cash' | 'Bank')}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-emerald-400 focus:bg-white transition"
                  >
                    <option value="Cash">My Cash</option>
                    <option value="Bank">Company Bank Account</option>
                  </select>
                </div>

                {/* Lift Number */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Lift Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CE-L42"
                    value={liftNo}
                    onChange={(e) => setLiftNo(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Owner Name */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Kamal Uddin"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Location */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gulshan-1, Dhaka"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Gross Billed Amount */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider font-extrabold text-slate-700">
                    Gross Billed Amount *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={totalAmt}
                    onChange={(e) => setTotalAmt(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Customer Discount Amount (Requirement 3) */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-amber-700 uppercase mb-1.5 tracking-wider font-extrabold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    Customer Discount
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={discountAmt}
                    onChange={(e) => setDiscountAmt(e.target.value)}
                    className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl outline-none font-bold text-amber-900 focus:border-amber-400 focus:bg-white transition"
                  />
                </div>

                {/* Net Bill (Payable) - Auto calculated */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-blue-700 uppercase mb-1.5 tracking-wider font-extrabold flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                    Net Bill (Payable)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={computedNet}
                    className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl outline-none font-black text-blue-900 cursor-not-allowed"
                    placeholder="0.00"
                  />
                </div>

                {/* Paid Amount */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider font-extrabold text-emerald-600">
                    Paid / Collected Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={paidAmt}
                    onChange={(e) => setPaidAmt(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-emerald-600 focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Due Amount (Auto computed, Read-only) */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider font-extrabold text-rose-500">
                    Remaining Due
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={computedDue}
                    className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl outline-none font-black text-rose-600 cursor-not-allowed"
                    placeholder="0.00"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brief description of maintenance work"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition"
                  />
                </div>

                {/* Buttons Panel */}
                <div className="md:col-span-2 lg:col-span-3 flex gap-4 mt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 rounded-xl uppercase tracking-wider transition-colors shadow-md disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editId ? 'Update Record' : 'Save Income'}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-4 rounded-xl uppercase transition-colors"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incomes Data List Panel */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Controls (Search, Filters, Sorts) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
              Income Database
            </h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full border border-slate-200">
              {filteredList.length} Records Found
            </span>
            <button
              onClick={handleExportCsv}
              disabled={filteredList.length === 0}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Download filtered incomes as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition"
              />
            </div>

            {/* Source Filter */}
            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600 focus:border-emerald-400 focus:bg-white transition appearance-none"
              >
                <option value="All">All Income Sources</option>
                <option value="Yearly Lift Maintenance">Yearly Lift Maintenance</option>
                <option value="Installation">Installation</option>
                <option value="Lift Repair">Lift Repair</option>
              </select>
            </div>

            {/* Due Only Toggle */}
            <button
              onClick={toggleDueFilter}
              className={`px-4 py-2 text-xs font-bold uppercase border rounded-xl flex items-center justify-center gap-1.5 transition whitespace-nowrap flex-1 sm:flex-initial ${
                isDueFiltered
                  ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/15'
                  : 'bg-amber-50/70 border-amber-200/80 text-amber-700 hover:bg-amber-100/80'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Due Only</span>
            </button>

            {/* Sorter buttons */}
            <div className="flex gap-1.5 min-w-[160px] flex-1 sm:flex-initial">
              <button
                onClick={() => toggleSort('date')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase border rounded-xl flex items-center justify-center gap-1 transition ${
                  sortField === 'date'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Date</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleSort('due')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase border rounded-xl flex items-center justify-center gap-1 transition ${
                  sortField === 'due'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Due</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Incomes Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 rounded-tl-xl whitespace-nowrap">Date</th>
                <th className="px-3 py-3 whitespace-nowrap">Source</th>
                <th className="px-3 py-3 min-w-[150px]">Client & Lift</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Gross Bill</th>
                <th className="px-3 py-3 text-right font-semibold text-amber-300 whitespace-nowrap">Discount</th>
                <th className="px-3 py-3 text-right font-semibold text-blue-300 whitespace-nowrap">Net Bill</th>
                <th className="px-3 py-3 text-right text-emerald-300 font-semibold whitespace-nowrap">Paid</th>
                <th className="px-3 py-3 text-right text-rose-300 font-semibold whitespace-nowrap">Due</th>
                <th className="px-3 py-3 text-center rounded-tr-xl whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No income records found.
                  </td>
                </tr>
              ) : (
                sortedList.map((item, index) => {
                  const hasDue = item.dueAmt > 0;
                  const discount = item.discountAmt || 0;
                  const net = item.netAmt !== undefined ? item.netAmt : ((item.totalAmt || 0) - discount);
                  const isMissing = !item.liftNo || String(item.liftNo).trim() === '' || isMissingInvoice(item.liftNo);

                  return (
                    <tr
                      key={item.id ? `inc-${item.id}` : `inc-${item.rowId}-${index}`}
                      className={`transition duration-150 ${
                        isMissing
                          ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-4 border-amber-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">{item.date}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px]">
                          {item.source}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 min-w-[150px]">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">Lift: {item.liftNo || 'N/A'}</span>
                            {isMissing && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                ⚠️ Check
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 break-words">
                            {item.owner} {item.location ? `| ${item.location}` : ''}
                          </span>
                          <div className="mt-1 flex items-center gap-1">
                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold rounded border ${
                              item.account === 'Bank'
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {item.account === 'Bank' ? 'Company Bank' : 'My Cash'}
                            </span>
                          </div>
                          {item.description && (
                            <span className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[180px]" title={item.description}>
                              {item.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5">
                          <SaudiRiyalIcon className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{item.totalAmt?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                        {discount > 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold inline-flex items-center gap-0.5">
                            -<SaudiRiyalIcon className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                            {discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-blue-900 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5 font-black">
                          <SaudiRiyalIcon className="w-3 h-3 text-blue-800 shrink-0" />
                          <span>{net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-emerald-600 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5">
                          <SaudiRiyalIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{item.paidAmt?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-black whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] ${
                          hasDue 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                             : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          <SaudiRiyalIcon className={`w-3 h-3 shrink-0 ${hasDue ? 'text-rose-600' : 'text-emerald-600'}`} />
                          <span>{item.dueAmt?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleActionSecurely('edit', item.id || item.rowId)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleActionSecurely('delete', item.id || item.rowId)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Security Check Modern Modal Dialog */}
      <AnimatePresence>
        {securityModal.open && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center px-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-6 lg:p-8 w-full max-w-md relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-[3px] bg-amber-500" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-md uppercase">Confirm Password</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SECURED SYSTEM GATE</p>
                </div>
              </div>

              <p className="text-slate-600 text-xs mb-6 leading-relaxed">
                To {securityModal.type === 'delete' ? 'delete' : 'edit'} this record, please type the system security password.
              </p>

              <input
                type="password"
                placeholder="Security Password"
                value={securityModal.passwordValue}
                onChange={(e) => setSecurityModal({ ...securityModal, passwordValue: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeSecuredAction();
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-center text-lg tracking-wider outline-none focus:border-amber-500 transition"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={executeSecuredAction}
                  className="flex-1 bg-slate-900 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setSecurityModal(prev => ({ ...prev, open: false }))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
