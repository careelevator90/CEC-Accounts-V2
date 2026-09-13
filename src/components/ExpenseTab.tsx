/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  ArrowUpDown, 
  X, 
  Lock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Calendar,
  Wallet,
  Coins,
  Download
} from 'lucide-react';
import { Expense, isMissingInvoice } from '../types';
import { SaudiRiyalIcon } from './SaudiRiyalIcon';
import { exportExpensesToCsv } from '../lib/exportCsv';

interface ExpenseTabProps {
  expenses: Expense[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onSave: (payload: any) => Promise<boolean>;
  onDelete: (id: any) => Promise<boolean>;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
  timeFilter?: 'monthly' | 'all';
  setTimeFilter?: (val: 'monthly' | 'all') => void;
  userRole?: 'Read Only' | 'Full Access';
  owners?: string[];
}

export default function ExpenseTab({
  expenses,
  selectedMonth,
  setSelectedMonth,
  onSave,
  onDelete,
  addToast,
  timeFilter,
  setTimeFilter,
  userRole = 'Full Access',
  owners = ['Ahmad Barnawei', 'Jahirul Islam']
}: ExpenseTabProps) {
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
  const [invoice, setInvoice] = useState('');
  const [category, setCategory] = useState<'Installation' | 'Maintenance' | 'Cash Advance' | 'Owner Payment' | ''>('');
  const [subCategory, setSubCategory] = useState('Lift Maintenance');
  const [liftNo, setLiftNo] = useState('');
  const [owner, setOwner] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<'Cash' | 'Bank'>('Cash');
  const [isAdvance, setIsAdvance] = useState(false);
  const [advancePerson, setAdvancePerson] = useState('');
  const [advanceStatus, setAdvanceStatus] = useState<'Pending' | 'Adjusted'>('Pending');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Security Modal States for Edit / Delete
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
    setInvoice('');
    setCategory('');
    setSubCategory('Lift Maintenance');
    setLiftNo('');
    setOwner('');
    setLocation('');
    setDescription('');
    setAmount('');
    setAccount('Cash');
    setIsAdvance(false);
    setAdvancePerson('');
    setAdvanceStatus('Pending');
    setFormOpen(false);
  };

  // Submit Expense Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Read Only') {
      addToast('Action denied! You have Read Only permission.', 'error');
      return;
    }
    const isCashAdvance = isAdvance || category === 'Cash Advance';
    const finalCategory = isCashAdvance ? 'Cash Advance' : category;
    if (!finalCategory || !amount || !invoice || !date) {
      addToast('Please fill out all required (*) fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        action: editId || editDocId ? 'editExpense' : 'addExpense',
        id: editDocId,
        rowId: editId || Date.now(),
        date,
        invoice,
        category: finalCategory,
        subCategory: finalCategory === 'Maintenance' ? subCategory : '',
        liftNo,
        owner,
        location,
        description,
        amount: parseFloat(amount),
        account: isCashAdvance ? 'Cash' : account,
        isAdvance: isCashAdvance,
        advancePerson: isCashAdvance ? advancePerson : '',
        advanceStatus: isCashAdvance ? advanceStatus : 'Pending'
      };

      const success = await onSave(payload);
      if (success) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Expense submit error:', err);
      addToast(err?.message || 'Failed to save expense', 'error');
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
        addToast('Record successfully deleted.', 'success');
      }
    } else {
      // Edit mode: populate form
      const item = expenses.find(x => x.rowId === targetId || x.id === targetId);
      if (item) {
        setEditId(item.rowId);
        setEditDocId(item.id);
        setDate(item.date ? item.date.split('T')[0] : '');
        setInvoice(item.invoice || '');
        setCategory(item.category as any);
        setSubCategory(item.subCategory || 'Lift Maintenance');
        setLiftNo(item.liftNo || '');
        setOwner(item.owner || '');
        setLocation(item.location || '');
        setDescription(item.description || '');
        setAmount(item.amount?.toString() || '');
        setAccount(item.account || 'Cash');
        setIsAdvance(item.isAdvance || item.category === 'Cash Advance');
        setAdvancePerson(item.advancePerson || '');
        setAdvanceStatus(item.advanceStatus || 'Pending');
        setFormOpen(true);
        addToast('Record is ready for editing. Please check the form at the top of the screen.', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Filter & Sort core computational pipeline
  const filteredList = expenses.filter(item => {
    const q = searchQuery.trim().toLowerCase();

    // Search Query (multiple fields matching) - if active, searches all records (bypassing month filter)
    if (q) {
      const matchesSearch = (
        String(item.invoice || '').toLowerCase().includes(q) ||
        String(item.category || '').toLowerCase().includes(q) ||
        String(item.subCategory || '').toLowerCase().includes(q) ||
        String(item.liftNo || '').toLowerCase().includes(q) ||
        String(item.owner || '').toLowerCase().includes(q) ||
        String(item.location || '').toLowerCase().includes(q) ||
        String(item.advancePerson || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Cash Advance') {
          if (!item.isAdvance && item.category !== 'Cash Advance') return false;
        } else if (item.category !== categoryFilter) {
          return false;
        }
      }
      if (accountFilter === 'Cash' && item.account !== 'Cash') return false;
      if (accountFilter === 'Bank' && item.account !== 'Bank') return false;
      return true;
    }

    // Month Filter
    if (activeTimeFilter === 'monthly') {
      if (!item.date || !item.date.startsWith(selectedMonth)) return false;
    }

    // Category Filter
    if (categoryFilter !== 'All') {
      if (categoryFilter === 'Cash Advance') {
        if (!item.isAdvance && item.category !== 'Cash Advance') return false;
      } else if (item.category !== categoryFilter) {
        return false;
      }
    }

    // Account Filter (Requirement 1: My Cash vs Company Bank)
    if (accountFilter === 'Cash' && item.account !== 'Cash') return false;
    if (accountFilter === 'Bank' && item.account !== 'Bank') return false;

    return true;
  });

  // Calculate current total and account outflows
  const currentTotal = filteredList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCash = filteredList
    .filter(e => e.account === 'Cash' || (!e.account && e.category !== 'Owner Payment'))
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalBank = filteredList
    .filter(e => e.account === 'Bank')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalAdvances = filteredList
    .filter(e => e.isAdvance || e.category === 'Cash Advance')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  // Sorting
  const sortedList = [...filteredList].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = String(a.date || '').localeCompare(String(b.date || ''));
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'date' | 'amount') => {
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
      addToast('No expense records found to export.', 'info');
      return;
    }
    const cleanMonth = activeTimeFilter === 'monthly' && selectedMonth ? selectedMonth.replace(/\s+/g, '_') : 'all_time';
    const filename = `care_elevator_expenses_${cleanMonth}_${new Date().toISOString().slice(0, 10)}.csv`;
    const success = exportExpensesToCsv(sortedList, filename);
    if (success) {
      addToast(`Successfully downloaded ${sortedList.length} expense records as CSV!`, 'success');
    }
  };

  // Expense categories helpers for fields
  const showSubSelection = category === 'Maintenance';
  const showLiftOwnerFields = 
    category === 'Installation' || 
    (category === 'Maintenance' && subCategory === 'Lift Maintenance');
  const showCarField = 
    category === 'Maintenance' && subCategory === 'Car Maintenance';
  const showAdvanceFields = isAdvance || category === 'Cash Advance';

  return (
    <div className="space-y-8">
      {/* Upper summary widget with active month tracker */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
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

          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
            <div className="text-right bg-rose-50 px-5 py-2.5 rounded-2xl border border-rose-100">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                Total Expense {accountFilter !== 'All' ? `(${accountFilter === 'Cash' ? 'My Cash' : 'Company Bank'})` : ''}
              </p>
              <p className="text-xl lg:text-2xl font-black text-rose-600 flex items-center justify-end gap-1">
                <SaudiRiyalIcon className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            
            <button
              onClick={() => {
                if (editId) {
                  resetForm();
                } else {
                  setFormOpen(!formOpen);
                }
              }}
              className={`p-3 md:px-5 md:py-3.5 rounded-2xl font-bold text-sm uppercase flex items-center gap-2 transition ${
                editId 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : formOpen
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-slate-900 text-white hover:bg-rose-600 shadow-lg shadow-slate-900/10'
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
                  <span className="hidden sm:inline">Close Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Expense</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Breakdown Badges: Cash, Bank & Material Advances */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              My Cash Outflow:
            </span>
            <span className="text-sm font-black text-slate-800 flex items-center gap-1">
              <SaudiRiyalIcon className="w-3.5 h-3.5 text-slate-700" />
              {totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Company Bank:
            </span>
            <span className="text-sm font-black text-blue-700 flex items-center gap-1">
              <SaudiRiyalIcon className="w-3.5 h-3.5 text-blue-700" />
              {totalBank.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              Cash Advances:
            </span>
            <span className="text-sm font-black text-amber-900 flex items-center gap-1">
              <SaudiRiyalIcon className="w-3.5 h-3.5 text-amber-800" />
              {totalAdvances.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Expense Dynamic Panel */}
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
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-rose-500 to-pink-500" />
              
              <h3 className="text-lg lg:text-xl font-black text-rose-600 mb-6 uppercase flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-500" />
                {editId ? 'Update Expense Details' : 'Add New Expense'}
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
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                  />
                </div>

                {/* Invoice No */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Invoice No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-9812"
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                  />
                </div>

                {/* Main Category */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setCategory(val);
                      if (val === 'Cash Advance') {
                        setIsAdvance(true);
                        setAccount('Cash');
                      } else {
                        setIsAdvance(false);
                      }
                      // Reset sub values based on main category
                      if (val !== 'Maintenance') {
                        setSubCategory('');
                      } else {
                        setSubCategory('Lift Maintenance');
                      }
                      // Reset owner if switching away from owner payment
                      if (val !== 'Owner Payment' && category === 'Owner Payment') {
                        setOwner('');
                      }
                    }}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-rose-400 focus:bg-white transition"
                  >
                    <option value="">Select...</option>
                    <option value="Installation">Installation</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Cash Advance">Cash Advance for Materials</option>
                    <option value="Owner Payment">Owner Payment</option>
                  </select>
                </div>

                {/* Account Source Select */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Paid From *
                  </label>
                  <select
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value as 'Cash' | 'Bank')}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-rose-400 focus:bg-white transition"
                  >
                    <option value="Cash">Cash (Personal)</option>
                    <option value="Bank">Bank Account (Company)</option>
                  </select>
                </div>

                {/* Cash Advance Specific Fields */}
                <AnimatePresence>
                  {(isAdvance || category === 'Cash Advance') && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col"
                      >
                        <label className="text-[11px] font-bold text-amber-800 uppercase mb-1.5 tracking-wider">
                          Advance Given To (Recipient / Person / Vendor) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Jahid / Technician / Hardware Store"
                          value={advancePerson}
                          onChange={(e) => setAdvancePerson(e.target.value)}
                          className="p-3 bg-amber-50/50 border border-amber-300 rounded-xl outline-none font-bold text-slate-800 focus:border-amber-500 focus:bg-white transition"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col"
                      >
                        <label className="text-[11px] font-bold text-amber-800 uppercase mb-1.5 tracking-wider">
                          Advance Status
                        </label>
                        <select
                          value={advanceStatus}
                          onChange={(e) => setAdvanceStatus(e.target.value as 'Pending' | 'Adjusted')}
                          className="p-3 bg-amber-50/50 border border-amber-300 rounded-xl outline-none font-bold text-slate-800 focus:border-amber-500 focus:bg-white transition"
                        >
                          <option value="Pending">Pending (Settlement / Bills Pending)</option>
                          <option value="Adjusted">Adjusted (Purchased & Reconciled)</option>
                        </select>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Owner Payment Owner Name selection (Conditional) */}
                <AnimatePresence>
                  {category === 'Owner Payment' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col"
                    >
                      <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Select Owner *
                      </label>
                      <select
                        required
                        value={owners.includes(owner) ? owner : (owner ? 'Other' : '')}
                        onChange={(e) => {
                          if (e.target.value === 'Other') {
                            setOwner('');
                          } else {
                            setOwner(e.target.value);
                          }
                        }}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-rose-400 focus:bg-white transition"
                      >
                        <option value="">Select Owner...</option>
                        {owners.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                        <option value="Other">Other / Custom Name</option>
                      </select>

                      {/* Custom Owner Name text input if 'Other' is chosen */}
                      {(!owners.includes(owner) || !owner) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Type Owner Name"
                            value={owner}
                            onChange={(e) => setOwner(e.target.value)}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full focus:border-rose-400 focus:bg-white transition"
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sub-Category (Conditional) */}
                <AnimatePresence>
                  {showSubSelection && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col"
                    >
                      <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Maintenance Type *
                      </label>
                      <select
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 focus:border-rose-400 focus:bg-white transition"
                      >
                        <option value="Lift Maintenance">1. Lift Maintenance</option>
                        <option value="Car Maintenance">2. Car Maintenance</option>
                        <option value="Office & Staff House">3. Office & Staff House</option>
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Lift fields (Lift Number, Owner Name, Location) */}
                <AnimatePresence>
                  {showLiftOwnerFields && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col"
                      >
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Lift Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CE-L39"
                          value={liftNo}
                          onChange={(e) => setLiftNo(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col"
                      >
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Owner Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Mr. Rahman"
                          value={owner}
                          onChange={(e) => setOwner(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col"
                      >
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                          Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Uttara, Dhaka"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                        />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Car field (Conditional) */}
                <AnimatePresence>
                  {showCarField && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex flex-col"
                    >
                      <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                        Car Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dhaka Metro-Ga-11-2222"
                        value={liftNo}
                        onChange={(e) => setLiftNo(e.target.value)}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description */}
                <div className="flex flex-col md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Materials, labor costs, transport, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider font-extrabold text-rose-600">
                    Amount *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-rose-600 focus:border-rose-400 focus:bg-white transition"
                  />
                </div>

                {/* Buttons Panel */}
                <div className="md:col-span-2 lg:col-span-3 flex gap-4 mt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-slate-900 hover:bg-rose-600 text-white font-black py-4 rounded-xl uppercase tracking-wider transition-colors shadow-md disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editId ? 'Update Record' : 'Save Expense'}
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

      {/* Monthly Expenses Table Panel */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Controls (Search, Category Selector, Sorting) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
              Expenses Database
            </h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full border border-slate-200">
              {filteredList.length} Records Found
            </span>
            <button
              onClick={handleExportCsv}
              disabled={filteredList.length === 0}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Download filtered expenses as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-400 focus:bg-white transition"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600 focus:border-rose-400 focus:bg-white transition appearance-none"
              >
                <option value="All">All Categories</option>
                <option value="Installation">Installation</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Owner Payment">Owner Payment</option>
              </select>
            </div>

            {/* Print/View Column Sorters */}
            <div className="flex gap-1.5">
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
                onClick={() => toggleSort('amount')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase border rounded-xl flex items-center justify-center gap-1 transition ${
                  sortField === 'amount'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Amount</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 rounded-tl-xl">Date</th>
                <th className="p-4">Invoice</th>
                <th className="p-4">Category</th>
                <th className="p-4">Details</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                sortedList.map((item, index) => {
                  const missingInvoice = isMissingInvoice(item.invoice);
                  let detailBadge = '';
                  if (item.isAdvance || item.category === 'Cash Advance') {
                    detailBadge = `Material Advance to: ${item.advancePerson || 'Vendor/Tech'} | Status: ${item.advanceStatus || 'Pending'}`;
                  } else if (item.category === 'Installation') {
                    detailBadge = `Lift: ${item.liftNo || '-'} | Owner: ${item.owner || '-'} | Loc: ${item.location || '-'}`;
                  } else if (item.category === 'Owner Payment') {
                    detailBadge = 'Owner Payment Withdrawal';
                  } else {
                    if (item.subCategory === 'Car Maintenance') {
                      detailBadge = `Car No: ${item.liftNo || '-'}`;
                    } else if (item.subCategory === 'Lift Maintenance') {
                      detailBadge = `Lift: ${item.liftNo || '-'} | Owner: ${item.owner || '-'} | Loc: ${item.location || '-'}`;
                    } else {
                      detailBadge = 'Office & Staff House';
                    }
                  }

                  return (
                    <tr
                      key={item.id ? `exp-${item.id}` : `exp-${item.rowId}-${index}`}
                      className={`transition duration-150 ${
                        missingInvoice
                          ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-amber-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-4 font-medium text-slate-600">{item.date}</td>
                      <td className="p-4 font-bold text-slate-900">
                        {missingInvoice ? (
                          <span className="px-2 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                            <span>⚠️</span> No Invoice
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono">
                            {item.invoice}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-slate-700">
                        <div className="flex flex-col gap-0.5">
                           <span>{item.category}</span>
                           {item.subCategory && (
                             <span className="text-[10px] text-slate-400 font-medium font-mono">
                               ({item.subCategory})
                             </span>
                           )}
                           <div className="flex flex-wrap gap-1 mt-1">
                             <span className={`inline-block w-fit px-1.5 py-0.5 text-[9px] font-bold rounded-md border ${
                               item.account === 'Bank'
                                 ? 'bg-blue-50 text-blue-600 border-blue-200'
                                 : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                             }`}>
                               {item.account === 'Bank' ? 'Company Bank' : 'My Cash'}
                             </span>
                             {(item.isAdvance || item.category === 'Cash Advance') && (
                               <span className={`inline-block w-fit px-1.5 py-0.5 text-[9px] font-bold rounded-md border ${
                                 item.advanceStatus === 'Adjusted'
                                   ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                   : 'bg-amber-100 text-amber-900 border-amber-300'
                               }`}>
                                 💸 Advance: {item.advancePerson || 'Materials'} ({item.advanceStatus || 'Pending'})
                               </span>
                             )}
                           </div>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs truncate" title={detailBadge}>
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-semibold">{detailBadge}</span>
                          {item.description && (
                            <span className="text-[10px] text-slate-400 mt-0.5 italic">
                              Note: {item.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-rose-600 text-sm">
                        <div className="flex items-center justify-end gap-0.5">
                          <SaudiRiyalIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{item.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleActionSecurely('edit', item.rowId)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleActionSecurely('delete', item.rowId)}
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition"
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
