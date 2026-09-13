import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import appletConfig from '../../firebase-applet-config.json';

// Canonical database ID provisioned for this application
export const PRIMARY_DB_ID = appletConfig.firestoreDatabaseId || '(default)';

// Support provisioned config and client-side settings input safely
export const getFirebaseConfig = () => {
  const hasLocalStorage = typeof localStorage !== 'undefined';

  // Always prioritize the configured appletConfig when available
  if (appletConfig && appletConfig.projectId && appletConfig.apiKey) {
    if (hasLocalStorage) {
      const lastProjectId = localStorage.getItem('careElevatorLastProjectId');
      if (lastProjectId && lastProjectId !== appletConfig.projectId) {
        // Disconnect and purge all cached data from previous project
        localStorage.removeItem('careElevatorExpenses');
        localStorage.removeItem('careElevatorIncomes');
        localStorage.removeItem('careElevatorOwners');
      }
      localStorage.setItem('careElevatorLastProjectId', appletConfig.projectId);

      const savedConfigStr = localStorage.getItem('careElevatorFirebaseConfig');
      if (savedConfigStr) {
        try {
          const saved = JSON.parse(savedConfigStr);
          if (saved.projectId && saved.projectId !== appletConfig.projectId) {
            localStorage.removeItem('careElevatorFirebaseConfig');
          }
        } catch (e) {
          localStorage.removeItem('careElevatorFirebaseConfig');
        }
      }
    }

    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)',
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      measurementId: appletConfig.measurementId
    };
  }

  const savedConfigStr = hasLocalStorage ? localStorage.getItem('careElevatorFirebaseConfig') : null;
  let savedConfig: any = null;
  if (savedConfigStr && hasLocalStorage) {
    try {
      savedConfig = JSON.parse(savedConfigStr);
    } catch (e) {
      console.error('Failed to parse saved Firebase config', e);
      localStorage.removeItem('careElevatorFirebaseConfig');
    }
  }

  const metaEnv = (import.meta as any).env || {};
  return {
    apiKey: savedConfig?.apiKey || metaEnv.VITE_FIREBASE_API_KEY,
    authDomain: savedConfig?.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: savedConfig?.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID,
    firestoreDatabaseId: savedConfig?.firestoreDatabaseId || PRIMARY_DB_ID,
    storageBucket: savedConfig?.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: savedConfig?.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: savedConfig?.appId || metaEnv.VITE_FIREBASE_APP_ID
  };
};

const config = getFirebaseConfig();

export const hasValidFirebaseConfig = () => {
  const cfg = getFirebaseConfig();
  return !!(cfg && cfg.apiKey && cfg.projectId);
};

let app: any;
let auth: any;
let db: any;
let analytics: any = null;

try {
  if (hasValidFirebaseConfig()) {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(app);
    const dbId = config.firestoreDatabaseId || PRIMARY_DB_ID;
    db = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
    if (typeof window !== 'undefined') {
      isSupported().then(supported => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
  } else {
    console.warn("Firebase config is missing. Please check configuration.");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { app, auth, db, analytics };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const saveFirebaseConfig = (newConfig: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}) => {
  localStorage.setItem('careElevatorFirebaseConfig', JSON.stringify(newConfig));
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem('careElevatorFirebaseConfig');
};
