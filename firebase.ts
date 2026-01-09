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

// Initialize Firebase app once
export const firebaseApp = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();

export const db = firebaseApp.firestore();
export const auth = firebaseApp.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

/**
 * Firestore neakceptuje hodnotu `undefined` nikde v objektu (ani vnořeně).
 * Tahle funkce rekurzivně:
 *  - odstraní klíče s hodnotou `undefined`
 *  - v polích odstraní `undefined` prvky
 *  - zachová `null`
 *  - zachová Date a Firestore Timestamp
 */
const sanitizeForFirestore = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  // primitives
  if (typeof value !== 'object') return value;

  // Date
  if (value instanceof Date) return value;

  // Firestore Timestamp (compat) má typicky toMillis()
  if (typeof (value as any)?.toMillis === 'function') return value;

  // Arrays
  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeForFirestore(v))
      .filter((v) => v !== undefined);
  }

  // Objects
  const out: any = {};
  for (const [k, v] of Object.entries(value)) {
    const cleaned = sanitizeForFirestore(v);
    if (cleaned === undefined) continue;
    out[k] = cleaned;
  }
  return out;
};

export const loginWithGoogle = async () => {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    if (result.user?.email) {
      const email = result.user.email.toLowerCase();
      await db
        .collection('users')
        .doc(email)
        .set(
          {
            email,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            displayName: result.user.displayName || 'Neznámý'
          },
          { merge: true }
        );
    }
  } catch (error) {
    console.error('Login failed', error);
  }
};

export const logoutUser = async () => {
  await auth.signOut();
};

export const updateEmployeeMetadata = async (
  empId: string,
  data: Partial<Employee>
) => {
  await db
    .collection('employee_configs')
    .doc(empId)
    .set(sanitizeForFirestore(data), { merge: true });
};

export const getEmployeeOverrides = async (): Promise<
  Record<string, Partial<Employee>>
> => {
  const snapshot = await db.collection('employee_configs').get();
  const overrides: Record<string, Partial<Employee>> = {};
  snapshot.forEach((doc) => {
    overrides[doc.id] = doc.data() as Partial<Employee>;
  });
  return overrides;
};

export const subscribeToCustomShifts = (
  callback: (defs: ShiftDefinition[]) => void
) => {
  return db.collection('custom_shift_definitions').onSnapshot((snap) => {
    const defs: ShiftDefinition[] = [];
    snap.forEach((doc) => defs.push(doc.data() as ShiftDefinition));
    callback(defs);
  });
};

export const saveCustomShiftToDb = async (def: ShiftDefinition) => {
  await db
    .collection('custom_shift_definitions')
    .doc(def.code)
    .set(sanitizeForFirestore(def), { merge: true });
};

export const deleteCustomShiftFromDb = async (code: string) => {
  await db.collection('custom_shift_definitions').doc(code).delete();
};

export const logErrorToDb = async (error: any, context: string = 'unspecified') => {
  const errorMessage = error?.message || String(error);
  try {
    await db.collection('bug_reports').add({
      message: errorMessage,
      context,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userEmail: auth.currentUser?.email || 'anonymous'
    });
  } catch (e) {
    // ignore logging errors
  }
};

export const subscribeToShifts = (
  monthStr: string,
  isAudit: boolean,
  callback: (shifts: Shift[]) => void,
  onError: (error: any) => void
) => {
  const startStr = monthStr + '-01';
  const endStr = monthStr + '-31';

  const query = db
    .collection('shifts')
    .where('date', '>=', startStr)
    .where('date', '<=', endStr);

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
  // Bezpečný ID fallback (pokud by někde přišel shift bez id)
  const id =
    shift.id ??
    (shift.employeeId && shift.date ? `${shift.employeeId}-${shift.date}` : undefined);

  if (!id) {
    const err = new Error('saveShiftToDb: Missing shift.id (and cannot derive from employeeId/date)');
    await logErrorToDb(err, 'Save Shift');
    throw err;
  }

  // Vytvoříme „plain“ objekt s defaulty, aby se minimalizovala šance na undefined.
  const plainShift: Shift = {
    ...(shift as any),
    id,
    availability: shift.availability ?? '',
    confirmedType: shift.confirmedType ?? '',
    startTime: shift.startTime ?? '',
    endTime: shift.endTime ?? '',
    breakDuration: shift.breakDuration ?? 0,
    note: shift.note ?? '',
    isWeekend: !!shift.isWeekend,
    isOffered: !!shift.isOffered,
    isAudit: !!shift.isAudit,
    history: shift.history ?? []
  };

  // Nejbezpečnější varianta: nejprve aplikujeme naše očistění,
  // poté spustíme JSON stringify/parse pro odstranění všech `undefined` hodnot
  // (včetně těch, které by sanitizeForFirestore případně přehlédl).
  const sanitized = sanitizeForFirestore(plainShift);
  const dataToSave = JSON.parse(JSON.stringify(sanitized === undefined ? {} : sanitized));

  try {
    await db.collection('shifts').doc(id).set(dataToSave, { merge: true });
  } catch (error) {
    await logErrorToDb(error, 'Save Shift');
    throw error;
  }
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  return db
    .collection('tasks')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      const tasks: Task[] = [];
      snap.forEach((doc) => tasks.push({ id: doc.id, ...doc.data() } as Task));
      callback(tasks);
    });
};

export const saveTaskToDb = async (task: Task) => {
  const id = task.id || db.collection('tasks').doc().id;
  await db
    .collection('tasks')
    .doc(id)
    .set(
      sanitizeForFirestore({
        ...task,
        id,
        createdAt: task.createdAt || new Date().toISOString()
      }),
      { merge: true }
    );
};

export const deleteTaskFromDb = async (taskId: string) => {
  await db.collection('tasks').doc(taskId).delete();
};