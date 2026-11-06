import { admin, isFirebaseInitialized } from '../config/firebase.js';
import {
  UserProfile,
  BloodRequest,
  NotificationItem,
  DonationHistoryItem,
  LiveLocationUpdate,
  DonorAcceptance,
  ChatMessage,
} from '../types/index.js';

// Clean initial store: Only persistent administrator account, ZERO dummy requests
const memoryUsers: Map<string, UserProfile> = new Map([
  [
    'admin_super',
    {
      id: 'admin_super',
      email: 'admin@rakthasetu.org',
      full_name: 'Platform Administrator',
      phone: '+91 80 2345 6789',
      date_of_birth: '1985-01-01',
      role: 'admin',
      blood_group: 'O+',
      location: 'Bengaluru Central',
      country: 'India',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city: 'Bengaluru',
      coordinates: { lat: 12.9716, lng: 77.5946 },
      is_available: false,
      is_verified: true,
      donation_count: 10,
      last_donation_date: null,
      created_at: new Date(Date.now() - 365 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
]);

// Completely empty requests map - NO fake/mock requests
const memoryRequests: Map<string, BloodRequest> = new Map();

// Completely empty acceptances map
const memoryAcceptances: Map<string, DonorAcceptance> = new Map();

// Completely empty notifications
const memoryNotifications: NotificationItem[] = [];

// Real-time Chat Messages map: request_id -> ChatMessage[]
const memoryChatMessages: Map<string, any[]> = new Map();
// Completely empty donation history
const memoryDonationHistory: DonationHistoryItem[] = [];

// Completely empty live locations map
const memoryLiveLocations: Map<string, LiveLocationUpdate> = new Map();

// Unified Data Store Class
export class DataStore {
  // Profiles / Users
  static async getUser(id: string): Promise<UserProfile | null> {
    if (isFirebaseInitialized) {
      try {
        const snap = await admin.firestore().collection('users').doc(id).get();
        if (snap.exists) return snap.data() as UserProfile;
      } catch (e) {
        console.warn('Firestore read error:', e);
      }
    }
    return memoryUsers.get(id) || null;
  }

  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    if (isFirebaseInitialized) {
      try {
        const snap = await admin.firestore().collection('users').where('email', '==', email).limit(1).get();
        if (!snap.empty) {
          return snap.docs[0].data() as UserProfile;
        }
      } catch (e) {
        console.warn('Firestore read error:', e);
      }
    }
    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  static async saveUser(user: UserProfile): Promise<UserProfile> {
    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('users').doc(user.id).set(user, { merge: true });
      } catch (e) {
        console.warn('Firestore write error:', e);
      }
    }
    memoryUsers.set(user.id, user);
    return user;
  }

  static async getAllDonors(): Promise<UserProfile[]> {
    const donorMap = new Map<string, UserProfile>();
    // Pre-seeded memory donors
    for (const u of memoryUsers.values()) {
      if (u.role === 'donor') donorMap.set(u.id, u);
    }
    if (isFirebaseInitialized) {
      try {
        const snap = await admin.firestore().collection('users').where('role', '==', 'donor').get();
        for (const doc of snap.docs) {
          const d = doc.data() as UserProfile;
          donorMap.set(d.id, d);
        }
      } catch (e) {
        console.warn('Firestore read donors error:', e);
      }
    }
    return Array.from(donorMap.values());
  }

  static async getAllUsers(): Promise<UserProfile[]> {
    const userMap = new Map<string, UserProfile>();
    for (const u of memoryUsers.values()) {
      userMap.set(u.id, u);
    }
    if (isFirebaseInitialized) {
      try {
        const snap = await admin.firestore().collection('users').get();
        for (const doc of snap.docs) {
          const u = doc.data() as UserProfile;
          userMap.set(u.id, u);
        }
      } catch (e) {
        console.warn('Firestore read all users error:', e);
      }
    }
    return Array.from(userMap.values());
  }

  // Blood Requests
  static async getRequest(id: string): Promise<BloodRequest | null> {
    if (isFirebaseInitialized) {
      try {
        const snap = await admin.firestore().collection('blood_requests').doc(id).get();
        if (snap.exists) return snap.data() as BloodRequest;
      } catch (e) {
        console.warn('Firestore read request error:', e);
      }
    }
    return memoryRequests.get(id) || null;
  }

  static async getAllRequests(): Promise<BloodRequest[]> {
    const reqMap = new Map<string, BloodRequest>();
    for (const r of memoryRequests.values()) {
      reqMap.set(r.id, r);
    }
    if (isFirebaseInitialized) {
      try {
        const snap = await admin.firestore().collection('blood_requests').orderBy('created_at', 'desc').get();
        for (const doc of snap.docs) {
          const r = doc.data() as BloodRequest;
          reqMap.set(r.id, r);
        }
      } catch (e) {
        console.warn('Firestore read requests error:', e);
      }
    }
    return Array.from(reqMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  static async saveRequest(req: BloodRequest): Promise<BloodRequest> {
    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('blood_requests').doc(req.id).set(req, { merge: true });
      } catch (e) {
        console.warn('Firestore save request error:', e);
      }
    }
    memoryRequests.set(req.id, req);
    return req;
  }

  // Donor Acceptances
  static async saveAcceptance(acceptance: DonorAcceptance): Promise<DonorAcceptance> {
    const key = `acc_${acceptance.request_id}_${acceptance.donor_id}`;
    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('donor_acceptances').doc(acceptance.id).set(acceptance);
      } catch (e) {
        console.warn('Firestore save acceptance error:', e);
      }
    }
    memoryAcceptances.set(key, acceptance);
    return acceptance;
  }

  static async getAcceptance(requestId: string, donorId: string): Promise<DonorAcceptance | null> {
    const key = `acc_${requestId}_${donorId}`;
    if (isFirebaseInitialized) {
      try {
        const snap = await admin
          .firestore()
          .collection('donor_acceptances')
          .where('request_id', '==', requestId)
          .where('donor_id', '==', donorId)
          .limit(1)
          .get();
        if (!snap.empty) return snap.docs[0].data() as DonorAcceptance;
      } catch (e) {
        console.warn('Firestore read acceptance error:', e);
      }
    }
    return memoryAcceptances.get(key) || null;
  }

  static async getAcceptancesForRequest(requestId: string): Promise<DonorAcceptance[]> {
    if (isFirebaseInitialized) {
      try {
        const snap = await admin
          .firestore()
          .collection('donor_acceptances')
          .where('request_id', '==', requestId)
          .orderBy('accepted_at', 'desc')
          .get();
        return snap.docs.map((d) => d.data() as DonorAcceptance);
      } catch (e) {
        console.warn('Firestore read acceptances error:', e);
      }
    }
    return Array.from(memoryAcceptances.values()).filter((a) => a.request_id === requestId);
  }

  // Notifications
  static async getNotificationsForUser(userId: string): Promise<NotificationItem[]> {
    if (isFirebaseInitialized) {
      try {
        const snap = await admin
          .firestore()
          .collection('notifications')
          .where('user_id', '==', userId)
          .orderBy('created_at', 'desc')
          .get();
        return snap.docs.map((doc) => doc.data() as NotificationItem);
      } catch (e) {
        console.warn('Firestore notifications error:', e);
      }
    }
    return memoryNotifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async addNotification(notif: NotificationItem): Promise<NotificationItem> {
    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('notifications').doc(notif.id).set(notif);
      } catch (e) {
        console.warn('Firestore add notification error:', e);
      }
    }
    memoryNotifications.unshift(notif);
    return notif;
  }

  static async markNotificationRead(id: string): Promise<boolean> {
    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('notifications').doc(id).update({ read: true });
        return true;
      } catch (e) {
        console.warn('Firestore mark read error:', e);
      }
    }
    const item = memoryNotifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }

  // Donation History
  static async getDonationHistory(userId?: string): Promise<DonationHistoryItem[]> {
    if (isFirebaseInitialized) {
      try {
        let query: admin.firestore.Query = admin.firestore().collection('donation_history');
        if (userId) {
          query = query.where('donor_id', '==', userId);
        }
        const snap = await query.orderBy('date', 'desc').get();
        return snap.docs.map((doc) => doc.data() as DonationHistoryItem);
      } catch (e) {
        console.warn('Firestore donation history error:', e);
      }
    }
    if (userId) {
      return memoryDonationHistory.filter((h) => h.donor_id === userId);
    }
    return memoryDonationHistory;
  }

  static async recordDonation(item: DonationHistoryItem): Promise<DonationHistoryItem> {
    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('donation_history').doc(item.id).set(item);
      } catch (e) {
        console.warn('Firestore record donation error:', e);
      }
    }
    memoryDonationHistory.unshift(item);
    return item;
  }

  // Real-time Live Location
  static async updateLiveLocation(update: LiveLocationUpdate): Promise<void> {
    const key = `${update.request_id}_${update.user_id}`;
    if (isFirebaseInitialized && admin.database) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RTDB timeout')), 2500)
        );
        await Promise.race([
          admin.database().ref(`live_locations/${update.request_id}/${update.user_id}`).set(update),
          timeoutPromise,
        ]);
      } catch (e) {
        // Fast local fallback
      }
    }
    memoryLiveLocations.set(key, update);
    memoryLiveLocations.set(update.request_id, update);
  }

  static async getLiveLocation(requestId: string, userId?: string): Promise<LiveLocationUpdate | null> {
    if (userId) {
      const key = `${requestId}_${userId}`;
      if (isFirebaseInitialized && admin.database) {
        try {
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 2500)
          );
          const snap = await Promise.race([
            admin.database().ref(`live_locations/${requestId}/${userId}`).once('value'),
            timeoutPromise,
          ]);
          if (snap && (snap as any).exists && (snap as any).exists()) {
            return (snap as any).val() as LiveLocationUpdate;
          }
        } catch (e) {
          // Fast local fallback
        }
      }
      return memoryLiveLocations.get(key) || memoryLiveLocations.get(requestId) || null;
    }

    if (isFirebaseInitialized && admin.database) {
      try {
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2500)
        );
        const snap = await Promise.race([
          admin.database().ref(`live_locations/${requestId}`).once('value'),
          timeoutPromise,
        ]);
        if (snap && (snap as any).exists && (snap as any).exists()) {
          const val = (snap as any).val();
          // if val is an object of users, get the first one
          const firstKey = Object.keys(val)[0];
          return (val[firstKey] || val) as LiveLocationUpdate;
        }
      } catch (e) {
        // Fast local fallback
      }
    }

    return memoryLiveLocations.get(requestId) || null;
  }

  static async clearLiveLocation(requestId: string): Promise<void> {
    memoryLiveLocations.delete(requestId);
    if (isFirebaseInitialized && admin.database) {
      try {
        await admin.database().ref(`live_locations/${requestId}`).remove();
      } catch (e) {
        // Ignore
      }
    }
  }

  // Real-time Chat
  static async saveChatMessage(msg: ChatMessage): Promise<ChatMessage> {
    const list = memoryChatMessages.get(msg.request_id) || [];
    list.push(msg);
    memoryChatMessages.set(msg.request_id, list);

    if (isFirebaseInitialized) {
      try {
        await admin.firestore().collection('chat_messages').doc(msg.id).set(msg);
      } catch (e) {
        console.warn('Firestore chat save error:', e);
      }
    }

    return msg;
  }

  static async getChatMessages(requestId: string): Promise<ChatMessage[]> {
    if (isFirebaseInitialized) {
      try {
        const snap = await admin
          .firestore()
          .collection('chat_messages')
          .where('request_id', '==', requestId)
          .orderBy('timestamp', 'asc')
          .get();
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as ChatMessage);
        }
      } catch (e) {
        console.warn('Firestore chat read error:', e);
      }
    }

    return memoryChatMessages.get(requestId) || [];
  }

  // Purge all old test and dummy entries across all collections
  static async clearAllDatabaseEntries(): Promise<{ purged: boolean; message: string }> {
    memoryRequests.clear();
    memoryAcceptances.clear();
    memoryLiveLocations.clear();
    memoryNotifications.length = 0;
    memoryChatMessages.clear();

    if (isFirebaseInitialized) {
      try {
        const collections = ['blood_requests', 'donor_acceptances', 'chat_messages', 'notifications'];
        for (const colName of collections) {
          const snap = await admin.firestore().collection(colName).get();
          const batch = admin.firestore().batch();
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        if (admin.database) {
          await admin.database().ref('live_locations').remove();
        }
      } catch (e) {
        console.warn('Firestore purge error:', e);
      }
    }

    return { purged: true, message: 'All dummy and test entries have been successfully purged from database.' };
  }
}
