// Use Firebase Admin SDK so we can authenticate with a service account
import admin from 'firebase-admin';
import fs from 'fs';

// Require that GOOGLE_APPLICATION_CREDENTIALS points to the JSON key file
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('Environment variable GOOGLE_APPLICATION_CREDENTIALS is not set.');
  console.error('Set it to the path of the service account JSON and retry.');
  process.exit(1);
}

let serviceAccount;
try {
  const raw = fs.readFileSync(keyPath, 'utf8');
  serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error('Failed to read or parse service account JSON at', keyPath, err.message || err);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.error('Failed to initialize Firebase Admin SDK with key:', keyPath, err.message || err);
  process.exit(1);
}

const db = admin.firestore();

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
