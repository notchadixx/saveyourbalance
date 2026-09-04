import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with robust long polling support for sandboxed/iframe environments and persistent cache
const configWithDb = firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string };

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, configWithDb.firestoreDatabaseId);
} catch {
  dbInstance = configWithDb.firestoreDatabaseId 
    ? getFirestore(app, configWithDb.firestoreDatabaseId)
    : getFirestore(app);
}

export const db: Firestore = dbInstance;

/**
 * Recursively cleanses data payloads before passing them to Firestore.
 * Firestore strictly disallows `undefined` values and crashes with:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  // If it's a Firestore FieldValue or special class instance, return as-is
  if (typeof data === 'object' && (data as any)?.constructor?.name === 'FieldValue') {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString() as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

/**
 * Safe wrapper around setDoc that automatically strips any undefined fields
 */
export async function safeSetDoc(
  reference: Parameters<typeof setDoc>[0],
  data: any,
  options?: Parameters<typeof setDoc>[2]
) {
  const sanitized = sanitizeForFirestore(data);
  return options ? setDoc(reference, sanitized, options) : setDoc(reference, sanitized);
}

export { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  fbSignOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp 
};
export type { User };
