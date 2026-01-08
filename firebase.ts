
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import { Shift, Employee, Task, ShiftDefinition } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAYcJxQflWNyk7_8JpYYYDEk1WJ8OZeJnw",
  authDomain: "smeny-5be44.firebaseapp.com",
  projectId: "smeny-5be44",
  storageBucket: "smeny-5be44.firebasestorage.app",
  messagingSenderId: "784512255996",
  appId: "1:784512255996:web:ad1f66ecf7f5aab36a9479",
  measurementId: "G-8F4MFFDMQM"
};

const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const db = firebase.firestore();
export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Hloubková rekurzivní funkce, která projde celý objekt a každé 'undefined' změní na 'null'.
// Firestore totiž 'undefined' nesnáší a vyhodí chybu, zatímco 'null' akceptuje.
const sanitizeData = (data: any): any => {
  // 1. Základní typy
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data !== 'object') return data;

  // 2. Speciální objekty, které nechceme rozbíjet
  if (data instanceof Date) return data;
  // Detekce Firestore Timestamp objektu (má metodu toMillis)
  if (typeof data.toMillis === 'function') return data; 

  // 3. Pole - projdeme každý prvek
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // 4. Běžné objekty - projdeme klíče a vyčistíme hodnoty
  const sanitizedObj: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitizedObj[key] = sanitizeData(data[key]);
    }
  }
  return sanitizedObj;
};

export const loginWithGoogle = async () => {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    if (result.user?.email) {
      await db.collection("users").doc(result.user.email.toLowerCase()).set({
        email: result.user.email.toLowerCase(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        displayName: result.user.displayName || 'Neznámý'
      }, { merge: true });
    }
  } catch (error) {
    console.error("Login failed", error);
  }
};

export const logoutUser = async () => {
  await auth.signOut();
};

export const updateEmployeeMetadata = async (empId: string, data: Partial<Employee>) => {
  await db.collection("employee_configs").doc(empId).set(sanitizeData(data), { merge: true });
};

export const getEmployeeOverrides = async (): Promise<Record<string, Partial<Employee>>> => {
  const snapshot = await db.collection("employee_configs").get();
  const overrides: Record<string, Partial<Employee>> = {};
  snapshot.forEach(doc => {
    overrides[doc.id] = doc.data() as Partial<Employee>;
  });
  return overrides;
};

export const subscribeToCustomShifts = (callback: (defs: ShiftDefinition[]) => void) => {
  return db.collection("custom_shift_definitions").onSnapshot(snap => {
    const defs: ShiftDefinition[] = [];
    snap.forEach(doc => defs.push(doc.data() as ShiftDefinition));
    callback(defs);
  });
};

export const saveCustomShiftToDb = async (def: ShiftDefinition) => {
  await db.collection("custom_shift_definitions").doc(def.code).set(sanitizeData(def));
};

export const deleteCustomShiftFromDb = async (code: string) => {
  await db.collection("custom_shift_definitions").doc(code).delete();
};

export const logErrorToDb = async (error: any, context: string = 'unspecified') => {
  const errorMessage = error?.message || String(error);
  try {
    await db.collection("bug_reports").add({
      message: errorMessage,
      context,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userEmail: auth.currentUser?.email || 'anonymous'
    });
  } catch (e) {}
};

export const subscribeToShifts = (
  monthStr: string,
  isAudit: boolean,
  callback: (shifts: Shift[]) => void,
  onError: (error: any) => void
) => {
  const startStr = monthStr + "-01";
  const endStr = monthStr + "-31"; 
  
  let query = db.collection("shifts")
    .where("date", ">=", startStr)
    .where("date", "<=", endStr);
  
  return query.onSnapshot({
    next: (querySnapshot) => {
      const shifts: Shift[] = [];
      querySnapshot.forEach((doc) => { 
        const data = doc.data() as Shift;
        if (!!data.isAudit === isAudit) {
          shifts.push(data); 
        }
      });
      callback(shifts);
    },
    error: (error) => {
      logErrorToDb(error, `Firestore Shifts [${monthStr}, audit=${isAudit}]`);
      onError(error);
    }
  });
};

export const saveShiftToDb = async (shift: Shift) => {
  // Aplikujeme sanitizaci na celý objekt před odesláním
  // Explicitně definujeme výchozí hodnoty pro volitelná pole, aby nevznikalo undefined
  const dataToSave = sanitizeData({ 
    ...shift, 
    isAudit: shift.isAudit ?? false,
    isOffered: shift.isOffered ?? false,
    history: shift.history ?? [],
    availability: shift.availability ?? '',
    note: shift.note ?? ''
  });
  
  await db.collection("shifts").doc(dataToSave.id).set(dataToSave);
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  return db.collection("tasks").orderBy("createdAt", "desc").onSnapshot(snap => {
    const tasks: Task[] = [];
    snap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() } as Task));
    callback(tasks);
  });
};

export const saveTaskToDb = async (task: Task) => {
  const id = task.id || db.collection("tasks").doc().id;
  await db.collection("tasks").doc(id).set(sanitizeData({
      ...task,
      id,
      createdAt: task.createdAt || new Date().toISOString()
  }), { merge: true });
};

export const deleteTaskFromDb = async (taskId: string) => {
  await db.collection("tasks").doc(taskId).delete();
};
