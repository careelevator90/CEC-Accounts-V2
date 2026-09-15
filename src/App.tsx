/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Settings, 
  RefreshCw, 
  UserCheck, 
  TrendingUp, 
  TrendingDown,
  LayoutDashboard,
  FileText,
  Menu,
  HelpCircle,
  X,
  CheckCircle,
  Globe
} from 'lucide-react';

import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ExpenseTab from './components/ExpenseTab';
import IncomeTab from './components/IncomeTab';
import ReportTab from './components/ReportTab';
import SettingsTab from './components/SettingsTab';
import Login from './components/Login';
import Toast from './components/Toast';

import { db, auth, hasValidFirebaseConfig, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';

import { Expense, Income, TabType, ToastMessage, SheetRow, SheetDataResponse, isFullAccessEmail } from './types';

// Default App Script Web App Endpoint URL
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxpHfJ7mWx2LFuv6E5xrboiiK8oEJDIRbQ0kpdtGmucxGDJlS8Ynv730p6Tm8-p87Z9/exec';

export default function App() {
  // Authentication & Navigation (persisted in localStorage and sessionStorage to survive idle timeouts)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';
  });
  const [isAuthReady, setIsAuthReady] = useState(() => !hasValidFirebaseConfig() || !auth);
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('loggedInUserEmail') || sessionStorage.getItem('loggedInUserEmail') || '';
  });
  const [userRole, setUserRole] = useState<'Read Only' | 'Full Access'>(() => {
    const cachedEmail = localStorage.getItem('loggedInUserEmail') || sessionStorage.getItem('loggedInUserEmail') || '';
    return isFullAccessEmail(cachedEmail) ? 'Full Access' : 'Read Only';
  });

  // Synchronize Firebase Authentication state
  useEffect(() => {
    if (!auth || !hasValidFirebaseConfig()) {
      setIsAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthReady(true);
      if (currentUser) {
        setIsLoggedIn(true);
        const email = currentUser.email || '';
        setUserEmail(email);
        const role = isFullAccessEmail(email) ? 'Full Access' : 'Read Only';
        setUserRole(role);
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedInUserEmail', email);
        sessionStorage.setItem('loggedInUserRole', role);
        sessionStorage.removeItem('isFallbackLogin');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loggedInUserEmail', email);
        localStorage.setItem('loggedInUserRole', role);
        localStorage.removeItem('isFallbackLogin');
      } else {
        const isFallback = sessionStorage.getItem('isFallbackLogin') === 'true' || localStorage.getItem('isFallbackLogin') === 'true';
        if (!isFallback) {
          setIsLoggedIn(false);
          sessionStorage.removeItem('isLoggedIn');
          sessionStorage.removeItem('loggedInUserEmail');
          sessionStorage.removeItem('loggedInUserRole');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('loggedInUserEmail');
          localStorage.removeItem('loggedInUserRole');
        }
      }
    });

    return () => unsub();
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    return localStorage.getItem('care_sidebar_pinned') === 'true';
  });

  const handleTogglePin = (pinned: boolean) => {
    setIsSidebarPinned(pinned);
    localStorage.setItem('care_sidebar_pinned', String(pinned));
  };
  const [incomeFilterDue, setIncomeFilterDue] = useState(false);
  const [incomeTimeFilter, setIncomeTimeFilter] = useState<'monthly' | 'all'>('monthly');
  const [expenseTimeFilter, setExpenseTimeFilter] = useState<'monthly' | 'all'>('monthly');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'income') {
      setIncomeFilterDue(false);
    }
  };

  // Google Apps Script Configuration
  const [scriptUrl, setScriptUrl] = useState(() => {
    const cached = localStorage.getItem('careElevatorScriptUrl');
    if (
      cached &&
      (cached.includes('AKfycbxjDDl3k88iEmx_BOMVCl7GvBbt9fAY64VD60m38SgfRt7CN67oS0KS1E8fVounKC7d7w') ||
        cached.includes('AKfycbzy7JakbZCycYJnpnFwxrgBRFVXB2Y4h8q0824lKU1hj6fyu8EVJ3xJwTjfQJGOnQeB'))
    ) {
      localStorage.removeItem('careElevatorScriptUrl');
      return DEFAULT_SCRIPT_URL;
    }
    return cached || DEFAULT_SCRIPT_URL;
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // App Master Datasets with instant local persistence
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const cached = localStorage.getItem('careElevatorExpenses');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [incomes, setIncomes] = useState<Income[]>(() => {
    try {
      const cached = localStorage.getItem('careElevatorIncomes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [owners, setOwners] = useState<string[]>(() => {
    const cached = localStorage.getItem('careElevatorOwners');
    return cached ? JSON.parse(cached) : ['Ahmad Barnawei', 'Jahirul Islam'];
  });

  // Synchronized global month tracker (persisted to localStorage)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return localStorage.getItem('careElevatorSelectedMonth') || new Date().toISOString().slice(0, 7);
  });

  const handleSetSelectedMonth = useCallback((month: string) => {
    setSelectedMonth(month);
    localStorage.setItem('careElevatorSelectedMonth', month);
  }, []);

  const [syncRetryTrigger, setSyncRetryTrigger] = useState(0);

  // Toasts state management
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Master Data (Optional manual sync with Google Sheets)
  const fetchMasterData = useCallback(async () => {
    if (!scriptUrl) {
      addToast('Apps Script URL is not configured.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }
      const rawData: SheetDataResponse = await response.json();

      // Transform Expenses safely
      const parsedExpenses: Expense[] = (rawData.expenses || []).map((row, idx) => {
        const vals = row.values || [];
        const acc = vals[9] ? String(vals[9]).trim() : '';
        const rawLift = vals[4] != null ? String(vals[4]).trim() : '';
        return {
          id: `sheet-exp-${row.rowId || idx}-${idx}`,
          rowId: Number(row.rowId) || (idx + 1),
          date: vals[0] ? String(vals[0]).split('T')[0] : '',
          invoice: vals[1] != null ? String(vals[1]).trim() : '',
          category: vals[2] != null ? String(vals[2]).trim() : '',
          subCategory: vals[3] != null ? String(vals[3]).trim() : '',
          liftNo: rawLift,
          owner: vals[5] != null ? String(vals[5]).trim() : '',
          location: vals[6] != null ? String(vals[6]).trim() : '',
          description: vals[7] != null ? String(vals[7]).trim() : '',
          amount: parseFloat(vals[8]) || 0,
          account: (acc === 'Bank' || acc === 'Cash') ? acc : 'Cash',
        };
      });

      // Transform Incomes safely
      const parsedIncomes: Income[] = (rawData.incomes || []).map((row, idx) => {
        const vals = row.values || [];
        const acc = vals[9] ? String(vals[9]).trim() : '';
        const rawLift = vals[2] != null ? String(vals[2]).trim() : '';
        const total = parseFloat(vals[5]) || 0;
        const paid = parseFloat(vals[6]) || 0;
        const due = parseFloat(vals[7]) || 0;
        return {
          id: `sheet-inc-${row.rowId || idx}-${idx}`,
          rowId: Number(row.rowId) || (idx + 1),
          date: vals[0] ? String(vals[0]).split('T')[0] : '',
          source: vals[1] != null ? String(vals[1]).trim() : '',
          liftNo: rawLift,
          owner: vals[3] != null ? String(vals[3]).trim() : '',
          location: vals[4] != null ? String(vals[4]).trim() : '',
          totalAmt: total,
          paidAmt: paid,
          dueAmt: due,
          description: vals[8] != null ? String(vals[8]).trim() : '',
          account: (acc === 'Bank' || acc === 'Cash') ? acc : 'Cash',
        };
      });

      setExpenses(parsedExpenses);
      setIncomes(parsedIncomes);
      addToast('Data synchronized from Sheets successfully.', 'success');
    } catch (error: any) {
      console.warn('Google Sheets sync notice:', error?.message || error);
      addToast('Google Sheets sync unavailable. Using Firestore database.', 'info');
    } finally {
      setIsLoading(false);
    }
  }, [scriptUrl, addToast]);

  // Load user role
  const fetchUserRole = useCallback(async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    // Strictly assign Full Access to the 3 designated administrator emails only
    const role: 'Read Only' | 'Full Access' = isFullAccessEmail(cleanEmail) ? 'Full Access' : 'Read Only';
    setUserRole(role);
    sessionStorage.setItem('loggedInUserRole', role);
  }, []);

  // Fetch owners list from Firestore
  const fetchOwners = useCallback(async () => {
    if (!db) return;
    try {
      const docRef = doc(db, 'settings', 'owners');
      // 2-second timeout to prevent startup hangs
      const docSnap = await Promise.race([
        getDoc(docRef),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);

      if (docSnap && docSnap.exists()) {
        const list = docSnap.data().list || [];
        if (list.length > 0) {
          setOwners(list);
          localStorage.setItem('careElevatorOwners', JSON.stringify(list));
        }
      }
    } catch (e: any) {
      console.warn("Could not load owners list from Firestore within timeout:", e?.message || e);
    }
  }, []);

  // Save owners list to Firestore and local cache
  const handleSaveOwners = async (newList: string[]) => {
    setOwners(newList);
    localStorage.setItem('careElevatorOwners', JSON.stringify(newList));
    if (!db) return;
    try {
      await setDoc(doc(db, 'settings', 'owners'), { list: newList });
    } catch (e: any) {
      console.error("Failed to save owners to Firestore:", e?.message || e);
    }
  };

  // Fast manual or background sync from Firestore
  const syncDatabase = useCallback(async (silent: boolean = false) => {
    if (!db) {
      if (!silent) addToast('Firestore database not ready. Please verify connection.', 'error');
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const expSnap = await getDocs(collection(db, 'expenses'));
      const incSnap = await getDocs(collection(db, 'incomes'));

      const expList: Expense[] = expSnap.docs.map(d => {
        const data = d.data();
        const rawLift = data.liftNo != null ? String(data.liftNo).trim() : '';
        return {
          id: d.id,
          rowId: Number(data.rowId) || 0,
          date: String(data.date || ''),
          invoice: String(data.invoice || ''),
          category: String(data.category || ''),
          subCategory: String(data.subCategory || ''),
          liftNo: rawLift,
          owner: String(data.owner || ''),
          location: String(data.location || ''),
          description: String(data.description || ''),
          amount: typeof data.amount === 'number' ? data.amount : (parseFloat(data.amount) || 0),
          account: data.account === 'Bank' ? 'Bank' : 'Cash',
          isAdvance: !!data.isAdvance,
          advancePerson: String(data.advancePerson || ''),
          advanceStatus: data.advanceStatus === 'Adjusted' ? 'Adjusted' : 'Pending',
        };
      });
      expList.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setExpenses(expList);
      if (expList.length > 0) {
        localStorage.setItem('careElevatorExpenses', JSON.stringify(expList));
      }

      const incList: Income[] = incSnap.docs.map(d => {
        const data = d.data();
        const rawLift = data.liftNo != null ? String(data.liftNo).trim() : '';
        const total = typeof data.totalAmt === 'number' ? data.totalAmt : (parseFloat(data.totalAmt) || 0);
        const discount = typeof data.discountAmt === 'number' ? data.discountAmt : (parseFloat(data.discountAmt) || 0);
        const net = typeof data.netAmt === 'number' ? data.netAmt : Math.max(0, total - discount);
        const paid = typeof data.paidAmt === 'number' ? data.paidAmt : (parseFloat(data.paidAmt) || 0);
        const due = typeof data.dueAmt === 'number' ? data.dueAmt : Math.max(0, net - paid);
        return {
          id: d.id,
          rowId: Number(data.rowId) || 0,
          date: String(data.date || ''),
          source: String(data.source || ''),
          liftNo: rawLift,
          owner: String(data.owner || ''),
          location: String(data.location || ''),
          totalAmt: total,
          discountAmt: discount,
          netAmt: net,
          paidAmt: paid,
          dueAmt: due,
          description: String(data.description || ''),
          account: data.account === 'Bank' ? 'Bank' : 'Cash',
        };
      });
      incList.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setIncomes(incList);
      if (incList.length > 0) {
        localStorage.setItem('careElevatorIncomes', JSON.stringify(incList));
      }

      if (!silent) {
        addToast(`Synchronized! ${expList.length} expenses and ${incList.length} incomes loaded.`, 'success');
      }
    } catch (e: any) {
      console.error('Sync failed:', e);
      if (!silent) {
        addToast(`Sync error: ${e?.message || 'Database error'}`, 'error');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [addToast]);

  // Real-time Firestore synchronizer for Expenses and Incomes with automatic reconnect
  useEffect(() => {
    if (!isLoggedIn) return;

    // Prevent querying protected Firestore collections when unauthenticated
    if (hasValidFirebaseConfig() && auth) {
      if (!isAuthReady) return;
      if (!auth.currentUser) {
        console.warn("User is not signed in to Firebase Auth. Skipping protected Firestore listeners.");
        return;
      }
    }

    if (userEmail) {
      fetchUserRole(userEmail);
    }
    fetchOwners();

    if (!db) {
      console.warn("Firestore database instance not ready.");
      return;
    }

    let isSubscribed = true;
    let retryTimer: any = null;

    // Real-time Firestore listener for Expenses
    const unsubExpenses = onSnapshot(
      collection(db, 'expenses'),
      (snapshot) => {
        if (!isSubscribed) return;
        const list: Expense[] = snapshot.docs.map((d) => {
          const data = d.data();
          const rawLift = data.liftNo != null ? String(data.liftNo).trim() : '';
          return {
            id: d.id,
            rowId: Number(data.rowId) || 0,
            date: String(data.date || ''),
            invoice: String(data.invoice || ''),
            category: String(data.category || ''),
            subCategory: String(data.subCategory || ''),
            liftNo: rawLift,
            owner: String(data.owner || ''),
            location: String(data.location || ''),
            description: String(data.description || ''),
            amount: typeof data.amount === 'number' ? data.amount : (parseFloat(data.amount) || 0),
            account: data.account === 'Bank' ? 'Bank' : 'Cash',
            isAdvance: !!data.isAdvance,
            advancePerson: String(data.advancePerson || ''),
            advanceStatus: data.advanceStatus === 'Adjusted' ? 'Adjusted' : 'Pending',
          };
        });

        list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setExpenses(list);
        if (list.length > 0) {
          localStorage.setItem('careElevatorExpenses', JSON.stringify(list));
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('Firestore expenses listener notice:', error?.message || error);
        handleFirestoreError(error, OperationType.LIST, 'expenses');
        setIsLoading(false);
        // Automatically schedule reconnect if stream disconnected during idle
        if (isSubscribed) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            if (isSubscribed) setSyncRetryTrigger(prev => prev + 1);
          }, 3000);
        }
      }
    );

    // Real-time Firestore listener for Incomes
    const unsubIncomes = onSnapshot(
      collection(db, 'incomes'),
      (snapshot) => {
        if (!isSubscribed) return;
        const list: Income[] = snapshot.docs.map((d) => {
          const data = d.data();
          const rawLift = data.liftNo != null ? String(data.liftNo).trim() : '';
          const total = typeof data.totalAmt === 'number' ? data.totalAmt : (parseFloat(data.totalAmt) || 0);
          const discount = typeof data.discountAmt === 'number' ? data.discountAmt : (parseFloat(data.discountAmt) || 0);
          const net = typeof data.netAmt === 'number' ? data.netAmt : Math.max(0, total - discount);
          const paid = typeof data.paidAmt === 'number' ? data.paidAmt : (parseFloat(data.paidAmt) || 0);
          const due = typeof data.dueAmt === 'number' ? data.dueAmt : Math.max(0, net - paid);

          return {
            id: d.id,
            rowId: Number(data.rowId) || 0,
            date: String(data.date || ''),
            source: String(data.source || ''),
            liftNo: rawLift,
            owner: String(data.owner || ''),
            location: String(data.location || ''),
            totalAmt: total,
            discountAmt: discount,
            netAmt: net,
            paidAmt: paid,
            dueAmt: due,
            description: String(data.description || ''),
            account: data.account === 'Bank' ? 'Bank' : 'Cash',
          };
        });

        list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setIncomes(list);
        if (list.length > 0) {
          localStorage.setItem('careElevatorIncomes', JSON.stringify(list));
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('Firestore incomes listener notice:', error?.message || error);
        handleFirestoreError(error, OperationType.LIST, 'incomes');
        setIsLoading(false);
        // Automatically schedule reconnect if stream disconnected during idle
        if (isSubscribed) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            if (isSubscribed) setSyncRetryTrigger(prev => prev + 1);
          }, 3000);
        }
      }
    );

    return () => {
      isSubscribed = false;
      clearTimeout(retryTimer);
      unsubExpenses();
      unsubIncomes();
    };
  }, [isLoggedIn, isAuthReady, userEmail, syncRetryTrigger, fetchUserRole, fetchOwners]);

  // Keep-alive synchronizer: Auto-sync on visibility change (reopening tab/phone screen), window focus, or online reconnect
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncDatabase(true);
      }
    };

    const handleOnline = () => {
      syncDatabase(true);
      setSyncRetryTrigger(prev => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    // Periodic heartbeat sync every 2 minutes while app is in foreground
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncDatabase(true);
      }
    }, 2 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [isLoggedIn, syncDatabase]);

  // Save Config URL
  const saveScriptConfig = (newUrl: string) => {
    const cleanUrl = newUrl.trim();
    if (!cleanUrl) {
      addToast('Please enter a valid URL', 'error');
      return;
    }
    setScriptUrl(cleanUrl);
    localStorage.setItem('careElevatorScriptUrl', cleanUrl);
    setShowConfigDrawer(false);
    addToast('Apps Script URL saved successfully.', 'success');
  };

  // Submit operations (Add or Edit) directly to Firestore with timeout & optimistic state
  const handleSaveRecord = async (payload: any): Promise<boolean> => {
    if (!db) {
      addToast('Firestore database is not initialized. Please verify Settings.', 'error');
      return false;
    }

    const timeoutPromise = <T,>(p: Promise<T>, ms = 10000): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out after 10s')), ms))
      ]);
    };

    try {
      const isExpense = payload.sheetName === 'Expenses' || payload.action?.includes('Expense') || 'amount' in payload;
      const isIncome = payload.sheetName === 'Incomes' || payload.action?.includes('Income') || 'totalAmt' in payload;

      if (isExpense) {
        const cleanExpense: Expense = {
          rowId: Number(payload.rowId) || Date.now(),
          date: String(payload.date || ''),
          invoice: String(payload.invoice || ''),
          category: String(payload.category || ''),
          subCategory: String(payload.subCategory || ''),
          liftNo: payload.liftNo != null ? String(payload.liftNo).trim() : '',
          owner: String(payload.owner || ''),
          location: String(payload.location || ''),
          description: String(payload.description || ''),
          amount: Number(payload.amount) || 0,
          account: payload.account === 'Bank' ? 'Bank' : 'Cash',
          isAdvance: !!payload.isAdvance,
          advancePerson: String(payload.advancePerson || ''),
          advanceStatus: payload.advanceStatus === 'Adjusted' ? 'Adjusted' : 'Pending',
          updatedAt: new Date().toISOString()
        } as any;

        const docId = payload.id || expenses.find(x => x.rowId === payload.rowId)?.id;

        if (docId) {
          cleanExpense.id = docId;
          // Optimistic local update
          setExpenses(prev => {
            const updated = prev.map(item => (item.id === docId || item.rowId === payload.rowId) ? { ...item, ...cleanExpense } : item);
            localStorage.setItem('careElevatorExpenses', JSON.stringify(updated));
            return updated;
          });
          await timeoutPromise(updateDoc(doc(db, 'expenses', docId), cleanExpense as any));
          addToast('Expense record updated in Firestore!', 'success');
        } else {
          // Optimistic local add
          const tempId = 'temp_' + Date.now();
          const itemWithId = { ...cleanExpense, id: tempId };
          setExpenses(prev => {
            const updated = [itemWithId, ...prev];
            localStorage.setItem('careElevatorExpenses', JSON.stringify(updated));
            return updated;
          });
          const docRef = await timeoutPromise(addDoc(collection(db, 'expenses'), cleanExpense as any));
          setExpenses(prev => {
            const updated = prev.map(item => item.id === tempId ? { ...item, id: docRef.id } : item);
            localStorage.setItem('careElevatorExpenses', JSON.stringify(updated));
            return updated;
          });
          addToast('Expense record added to Firestore!', 'success');
        }
        return true;
      } else if (isIncome) {
        const total = Number(payload.totalAmt) || 0;
        const discount = Number(payload.discountAmt) || 0;
        const net = payload.netAmt !== undefined ? Number(payload.netAmt) : Math.max(0, total - discount);
        const paid = Number(payload.paidAmt) || 0;
        const due = payload.dueAmt !== undefined ? Number(payload.dueAmt) : Math.max(0, net - paid);

        const cleanIncome: Income = {
          rowId: Number(payload.rowId) || Date.now(),
          date: String(payload.date || ''),
          source: String(payload.source || ''),
          liftNo: payload.liftNo != null ? String(payload.liftNo).trim() : '',
          owner: String(payload.owner || ''),
          location: String(payload.location || ''),
          totalAmt: total,
          discountAmt: discount,
          netAmt: net,
          paidAmt: paid,
          dueAmt: due,
          description: String(payload.description || ''),
          account: payload.account === 'Bank' ? 'Bank' : 'Cash',
          updatedAt: new Date().toISOString()
        } as any;

        const docId = payload.id || incomes.find(x => x.rowId === payload.rowId)?.id;

        if (docId) {
          cleanIncome.id = docId;
          // Optimistic local update
          setIncomes(prev => {
            const updated = prev.map(item => (item.id === docId || item.rowId === payload.rowId) ? { ...item, ...cleanIncome } : item);
            localStorage.setItem('careElevatorIncomes', JSON.stringify(updated));
            return updated;
          });
          await timeoutPromise(updateDoc(doc(db, 'incomes', docId), cleanIncome as any));
          addToast('Income record updated in Firestore!', 'success');
        } else {
          // Optimistic local add
          const tempId = 'temp_' + Date.now();
          const itemWithId = { ...cleanIncome, id: tempId };
          setIncomes(prev => {
            const updated = [itemWithId, ...prev];
            localStorage.setItem('careElevatorIncomes', JSON.stringify(updated));
            return updated;
          });
          const docRef = await timeoutPromise(addDoc(collection(db, 'incomes'), cleanIncome as any));
          setIncomes(prev => {
            const updated = prev.map(item => item.id === tempId ? { ...item, id: docRef.id } : item);
            localStorage.setItem('careElevatorIncomes', JSON.stringify(updated));
            return updated;
          });
          addToast('Income record added to Firestore!', 'success');
        }
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Save error:', e);
      handleFirestoreError(e, OperationType.WRITE, payload.sheetName || 'records');
      addToast(`Failed to save record: ${e?.message || 'Database error'}`, 'error');
      return false;
    }
  };

  // Delete records directly from Firestore
  const handleDeleteRecord = async (sheetName: 'Expenses' | 'Incomes', id: number | string): Promise<boolean> => {
    if (!db) {
      addToast('Firestore database is not initialized. Please check Settings.', 'error');
      return false;
    }

    const colName = sheetName === 'Expenses' ? 'expenses' : 'incomes';
    try {
      let docIdToDelete = '';
      if (typeof id === 'string' && id.length > 5) {
        docIdToDelete = id;
      } else {
        const list = sheetName === 'Expenses' ? expenses : incomes;
        const found = list.find((x) => x.rowId === id || x.id === String(id));
        if (found && found.id) {
          docIdToDelete = found.id;
        }
      }

      // Optimistic delete
      if (sheetName === 'Expenses') {
        setExpenses(prev => {
          const updated = prev.filter(x => x.id !== docIdToDelete && x.rowId !== id);
          localStorage.setItem('careElevatorExpenses', JSON.stringify(updated));
          return updated;
        });
      } else {
        setIncomes(prev => {
          const updated = prev.filter(x => x.id !== docIdToDelete && x.rowId !== id);
          localStorage.setItem('careElevatorIncomes', JSON.stringify(updated));
          return updated;
        });
      }

      if (docIdToDelete) {
        await deleteDoc(doc(db, colName, docIdToDelete));
      }

      addToast('Record deleted successfully from Firestore!', 'success');
      return true;
    } catch (e: any) {
      console.error('Delete error:', e);
      handleFirestoreError(e, OperationType.DELETE, colName);
      addToast(`Failed to delete record: ${e?.message || 'Database error'}`, 'error');
      return false;
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('loggedInUserEmail');
    sessionStorage.removeItem('loggedInUserRole');
    sessionStorage.removeItem('isFallbackLogin');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('loggedInUserRole');
    localStorage.removeItem('isFallbackLogin');
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase sign out error:', err);
      }
    }
    setIsLoggedIn(false);
    setUserEmail('');
    addToast('Logged out of system successfully.', 'info');
  };

  if (!isLoggedIn) {
    return (
      <>
        <Login onSuccess={(email, role) => {
          setUserRole(role);
          sessionStorage.setItem('loggedInUserRole', role);
          sessionStorage.setItem('loggedInUserEmail', email);
          sessionStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('loggedInUserRole', role);
          localStorage.setItem('loggedInUserEmail', email);
          localStorage.setItem('isLoggedIn', 'true');
          setUserEmail(email);
          setIsLoggedIn(true);
        }} addToast={addToast} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 antialiased font-sans flex flex-col lg:flex-row">
      
      {/* Dynamic Nav bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onLogout={handleLogout}
        userEmail={userEmail}
        userRole={userRole}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isPinned={isSidebarPinned}
        setIsPinned={handleTogglePin}
      />

      {/* Main app container container */}
      <div className={`flex-1 flex flex-col min-h-screen ${isSidebarPinned ? 'lg:pl-64' : 'lg:pl-0'} transition-all duration-200`}>
        
        {/* Global Hub Header bar for refresh or options */}
        <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Menu button to open the sidebar drawer */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 sm:px-3 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {/* Logo and Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center p-0.5 border border-slate-200 shrink-0 shadow-xs">
                <img src="https://i.postimg.cc/Jzvd6JxM/loguf.png" alt="CARE" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="font-black text-xs text-slate-800 tracking-wider uppercase hidden md:inline">
                CARE ELEVATOR
              </span>
            </div>

            {/* Quick Desktop Tab Bar for instant 1-click switching */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold ml-2">
              {([
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'expense', label: 'Expenses', icon: TrendingDown },
                { id: 'income', label: 'Incomes', icon: TrendingUp },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'settings', label: 'Settings', icon: Settings },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider border hidden sm:inline-flex items-center gap-1 ${
              userRole === 'Full Access'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <UserCheck className="w-3 h-3" />
              {userRole}
            </span>

            {/* Sync Refresh data */}
            <button
              onClick={() => syncDatabase(false)}
              disabled={isLoading}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              title="Reload database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </header>

        {/* Inner dynamic view wrapper with full screen responsive width */}
        <main className="p-3 sm:p-5 lg:p-6 flex-1 w-full max-w-[1650px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  expenses={expenses}
                  incomes={incomes}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={handleSetSelectedMonth}
                  isLoading={isLoading}
                  onClickDueCard={() => {
                    setIncomeFilterDue(true);
                    setIncomeTimeFilter('all');
                    setActiveTab('income');
                  }}
                />
              )}

              {activeTab === 'expense' && (
                <ExpenseTab 
                  expenses={expenses}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={handleSetSelectedMonth}
                  onSave={handleSaveRecord}
                  onDelete={(id) => handleDeleteRecord('Expenses', id)}
                  addToast={addToast}
                  timeFilter={expenseTimeFilter}
                  setTimeFilter={setExpenseTimeFilter}
                  userRole={userRole}
                  owners={owners}
                />
              )}

              {activeTab === 'income' && (
                <IncomeTab 
                  incomes={incomes}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={handleSetSelectedMonth}
                  onSave={handleSaveRecord}
                  onDelete={(id) => handleDeleteRecord('Incomes', id)}
                  addToast={addToast}
                  filterDueOnly={incomeFilterDue}
                  setFilterDueOnly={setIncomeFilterDue}
                  timeFilter={incomeTimeFilter}
                  setTimeFilter={setIncomeTimeFilter}
                  userRole={userRole}
                />
              )}

              {activeTab === 'reports' && (
                <ReportTab 
                  expenses={expenses}
                  incomes={incomes}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={handleSetSelectedMonth}
                  addToast={addToast}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab 
                  scriptUrl={scriptUrl}
                  setScriptUrl={setScriptUrl}
                  addToast={addToast}
                  userRole={userRole}
                  owners={owners}
                  onSaveOwners={handleSaveOwners}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Developer Apps Script endpoint URL Configuration Modal Drawer */}
      <AnimatePresence>
        {showConfigDrawer && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-6 lg:p-8 w-full max-w-lg relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-blue-500 to-sky-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase">Database Server Config</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Web App Endpoint URL</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfigDrawer(false)}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-xs text-slate-500 leading-relaxed">
                  This application connects directly with a cloud database. If you wish to integrate your own custom database, please paste your published Web App Endpoint URL below:
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Deployment Script URL
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={scriptUrl}
                    id="endpointInput"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-xs text-blue-700 leading-relaxed">
                  <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Need Help?</span>
                    If you want to restore the default database URL at any time, click "Reset" and then save.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    const inputVal = (document.getElementById('endpointInput') as HTMLTextAreaElement)?.value || '';
                    saveScriptConfig(inputVal);
                  }}
                  className="flex-1 bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md"
                >
                  Save Configuration
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('endpointInput') as HTMLTextAreaElement;
                    if (el) el.value = DEFAULT_SCRIPT_URL;
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-3.5 rounded-xl text-xs uppercase transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Globally active toast alert notifications box */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
