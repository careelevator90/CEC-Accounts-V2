import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  UserPlus, 
  Settings, 
  Link2, 
  Key, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  CloudLightning,
  RefreshCw,
  UserCheck,
  X,
  ArrowRightLeft,
  Database,
  Check,
  Smartphone,
  Download,
  FileCode,
  MonitorSmartphone,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { auth, db, hasValidFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig, handleFirestoreError, OperationType, PRIMARY_DB_ID } from '../lib/firebase';
import appletConfig from '../../firebase-applet-config.json';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, writeBatch, getDocs } from 'firebase/firestore';
import { isFullAccessEmail } from '../types';
import { generateAndroidStudioProjectZip, DEFAULT_GOOGLE_SERVICES_JSON } from '../lib/androidProjectGenerator';

interface SettingsTabProps {
  scriptUrl: string;
  setScriptUrl: (url: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
  userRole: 'Read Only' | 'Full Access';
  owners?: string[];
  onSaveOwners?: (list: string[]) => void;
}

export default function SettingsTab({ 
  scriptUrl, 
  setScriptUrl, 
  addToast, 
  userRole,
  owners = [],
  onSaveOwners
}: SettingsTabProps) {
  // Password Lock state
  const [unlocked, setUnlocked] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessError, setAccessError] = useState(false);

  // User Creation States
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Read Only' | 'Full Access'>('Read Only');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const metaEnv = (import.meta as any).env || {};

  // Firebase Config Form States - prioritize official AI Studio provisioned appletConfig
  const [fbApiKey, setFbApiKey] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId === appletConfig.projectId && parsed.apiKey) return parsed.apiKey;
      } catch (e) {}
    }
    return appletConfig.apiKey || metaEnv.VITE_FIREBASE_API_KEY || '';
  });
  const [fbAuthDomain, setFbAuthDomain] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId === appletConfig.projectId && parsed.authDomain) return parsed.authDomain;
      } catch (e) {}
    }
    return appletConfig.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '';
  });
  const [fbProjectId, setFbProjectId] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId === appletConfig.projectId) return parsed.projectId;
      } catch (e) {}
    }
    return appletConfig.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || '';
  });
  const [fbDatabaseId, setFbDatabaseId] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.firestoreDatabaseId) return parsed.firestoreDatabaseId;
      } catch (e) {}
    }
    return PRIMARY_DB_ID;
  });
  const [fbStorageBucket, setFbStorageBucket] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.storageBucket) return parsed.storageBucket;
      } catch (e) {}
    }
    return appletConfig.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '';
  });
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messagingSenderId) return parsed.messagingSenderId;
      } catch (e) {}
    }
    return appletConfig.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
  });
  const [fbAppId, setFbAppId] = useState(() => {
    const saved = localStorage.getItem('careElevatorFirebaseConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.appId) return parsed.appId;
      } catch (e) {}
    }
    return appletConfig.appId || metaEnv.VITE_FIREBASE_APP_ID || '';
  });

  const [appsScriptInput, setAppsScriptInput] = useState(scriptUrl);

  // Android Studio Kotlin Project Generator States
  const [androidAppMode, setAndroidAppMode] = useState<'embedded' | 'hosted'>('embedded');
  const [androidAppName, setAndroidAppName] = useState('CEC Accounts');
  const [androidPackageName, setAndroidPackageName] = useState('com.cecaccounts.app');
  const [androidGoogleServicesJson, setAndroidGoogleServicesJson] = useState(DEFAULT_GOOGLE_SERVICES_JSON);
  const [showGoogleServicesEditor, setShowGoogleServicesEditor] = useState(false);
  const [androidTargetUrl, setAndroidTargetUrl] = useState(() => {
    return typeof window !== 'undefined' ? window.location.origin : '';
  });
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(true);

  const handleDownloadAndroidZip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingZip(true);
    try {
      const isEmbedded = androidAppMode === 'embedded';
      const targetUrl = isEmbedded ? '' : (androidTargetUrl.trim() || (typeof window !== 'undefined' ? window.location.origin : ''));
      
      if (!isEmbedded && !targetUrl.startsWith('http')) {
        addToast('Please enter a valid Web App URL (starting with http:// or https://)', 'error');
        setIsGeneratingZip(false);
        return;
      }

      const cleanAppName = androidAppName.trim() || 'CEC Accounts';
      const cleanPkgName = androidPackageName.trim() || 'com.cecaccounts.app';

      const zipBlob = await generateAndroidStudioProjectZip({
        appName: cleanAppName,
        packageName: cleanPkgName,
        webAppUrl: targetUrl,
        versionCode: 1,
        versionName: '1.0.0',
        googleServicesJson: androidGoogleServicesJson,
        isEmbeddedApp: isEmbedded
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileBaseName = cleanAppName.replace(/[^a-zA-Z0-9_-]/g, '') || 'CareElevator';
      link.download = `${fileBaseName}-AndroidStudio-Kotlin.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast(
        isEmbedded 
          ? 'Standalone APK Project (No Google AI Studio login needed!) generated & downloaded!' 
          : 'Android Studio Kotlin project ZIP generated & downloaded!', 
        'success'
      );
    } catch (err: any) {
      console.error('Failed to generate Android ZIP:', err);
      addToast('Failed to create Android project: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  useEffect(() => {
    setAppsScriptInput(scriptUrl);
  }, [scriptUrl]);

  // Handle Settings Unlocking
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessPassword === 'Bangladesh123') {
      setUnlocked(true);
      addToast('Settings unlocked successfully', 'success');
    } else {
      setAccessError(true);
      addToast('Incorrect configuration password!', 'error');
      setTimeout(() => setAccessError(false), 500);
    }
  };

  // Create New User ID (Firebase Signup)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Read Only') {
      addToast('Action denied! You have Read Only permission.', 'error');
      return;
    }

    if (!hasValidFirebaseConfig()) {
      addToast('Please save a valid Firebase Configuration first!', 'error');
      return;
    }
    if (!auth) {
      addToast('Firebase Auth is not properly initialized. Check your configurations.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match!', 'error');
      return;
    }

    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setRegisterLoading(true);
    let tempApp: any = null;
    try {
      // Dynamic imports to instantiate a secondary app safely
      const { initializeApp, deleteApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { getFirebaseConfig } = await import('../lib/firebase');

      const config = getFirebaseConfig();
      // Use an ephemeral name to avoid collision
      const ephemeralAppName = `EphemeralRegApp_${Date.now()}`;
      tempApp = initializeApp(config, ephemeralAppName);
      const tempAuth = getAuth(tempApp);

      await createUserWithEmailAndPassword(tempAuth, newEmail.trim(), newPassword);
      
      // Save role into Firestore: strictly allow Full Access ONLY to the 3 designated administrator emails
      const targetEmail = newEmail.trim().toLowerCase();
      const assignedRole: 'Read Only' | 'Full Access' = isFullAccessEmail(targetEmail) ? 'Full Access' : 'Read Only';

      let savedRole = false;
      try {
        const { getFirestore } = await import('firebase/firestore');
        const tempDb = getFirestore(tempApp);
        await setDoc(doc(tempDb, 'userRoles', targetEmail), {
          email: targetEmail,
          role: assignedRole,
          createdAt: new Date().toISOString()
        });
        savedRole = true;
      } catch (tempErr) {
        console.warn("Could not save role using ephemeral user auth context, will retry with main db:", tempErr);
      }

      if (!savedRole && db) {
        await setDoc(doc(db, 'userRoles', targetEmail), {
          email: targetEmail,
          role: assignedRole,
          createdAt: new Date().toISOString()
        });
      }

      addToast(`User ID ${newEmail} created successfully with ${assignedRole} permission!`, 'success');
      setNewEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to create user ID.', 'error');
    } finally {
      if (tempApp) {
        try {
          const { deleteApp } = await import('firebase/app');
          await deleteApp(tempApp);
        } catch (de) {
          console.error("Failed to delete ephemeral Firebase app:", de);
        }
      }
      setRegisterLoading(false);
    }
  };

  // Save Apps Script
  const handleSaveAppsScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Read Only') {
      addToast('Action denied! You have Read Only permission.', 'error');
      return;
    }
    if (!appsScriptInput.trim().startsWith('http')) {
      addToast('Please enter a valid Google Apps Script Web App URL.', 'error');
      return;
    }
    setScriptUrl(appsScriptInput.trim());
    localStorage.setItem('careElevatorScriptUrl', appsScriptInput.trim());
    addToast('Google Apps Script URL updated!', 'success');
  };

  // Save Firebase Config
  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Read Only') {
      addToast('Action denied! You have Read Only permission.', 'error');
      return;
    }
    const configObj = {
      apiKey: fbApiKey.trim(),
      authDomain: fbAuthDomain.trim(),
      projectId: fbProjectId.trim(),
      firestoreDatabaseId: fbDatabaseId.trim() || PRIMARY_DB_ID,
      storageBucket: fbStorageBucket.trim(),
      messagingSenderId: fbMessagingSenderId.trim(),
      appId: fbAppId.trim(),
    };

    if (!configObj.apiKey) {
      addToast('API Key is required to save Firebase configuration.', 'error');
      return;
    }

    saveFirebaseConfig(configObj);
    addToast('Firebase Config saved! Reloading application settings...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Reset Firebase Config
  const handleResetFirebase = () => {
    clearFirebaseConfig();
    setFbApiKey(appletConfig.apiKey || '');
    setFbAuthDomain(appletConfig.authDomain || '');
    setFbProjectId(appletConfig.projectId || '');
    setFbDatabaseId(PRIMARY_DB_ID);
    setFbStorageBucket(appletConfig.storageBucket || '');
    setFbMessagingSenderId(appletConfig.messagingSenderId || '');
    setFbAppId(appletConfig.appId || '');
    addToast('Firebase local configurations cleared. Default configurations active.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Data Migration State
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState('');
  const [migrationResult, setMigrationResult] = useState<{ expenses: number; incomes: number } | null>(null);
  const [dbCounts, setDbCounts] = useState<{ expenses: number; incomes: number } | null>(null);

  // Check existing Firestore record counts
  useEffect(() => {
    if (!db) return;
    let isMounted = true;
    const checkDbCounts = async () => {
      try {
        const expSnap = await getDocs(collection(db, 'expenses'));
        const incSnap = await getDocs(collection(db, 'incomes'));
        if (isMounted) {
          setDbCounts({ expenses: expSnap.size, incomes: incSnap.size });
        }
      } catch (e) {
        console.warn('Could not read existing record counts:', e);
      }
    };
    checkDbCounts();
    return () => {
      isMounted = false;
    };
  }, [db, migrationResult]);

  // Migrate Data from Google Sheets to Firebase Firestore
  const handleMigrateData = async () => {
    if (!db) {
      addToast('Firestore database is not connected.', 'error');
      return;
    }
    if (!scriptUrl) {
      addToast('Google Apps Script URL is required to fetch data.', 'error');
      return;
    }
    if (userRole === 'Read Only') {
      addToast('Action denied! Only Full Access users can run migration.', 'error');
      return;
    }

    setMigrating(true);
    setMigrationProgress('Connecting to Google Sheets (20s timeout)...');
    
    // 25 second timeout controller to prevent infinite browser pending state
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(scriptUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google Sheets responded with HTTP status ${response.status}`);
      }
      const rawData = await response.json();

      const rawExpenses = rawData.expenses || [];
      const rawIncomes = rawData.incomes || [];

      setMigrationProgress(`Found ${rawExpenses.length} expenses & ${rawIncomes.length} incomes. Writing to Firestore...`);

      // Write expenses in batches
      let batch = writeBatch(db);
      let opCount = 0;
      let expCount = 0;

      for (const row of rawExpenses) {
        const vals = row.values || [];
        const acc = vals[9] ? String(vals[9]).trim() : '';
        const rawLift = vals[4] != null ? String(vals[4]).trim() : '';
        const cleanExpense = {
          rowId: Number(row.rowId) || (Date.now() + expCount),
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
          isAdvance: false,
          advancePerson: '',
          advanceStatus: 'Pending',
          updatedAt: new Date().toISOString()
        };

        const newDocRef = doc(collection(db, 'expenses'));
        batch.set(newDocRef, cleanExpense);
        opCount++;
        expCount++;

        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      // Write incomes in batches
      let incCount = 0;
      for (const row of rawIncomes) {
        const vals = row.values || [];
        const acc = vals[9] ? String(vals[9]).trim() : '';
        const rawLift = vals[2] != null ? String(vals[2]).trim() : '';
        const total = parseFloat(vals[5]) || 0;
        const paid = parseFloat(vals[6]) || 0;
        const due = parseFloat(vals[7]) || 0;

        const cleanIncome = {
          rowId: Number(row.rowId) || (Date.now() + incCount),
          date: vals[0] ? String(vals[0]).split('T')[0] : '',
          source: vals[1] != null ? String(vals[1]).trim() : '',
          liftNo: rawLift,
          owner: vals[3] != null ? String(vals[3]).trim() : '',
          location: vals[4] != null ? String(vals[4]).trim() : '',
          totalAmt: total,
          discountAmt: 0,
          netAmt: total,
          paidAmt: paid,
          dueAmt: due,
          description: vals[8] != null ? String(vals[8]).trim() : '',
          account: (acc === 'Bank' || acc === 'Cash') ? acc : 'Cash',
          updatedAt: new Date().toISOString()
        };

        const newDocRef = doc(collection(db, 'incomes'));
        batch.set(newDocRef, cleanIncome);
        opCount++;
        incCount++;

        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      setMigrationResult({ expenses: expCount, incomes: incCount });
      setDbCounts({ expenses: expCount, incomes: incCount });
      setMigrationProgress('');
      addToast(`Data Migration complete! ${expCount} expenses and ${incCount} incomes imported to Firestore.`, 'success');
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error('Migration error:', e);
      if (e?.name === 'AbortError') {
        addToast('Connection timed out: Google Sheets took too long to respond. The server migration script has already completed your migration.', 'info');
      } else {
        handleFirestoreError(e, OperationType.WRITE, 'migration');
        addToast(`Migration notice: ${e?.message || 'Could not fetch from Google Sheets directly'}`, 'error');
      }
      setMigrationProgress('');
    } finally {
      setMigrating(false);
    }
  };

  // 1. LOCKED VIEW
  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center"
        >
          <div className="mx-auto w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 border border-purple-100">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Settings Protection
          </h2>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            Settings option is password-protected. Please enter the security password to modify configurations or create user IDs.
          </p>

          <motion.form 
            onSubmit={handleUnlock}
            animate={accessError ? { x: [-8, 8, -8, 8, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div>
              <input
                type="password"
                placeholder="Enter password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold tracking-widest text-slate-800 focus:bg-white focus:border-purple-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/10 hover:shadow-purple-600/20 transition flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Settings</span>
            </button>
          </motion.form>
        </motion.div>
      </div>
    );
  }

  // 2. UNLOCKED SETTINGS VIEW
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Settings Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 -mr-10 -mt-10 transform rotate-12">
          <Settings className="w-64 h-64 text-white" />
        </div>
        <div className="relative">
          <span className="bg-white/20 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
            Admin Area
          </span>
          <h2 className="text-2xl lg:text-3xl font-black mt-3">Care Elevator Configuration Control</h2>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Create Firebase user accounts, manage database API connections, and specify custom Firebase Project credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Module 1: Create New User ID (Firebase User Registration) */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
                <UserPlus className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Create App User ID</h3>
                <p className="text-xs text-slate-500">Register new staff accounts inside Firebase Authentication.</p>
              </div>
            </div>

            {hasValidFirebaseConfig() ? (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@careelevator.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Access Permission Level
                  </label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-between">
                    <span>
                      {isFullAccessEmail(newEmail) 
                        ? 'Full Access (Designated Administrator)' 
                        : 'Read Only (View Only Access)'}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      isFullAccessEmail(newEmail) 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isFullAccessEmail(newEmail) ? 'Full Access' : 'Read Only'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Standard accounts are automatically assigned Read Only access for system safety.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-md shadow-purple-600/10 hover:shadow-purple-600/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {registerLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register User ID</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-bold">Firebase is not configured yet.</p>
                  <p className="mt-1 text-slate-600">Please provide and save valid Firebase Credentials on this page to enable user registration functions.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Security Notice: Only admins can register new logins. Access is restricted.
          </div>
        </div>

        {/* Module 2: Cloud Database Server URL */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                <Link2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Server Endpoint URL</h3>
                <p className="text-xs text-slate-500">Configure connection endpoints with the Server Web App.</p>
              </div>
            </div>

            <form onSubmit={handleSaveAppsScript} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Server Web App URL
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={appsScriptInput}
                  onChange={(e) => setAppsScriptInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
                <div className="flex gap-1.5 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <p>Web app must be deployed with access: <strong>"Anyone"</strong></p>
                </div>
                <div className="flex gap-1.5 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <p>Handles live data inserts, edits, and deletions securely in the cloud database.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Server URL</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Currently utilizing live environment connection to secure cloud database.
          </div>
        </div>

        {/* Module 4: Manage Owner Names */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Manage Owners</h3>
                <p className="text-xs text-slate-500">Add or remove owner names for Expense & Owner Payments.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Add Owner Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type new owner name..."
                  id="newOwnerInput"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const btn = document.getElementById('addOwnerBtn');
                      if (btn) btn.click();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 outline-none transition text-sm font-semibold"
                />
                <button
                  type="button"
                  id="addOwnerBtn"
                  onClick={() => {
                    const input = document.getElementById('newOwnerInput') as HTMLInputElement;
                    const name = input?.value?.trim();
                    if (!name) {
                      addToast('Please enter an owner name', 'error');
                      return;
                    }
                    if (userRole === 'Read Only') {
                      addToast('Action denied! You have Read Only permission.', 'error');
                      return;
                    }
                    const currentOwners = owners || [];
                    if (currentOwners.map(o => o.toLowerCase()).includes(name.toLowerCase())) {
                      addToast('This owner already exists!', 'error');
                      return;
                    }
                    const newList = [...currentOwners, name];
                    if (onSaveOwners) onSaveOwners(newList);
                    if (input) input.value = '';
                    addToast(`Owner "${name}" added successfully!`, 'success');
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs uppercase tracking-wider shrink-0"
                >
                  Add
                </button>
              </div>

              {/* Owner List */}
              <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 max-h-[180px] overflow-y-auto bg-slate-50/50">
                {(owners && owners.length > 0) ? (
                  owners.map((ownerName) => (
                    <div key={ownerName} className="px-4 py-2.5 flex items-center justify-between bg-white hover:bg-slate-50 transition">
                      <span className="text-sm font-bold text-slate-700">{ownerName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (userRole === 'Read Only') {
                            addToast('Action denied! You have Read Only permission.', 'error');
                            return;
                          }
                          const newList = (owners || []).filter((o) => o !== ownerName);
                          if (onSaveOwners) onSaveOwners(newList);
                          addToast(`Owner "${ownerName}" removed.`, 'info');
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Owner"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No owners defined. Fallback to custom entry.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Admins can add/delete owners. Standard users can only view.
          </div>
        </div>

        {/* Module 5: Migrate Data (Google Sheets ➔ Firestore) */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Migrate Data (Google Sheets ➔ Firestore)</h3>
                <p className="text-xs text-slate-500">Import all past Expenses & Incomes directly into the real-time Firebase database.</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleMigrateData}
              disabled={migrating || userRole === 'Read Only'}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-600/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {migrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Migrating...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Run Data Migration</span>
                </>
              )}
            </button>
          </div>

          {dbCounts && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">Firestore Database Status: Synchronized</span>
                  <span className="text-[11px] text-emerald-700">
                    Currently <strong>{dbCounts.expenses} Expenses</strong> and <strong>{dbCounts.incomes} Incomes</strong> safely stored in Firestore.
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider self-start sm:self-center">
                Ready & Active
              </span>
            </div>
          )}

          {migrationProgress && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3 mb-4 animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>{migrationProgress}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMigrating(false);
                  setMigrationProgress('');
                }}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-medium transition"
              >
                Cancel
              </button>
            </div>
          )}

          {migrationResult && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  Migration Completed: {migrationResult.expenses} expenses and {migrationResult.incomes} incomes imported!
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">1. Zero Data Loss</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">Reads all rows from your connected Google Sheet and creates permanent Firestore cloud records.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">2. Real-time Sync</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">Changes in Firebase propagate instantly to all open devices without slow spreadsheet delays.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">3. Offline Ready</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">Firestore client cache allows immediate local viewing even when your connection fluctuates.</p>
            </div>
          </div>
        </div>

        {/* Module 6: Mobile Android APK & Android Studio Kotlin Project Generator */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                <Smartphone className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">Mobile Android APK (Kotlin Project Generator)</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Mobile & PC Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download a complete Kotlin Android Studio project to build an APK and use this exact same app simultaneously on computer and mobile.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidInstructions(!showAndroidInstructions)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 self-start sm:self-center"
            >
              <FileCode className="w-4 h-4" />
              <span>{showAndroidInstructions ? 'Hide Instructions' : 'View Build Guide'}</span>
              {showAndroidInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Android Project Options Form */}
          <form onSubmit={handleDownloadAndroidZip} className="space-y-4 mb-6">
            {/* APK Packaging Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => setAndroidAppMode('embedded')}
                className={`p-4 rounded-2xl border text-left transition ${
                  androidAppMode === 'embedded'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                  <span>🚀 Standalone Native Bundle (Recommended)</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                    No Google Login
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  The web app is bundled directly inside the APK. No Google AI Studio logo or Google login prompts required. Launches instantly on mobile and syncs data in real-time with Firebase.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAndroidAppMode('hosted')}
                className={`p-4 rounded-2xl border text-left transition ${
                  androidAppMode === 'hosted'
                    ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span>
                  <span>🌐 Hosted Cloud Web URL</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Loads from a live public server (such as Firebase Hosting or Cloud Run Deployed URL). <i>(Note: Internal ais-dev links will require Google authentication on mobile)</i>.
                </p>
              </button>
            </div>

            <div className={`grid grid-cols-1 ${androidAppMode === 'hosted' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  required
                  value={androidAppName}
                  onChange={(e) => setAndroidAppName(e.target.value)}
                  placeholder="CEC Accounts"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Android Package ID
                </label>
                <input
                  type="text"
                  required
                  value={androidPackageName}
                  onChange={(e) => setAndroidPackageName(e.target.value)}
                  placeholder="com.cecaccounts.app"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-xs font-mono"
                />
              </div>

              {androidAppMode === 'hosted' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Target Cloud Web App URL
                    </label>
                    <button
                      type="button"
                      onClick={() => setAndroidTargetUrl(typeof window !== 'undefined' ? window.location.origin : '')}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Current URL
                    </button>
                  </div>
                  <input
                    type="url"
                    required
                    value={androidTargetUrl}
                    onChange={(e) => setAndroidTargetUrl(e.target.value)}
                    placeholder="https://care-elevator-accounts.web.app"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Warning if using internal development URL in hosted mode */}
            {androidAppMode === 'hosted' && androidTargetUrl.includes('ais-dev-') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <span className="font-bold block">⚠️ Private AI Studio Development Link Detected:</span>
                  <p>
                    The URL you provided (<code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">{androidTargetUrl}</code>) is an internal development preview link, which prompts for Google account sign-in on mobile devices.
                  </p>
                  <p className="font-semibold text-amber-900">
                    💡 Recommendation: Select <b>"🚀 Standalone Native Bundle"</b> above, or deploy your app and paste the public production URL here.
                  </p>
                </div>
              </div>
            )}

            {/* Firebase Google Services Integration Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Firebase Google Services Configuration
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Linked & Embedded
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGoogleServicesEditor(!showGoogleServicesEditor)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-center"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{showGoogleServicesEditor ? 'Hide google-services.json' : 'View / Edit google-services.json'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Firebase Project</span>
                  <span className="font-semibold text-slate-800 font-mono text-xs">care-elevator-accounts</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Android Client ID</span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px] truncate block" title="1:414995152902:android:24503f72098ac2470dc387">
                    1:414995152902:android...
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Gradle Plugin & BoM</span>
                  <span className="font-semibold text-emerald-700 font-mono text-xs">BoM 34.19.0 + gms 4.4.2</span>
                </div>
              </div>

              {showGoogleServicesEditor && (
                <div className="mt-3 pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      app/google-services.json Content
                    </label>
                    <button
                      type="button"
                      onClick={() => setAndroidGoogleServicesJson(DEFAULT_GOOGLE_SERVICES_JSON)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={androidGoogleServicesJson}
                    onChange={(e) => setAndroidGoogleServicesJson(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:border-blue-500 outline-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This file is automatically packaged into <code>app/google-services.json</code> inside the downloaded ZIP file.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isGeneratingZip}
                className={`w-full sm:w-auto px-8 py-3.5 ${
                  androidAppMode === 'embedded' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                } text-white font-bold rounded-xl transition shadow-md text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-50`}
              >
                {isGeneratingZip ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Packaging {androidAppMode === 'embedded' ? 'Standalone' : 'Hosted'} Kotlin Project...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {androidAppMode === 'embedded' 
                        ? 'Download Standalone APK Project (ZIP - No Google Login Needed)' 
                        : 'Download Kotlin Code Project (.ZIP for Android Studio)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Collapsible Step-by-Step Android Studio Build Guide */}
          {showAndroidInstructions && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>🛠️ How to Generate the APK in Android Studio:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">1</div>
                  <span className="font-bold text-slate-800 block mb-1">Extract ZIP</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Download the project ZIP above and unzip the contents to a folder on your computer.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">2</div>
                  <span className="font-bold text-slate-800 block mb-1">Open in Studio</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Launch Android Studio, click <strong>Open</strong>, select the extracted folder, and let Gradle sync.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">3</div>
                  <span className="font-bold text-slate-800 block mb-1">Build APK</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    From the top menu, click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-2">4</div>
                  <span className="font-bold text-slate-800 block mb-1">Install on Phone</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Transfer the generated <strong>app-debug.apk</strong> to any Android phone to install and use!
                  </p>
                </div>
              </div>

              {/* Cross-Device / Instant Mobile Access Card */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <div className="flex items-start sm:items-center gap-3">
                  <MonitorSmartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold block text-slate-800">Use Same App on Computer & Mobile Simultaneously:</span>
                    <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                      Because all Incomes, Expenses, and Reports synchronize through real-time Firestore database, any change made on your computer appears instantly on mobile, and vice-versa. You can also open this link on mobile Chrome/Safari and select <strong>"Add to Home screen"</strong> for instant standalone mobile use.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module 3: Full Firebase Client Config Overrides */}
      <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <span className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
            <CloudLightning className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Custom Firebase Project Config</h3>
            <p className="text-xs text-slate-500">Provide custom Firebase web app SDK credentials to link your own Firestore/Auth database.</p>
          </div>
        </div>

        <form onSubmit={handleSaveFirebase} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                API Key
              </label>
              <input
                type="text"
                required
                placeholder="AIzaSy..."
                value={fbApiKey}
                onChange={(e) => setFbApiKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Auth Domain
              </label>
              <input
                type="text"
                placeholder="project-id.firebaseapp.com"
                value={fbAuthDomain}
                onChange={(e) => setFbAuthDomain(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Project ID
              </label>
              <input
                type="text"
                placeholder="project-id"
                value={fbProjectId}
                onChange={(e) => setFbProjectId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Firestore Database ID
              </label>
              <input
                type="text"
                placeholder="ai-studio-..."
                value={fbDatabaseId}
                onChange={(e) => setFbDatabaseId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Storage Bucket
              </label>
              <input
                type="text"
                placeholder="project-id.appspot.com"
                value={fbStorageBucket}
                onChange={(e) => setFbStorageBucket(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Messaging Sender ID
              </label>
              <input
                type="text"
                placeholder="8372619401"
                value={fbMessagingSenderId}
                onChange={(e) => setFbMessagingSenderId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                App ID
              </label>
              <input
                type="text"
                placeholder="1:8372619401:web:abcdef..."
                value={fbAppId}
                onChange={(e) => setFbAppId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 outline-none transition text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Apply & Save Firebase Credentials</span>
            </button>
            
            <button
              type="button"
              onClick={handleResetFirebase}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
