import { 
  getDoc, setDoc, updateDoc, addDoc, collection, doc, getDocs, 
  query, where, orderBy, getDocFromServer 
} from "firebase/firestore";
import { db, auth } from "./googleAuth";
import { UserProfile, Transaction, ReportItem } from "./types";

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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Dynamic Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection Validation as requested
export async function testFirestoreConnection() {
  const pathForTest = 'test';
  try {
    await getDocFromServer(doc(db, pathForTest, 'connection'));
    console.log("Firestore secure connection verified successfully.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore diagnostic: user/client appears to be offline.");
    }
  }
}

// 2. User Profiles Operations
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(userId: string, updateData: Partial<UserProfile>): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 3. Transactions Subcollection Operations
export async function listTransactions(userId: string): Promise<Transaction[]> {
  const path = `users/${userId}/transactions`;
  try {
    const colRef = collection(db, 'users', userId, 'transactions');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const results: Transaction[] = [];
    snap.forEach((doc) => {
      results.push(doc.data() as Transaction);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addTransaction(userId: string, tx: Transaction): Promise<void> {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', tx.id);
    await setDoc(docRef, tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Abuse Reports Operations
export async function createAbuseReport(report: ReportItem): Promise<void> {
  const path = `reports/${report.id}`;
  try {
    const docRef = doc(db, 'reports', report.id);
    await setDoc(docRef, report);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
