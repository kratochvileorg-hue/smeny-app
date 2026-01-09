import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Kopie firebase config (stejná jako v firebase.ts)
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
const db = firebase.firestore();

const sanitizeForFirestore = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (typeof value?.toMillis === 'function') return value; // firestore timestamp
  if (Array.isArray(value)) {
    return value.map(v => sanitizeForFirestore(v)).filter(v => v !== undefined);
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const cleaned = sanitizeForFirestore(v);
    if (cleaned === undefined) continue;
    out[k] = cleaned;
  }
  return out;
};

const run = async () => {
  console.log('Starting shifts sanitization...');
  try {
    const snapshot = await db.collection('shifts').get();
    console.log(`Found ${snapshot.size} shift documents.`);
    let count = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      try {
        // Backup original
        await db.collection('shifts_backups').doc(doc.id).set({ original: data, backedAt: new Date().toISOString() });

        // Sanitize and remove undefined via JSON roundtrip
        const sanitized = sanitizeForFirestore(data);
        const clean = JSON.parse(JSON.stringify(sanitized === undefined ? {} : sanitized));

        await db.collection('shifts').doc(doc.id).set(clean, { merge: true });
        console.log('Sanitized', doc.id);
        count++;
      } catch (e) {
        console.error('Failed doc', doc.id, e);
      }
    }
    console.log(`Sanitization complete. Updated ${count} documents.`);
    process.exit(0);
  } catch (e) {
    console.error('Sanitization failed', e);
    process.exit(2);
  }
};

run();
