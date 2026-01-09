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

// Inicializace Firebase aplikace (jen jednou)
export const firebaseApp = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();

export const db = firebaseApp.firestore();
db.settings({ ignoreUndefinedProperties: true }); // <— přidáno

export const auth = firebaseApp.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Expose firebase objects to `window` for quick debugging in development only.
// This helps inspect `auth.currentUser`, `db` and calls from the browser console.
if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
  (window as any).firebaseApp = firebaseApp;
  (window as any).firebase = firebase;
  (window as any).db = db;
  (window as any).auth = auth;
}

/**
 * Funkce, která rekurzivně odstraní z objektu všechny `undefined` hodnoty,
 * zachová `null`, `Date` a Firestore Timestamp.
 * Arrays i objekty projde rekurzivně.
 */
const sanitizeForFirestore = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (typeof (value as any)?.toMillis === 'function') return value;

  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeForFirestore(v))
      .filter((v) => v !== undefined);
  }

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

export const logErrorToDb = async (
  error: any,
  context: string = 'unspecified'
) => {
  const errorMessage = error?.message || String(error);
  try {
    await db.collection('bug_reports').add({
      message: errorMessage,
      context,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userEmail: auth.currentUser?.email || 'anonymous'
    });
  } catch (e) {
    // Ignorovat chyby při logování
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
   console.log('saveShiftToDb CALLED', shift);
  // Bezpečný fallback pro ID (pokud by `shift.id` nebylo definované)
  const id =
    shift.id ??
    (shift.employeeId && shift.date ? `${shift.employeeId}-${shift.date}` : undefined);

  if (!id) {
    const err = new Error(
      'saveShiftToDb: Missing shift.id (and cannot derive from employeeId/date)'
    );
    await logErrorToDb(err, 'Save Shift');
    throw err;
  }

  // Připravíme „plain“ objekt s defaulty, aby se minimalizovala šance na undefined
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

  // Očistíme objekt od undefined a převádíme JSON.parse/stringify, aby
  // se odstranilo cokoli, co se do Firestore nesmí uložit.
  const sanitized = sanitizeForFirestore(plainShift);
  const dataToSave = JSON.parse(
    JSON.stringify(sanitized === undefined ? {} : sanitized)
  );

  // Debug: detect any undefined values in the original `shift` object
  const findUndefinedPaths = (value: any, prefix = ''): string[] => {
    const res: string[] = [];
    if (value === undefined) {
      res.push(prefix || '<root>');
      return res;
    }
    if (value === null) return res;
    if (typeof value !== 'object') return res;
    if (value instanceof Date) return res;
    if (typeof (value as any)?.toMillis === 'function') return res;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        res.push(...findUndefinedPaths(v, `${prefix}[${i}]`));
      });
      return res;
    }
    for (const [k, v] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${k}` : k;
      res.push(...findUndefinedPaths(v, path));
    }
    return res;
  };

  const undefinedPaths = findUndefinedPaths(shift);
  if (undefinedPaths.length > 0) {
    console.error('saveShiftToDb: original shift contains undefined fields', id, undefinedPaths, shift);
  }

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
      snap.forEach((doc) =>
        tasks.push({ id: doc.id, ...doc.data() } as Task)
      );
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