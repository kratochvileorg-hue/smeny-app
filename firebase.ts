
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

// Robustní čistící funkce - prochází objekt rekurzivně
const sanitizeData = (data: any): any => {
  // 1. Pokud je hodnota undefined nebo null, vrátíme null (Firestore null bere)
  if (data === undefined || data === null) return null;
  
  // 2. Pokud to není objekt (číslo, string, boolean), vrátíme jak je
  if (typeof data !== 'object') return data;

  // 3. Zachováme Date objekty a Firestore Timestamps
  if (data instanceof Date) return data;
  if (typeof data.toMillis === 'function') return data;

  // 4. Pole - projdeme každou položku
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // 5. Objekty - vytvoříme nový a zkopírujeme vyčištěné hodnoty
  const cleanObj: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const val = data[key];
      // Klíčový moment: pokud je hodnota undefined, explicitně uložíme null
      if (val === undefined) {
        cleanObj[key] = null;
      } else {
        cleanObj[key] = sanitizeData(val);
      }
    }
  }
  return cleanObj;
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
  // Explicitně vytvoříme nový objekt a doplníme výchozí hodnoty
  // Tím zajistíme, že do sanitizeData vůbec nevstoupí 'undefined' klíče z původního objektu
  const plainShift = {
    id: shift.id,
    employeeId: shift.employeeId,
    date: shift.date,
    availability: shift.availability || '',
    confirmedType: shift.confirmedType || '',
    startTime: shift.startTime || '',
    endTime: shift.endTime || '',
    breakDuration: shift.breakDuration || 0,
    note: shift.note || '',
    isWeekend: !!shift.isWeekend,
    isOffered: !!shift.isOffered,
    isAudit: !!shift.isAudit,
    history: shift.history || []
  };

  // Pro jistotu ještě proženeme sanitizací (hlavně kvůli vnořeným objektům v history)
  const dataToSave = sanitizeData(plainShift);
  
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
