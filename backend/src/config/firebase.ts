import admin from 'firebase-admin';
import { env } from './env.js';

let isFirebaseInitialized = false;

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    let key = env.FIREBASE_PRIVATE_KEY.trim();
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    }
    const formattedPrivateKey = key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedPrivateKey,
      }),
      databaseURL: env.FIREBASE_DATABASE_URL,
    });
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    isFirebaseInitialized = true;
    console.log('[Firebase Admin] Successfully connected to Firebase Project:', env.FIREBASE_PROJECT_ID);
  } catch (error) {
    console.warn('[Firebase Admin] Initialization failed with credentials, falling back to local provider:', error);
  }
} else {
  console.log('[Firebase Admin] No Firebase service account credentials found in environment. Using in-memory store for local development/testing.');
}

export { admin, isFirebaseInitialized };

