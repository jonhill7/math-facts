import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { normalizeSave, ProgressStore, SaveData } from './types';

// Firebase settings come from environment variables at build time (see .env.example).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const cloudEnabled = Boolean(config.apiKey && config.projectId);

const app = cloudEnabled ? initializeApp(config) : undefined;
const auth = app ? getAuth(app) : undefined;
const db = app ? getFirestore(app) : undefined;

export type { User };

export function watchUser(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) return;
  const provider = new GoogleAuthProvider();
  // Shared devices: always let the kid pick which Google account.
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

export async function signOutUser(): Promise<void> {
  if (auth) await signOut(auth);
}

export function cloudStore(user: User): ProgressStore {
  if (!db) throw new Error('Firebase is not configured');
  const ref = doc(db, 'players', user.uid);
  const name = user.displayName?.split(' ')[0] ?? 'Player';
  return {
    async load() {
      const snap = await getDoc(ref);
      return normalizeSave(name, snap.exists() ? (snap.data() as Partial<SaveData>) : undefined);
    },
    async save(data) {
      await setDoc(ref, data);
    },
  };
}
