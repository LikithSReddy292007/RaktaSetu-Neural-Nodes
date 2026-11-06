import { admin, isFirebaseInitialized } from '../config/firebase.js';

async function purge() {
  console.log('Purging Firestore collections...');
  if (!isFirebaseInitialized) {
    console.log('Firebase not initialized. Nothing to purge.');
    process.exit(0);
  }

  const collections = ['blood_requests', 'donor_acceptances', 'chat_messages', 'notifications'];
  for (const col of collections) {
    try {
      const snap = await admin.firestore().collection(col).get();
      console.log(`Found ${snap.size} documents in ${col}. Deleting...`);
      const batch = admin.firestore().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`Successfully purged ${col}.`);
    } catch (e: any) {
      console.warn(`Error purging ${col}:`, e.message);
    }
  }

  // Clear live_locations in Realtime Database if exists
  if (admin.database) {
    try {
      await admin.database().ref('live_locations').remove();
      console.log('Purged Realtime Database live_locations.');
    } catch (e: any) {
      console.warn('Error purging RTDB:', e.message);
    }
  }

  console.log('Firestore purge complete.');
  process.exit(0);
}

purge();

