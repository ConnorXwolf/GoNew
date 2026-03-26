import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, getDocFromServer, runTransaction } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Error Handling Spec for Firestore Operations
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    // 1. Check if nickname is unique
    const nicknameRef = doc(db, 'nicknames', name.toLowerCase());
    const nicknameDoc = await getDoc(nicknameRef);
    if (nicknameDoc.exists()) {
      throw new Error('該用戶名稱已被使用，請換一個。');
    }

    // 2. Create user in Auth
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });

    // 3. Claim nickname and create user doc in a transaction
    await runTransaction(db, async (transaction) => {
      const nRef = doc(db, 'nicknames', name.toLowerCase());
      const nDoc = await transaction.get(nRef);
      if (nDoc.exists()) {
        throw new Error('該用戶名稱已被使用，請換一個。');
      }

      const userRef = doc(db, 'users', result.user.uid);
      transaction.set(nRef, { uid: result.user.uid });
      transaction.set(userRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`,
        solvedProblems: [],
        stats: {
          totalPlayed: 0,
          totalCorrect: 0,
          maxStreak: 0,
          lastSolvedDate: new Date().toISOString(),
          levelPlays: {},
          levelCorrect: {},
          levelMaxStreak: {},
          levelCurrentStreak: {}
        },
        achievements: []
      });
    });

    return result.user;
  } catch (error: any) {
    console.error("Registration Error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return await handleUserDoc(result.user);
  } catch (error) {
    console.error("Email Login Error:", error);
    throw error;
  }
};

const handleUserDoc = async (user: any, name?: string) => {
  const userRef = doc(db, 'users', user.uid);
  try {
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // This should only happen if registration failed halfway or for legacy users
      // But for simplicity, we just create it if it doesn't exist
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: name || user.displayName || '圍棋愛好者',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        solvedProblems: [],
        stats: {
          totalPlayed: 0,
          totalCorrect: 0,
          maxStreak: 0,
          lastSolvedDate: new Date().toISOString(),
          levelPlays: {},
          levelCorrect: {},
          levelMaxStreak: {},
          levelCurrentStreak: {}
        },
        achievements: []
      });
    }
    return user;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
};

export const logout = () => signOut(auth);

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Password Reset Error:", error);
    throw error;
  }
};
