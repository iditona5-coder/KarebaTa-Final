/**
 * Firebase Client Configuration & Service
 * Terkoneksi langsung ke proyek Firebase pribadi: kareba-ta-728d0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  setLogLevel,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  updatePassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  setPersistence,
  browserLocalPersistence,
  User 
} from 'firebase/auth';
export type { User };
import type { FeedItem, PostItem, CommentItem, ReportItem, HelpSettings, SponsorAd, AdSettings, AdminAuditLog, AdminAppConfig, UserProfile } from '../types';
import { DEFAULT_HELP_SETTINGS, DEFAULT_AD_SETTINGS, DEFAULT_ADMIN_APP_CONFIG } from '../types';
import type { BulletinItem } from '../components/RunningTextBar';

// Konfigurasi Firebase resmi dari pengguna
export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyCIYga4scuibu7DvScxjy2LAyDZaC66zJM",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "kareba-ta-728d0.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "kareba-ta-728d0",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "kareba-ta-728d0.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "88744359192",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:88744359192:web:3961c5cac1fa073cb35a6d",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-Z0BDDY9HCM"
};

// Inisialisasi Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Redam log peringatan offline berkala
try {
  setLogLevel('error');
} catch {}

// Inisialisasi Firestore dengan auto-detect long polling dan persistent local cache
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache(),
    });
  } catch {
    return getFirestore(app);
  }
})();

export const auth: Auth = getAuth(app);
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

/**
 * Menyimpan postingan baru ke koleksi 'posts' di Firestore
 */
export async function savePostToFirestore(feedItem: FeedItem, postItem: PostItem): Promise<boolean> {
  if (!db) return false;
  try {
    const postRef = doc(db, 'posts', feedItem.id);
    await setDoc(postRef, {
      ...feedItem,
      views: Number(feedItem.views) || 0,
      title: postItem.title,
      loc: postItem.loc,
      createdAtServer: serverTimestamp(),
      createdAtTimestamp: Date.now(),
    });
    console.log(`[Firebase] Postingan ${feedItem.id} berhasil disimpan ke Firestore!`);
    return true;
  } catch (error) {
    console.warn('[Firebase] Catatan: Gagal menyimpan ke Firestore (kemungkinan rules belum diatur di Firebase Console):', error);
    return false;
  }
}

/**
 * Berlangganan (Real-time listener) ke koleksi 'posts' di Firestore
 */
export function listenToFirestorePosts(
  onUpdate: (remotePosts: FeedItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) {
    return () => {};
  }

  try {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAtTimestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const remotePosts: FeedItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              user: data.user || 'Warga Kareba',
              init: data.init || (data.user ? data.user[0].toUpperCase() : 'W'),
              name: data.name || data.user || 'Warga',
              email: data.email || '',
              avatar: data.avatar,
              time: data.time || 'Baru saja',
              text: data.text || '',
              img: data.img || '',
              thumbnail: data.thumbnail,
              fileId: data.fileId,
              thumbFileId: data.thumbFileId,
              mediaType: data.mediaType || 'image',
              like: Number(data.like) || 0,
              views: Number(data.views) || 0,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
              isLiked: false, // Ditentukan oleh client lokal
              comments: Array.isArray(data.comments) ? data.comments : [],
              location: data.location || data.loc || 'Wilayah Sekitar',
              isMyPost: false,
            };
          });
          onUpdate(remotePosts);
        } else {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn('[Firebase] Listener Firestore belum aktif atau butuh izin rules:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Gagal menginisialisasi listener Firestore:', err);
    return () => {};
  }
}

/**
 * Memperbarui status Like di Firestore beserta daftar pengguna yang menyukai
 */
export async function togglePostLikeInFirestore(
  postId: string,
  newLikeCount: number,
  userIdentifier?: string,
  isLiking: boolean = true
): Promise<boolean> {
  if (!db) return false;
  try {
    const postRef = doc(db, 'posts', postId);
    const updatePayload: Record<string, any> = {
      like: newLikeCount,
    };
    if (userIdentifier && userIdentifier.trim() !== '') {
      updatePayload.likedBy = isLiking
        ? arrayUnion(userIdentifier.trim())
        : arrayRemove(userIdentifier.trim());
    }
    await updateDoc(postRef, updatePayload);
    return true;
  } catch (error) {
    console.warn('[Firebase] Gagal memperbarui like di Firestore:', error);
    return false;
  }
}

/**
 * Menambahkan jumlah tayangan / pembaca (view count) ke postingan di Firestore
 */
export async function incrementPostViewInFirestore(postId: string): Promise<boolean> {
  if (!db || !postId) return false;
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      views: increment(1),
    });
    return true;
  } catch (error) {
    console.warn('[Firebase] Catatan views Firestore:', error);
    return false;
  }
}

/**
 * Menambahkan komentar ke postingan di Firestore
 */
export async function addCommentToFirestore(postId: string, comment: CommentItem): Promise<boolean> {
  if (!db) return false;
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: arrayUnion(comment),
    });
    return true;
  } catch (error) {
    console.warn('[Firebase] Gagal menambahkan komentar ke Firestore:', error);
    return false;
  }
}

/**
 * Menghapus postingan dari Firestore
 */
export async function deletePostFromFirestore(postId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
    console.log(`[Firebase] Postingan ${postId} berhasil dihapus dari Firestore`);
    return true;
  } catch (error) {
    console.warn('[Firebase] Gagal menghapus postingan dari Firestore:', error);
    return false;
  }
}

// ==========================================
// AUTENTIKASI ADMIN FIREBASE (GOOGLE AUTH)
// ==========================================

export const PRIMARY_ADMIN_EMAIL = "iditona5@gmail.com";

// Penyimpanan sesi simulasi untuk mode pratinjau (otomatis terhapus saat keluar/tutup browser)
let currentSimulatedUser: User | null = null;
const authSubscribers: Array<(user: User | null) => void> = [];

try {
  const savedSimulated = typeof window !== "undefined" ? sessionStorage.getItem("karebata_simulated_user") : null;
  if (savedSimulated) {
    currentSimulatedUser = JSON.parse(savedSimulated);
  }
} catch {}

function notifyAuthSubscribers(user: User | null) {
  authSubscribers.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error("[Auth] Error notifying subscriber:", e);
    }
  });
}

/**
 * Login Simulasi (Mode Pratinjau / Pengujian)
 * Digunakan jika domain pratinjau belum dimasukkan ke Authorized Domains Firebase Console
 */
export function loginAsSimulatedUser(email: string = PRIMARY_ADMIN_EMAIL, displayName?: string): User {
  const isAdm = isUserAdmin(email);
  const name = displayName || (isAdm ? "Admin Kareba'Ta" : "Warga Kareba");
  const simUser = {
    uid: "user-sim-" + (isAdm ? "admin" : "warga"),
    email: email.trim(),
    displayName: name,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "simulated-token",
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: "google.com",
  } as unknown as User;

  currentSimulatedUser = simUser;
  try {
    sessionStorage.setItem("karebata_simulated_user", JSON.stringify(simUser));
    localStorage.removeItem("karebata_simulated_user");
  } catch {}
  notifyAuthSubscribers(simUser);
  return simUser;
}

// Status lock untuk mencegah pemanggilan ganda popup Google yang menyebabkan ASSERTION FAILED
let isLoginInProgress = false;

/**
 * Login dengan Akun Google
 */
export async function loginWithGoogle(): Promise<{ user: User | null; error?: string }> {
  if (isLoginInProgress) {
    return { user: null, error: "Jendela login sedang terbuka. Harap selesaikan atau tunggu sejenak." };
  }

  isLoginInProgress = true;
  try {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    currentSimulatedUser = null;
    try {
      sessionStorage.removeItem("karebata_simulated_user");
      localStorage.removeItem("karebata_simulated_user");
    } catch {}
    notifyAuthSubscribers(result.user);
    return { user: result.user };
  } catch (err: any) {
    const errorCode = err?.code || "";
    const errorMessage = err?.message || "";

    // Tangani jika pengguna menutup popup atau klik ganda (popup-closed-by-user / cancelled-popup-request / pending promise)
    if (
      errorCode === "auth/popup-closed-by-user" ||
      errorMessage.includes("popup-closed-by-user") ||
      errorCode === "auth/cancelled-popup-request" ||
      errorMessage.includes("cancelled-popup-request") ||
      errorMessage.includes("Pending promise was never set") ||
      errorMessage.includes("INTERNAL ASSERTION FAILED")
    ) {
      console.info('[Firebase Auth] Login popup ditutup oleh pengguna atau dibatalkan.');
      return { user: null, error: "Jendela login ditutup. Silakan coba lagi jika ingin masuk." };
    }

    console.warn('[Firebase Auth] Gagal login Google:', err);
    return { user: null, error: errorMessage || 'Gagal login dengan akun Google' };
  } finally {
    // Beri jeda sedikit sebelum mengizinkan pemanggilan baru untuk mencegah race condition browser
    setTimeout(() => {
      isLoginInProgress = false;
    }, 500);
  }
}

/**
 * Logout dari Firebase
 */
export async function logoutUser(): Promise<boolean> {
  try {
    currentSimulatedUser = null;
    try {
      sessionStorage.removeItem("karebata_simulated_user");
      localStorage.removeItem("karebata_simulated_user");
    } catch {}
    notifyAuthSubscribers(null);
    await signOut(auth);
    return true;
  } catch (err) {
    console.error('[Firebase Auth] Gagal logout:', err);
    return false;
  }
}

/**
 * Listener status login pengguna
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  authSubscribers.push(callback);
  // Segera kirimkan user simulasi jika ada
  if (currentSimulatedUser) {
    callback(currentSimulatedUser);
  }

  const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      currentSimulatedUser = null;
      try {
        localStorage.removeItem("karebata_simulated_user");
      } catch {}
      callback(firebaseUser);
    } else if (!currentSimulatedUser) {
      callback(null);
    }
  });

  return () => {
    const idx = authSubscribers.indexOf(callback);
    if (idx > -1) authSubscribers.splice(idx, 1);
    unsubscribeFirebase();
  };
}

/**
 * Cek apakah user adalah admin berizin
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

// ==========================================
// MANAJEMEN TEKS BERJALAN (BULLETINS) FIRESTORE
// ==========================================

/**
 * Berlangganan teks berjalan (kabar kilat) dari Firestore
 */
export function listenToFirestoreBulletins(
  onUpdate: (bulletins: BulletinItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) return () => {};

  try {
    const bQuery = query(
      collection(db, 'bulletins'),
      orderBy('createdAtTimestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      bQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: BulletinItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              category: data.category || 'INFO',
              text: data.text || '',
              location: data.location || 'Wilayah Sekitar',
              time: data.time || 'Terkini',
            };
          });
          onUpdate(list);
        } else {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn('[Firebase] Listener bulletins:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Gagal listener bulletins:', err);
    return () => {};
  }
}

/**
 * Tambah pengumuman kilat baru ke Firestore
 */
export async function addBulletinToFirestore(bulletin: BulletinItem): Promise<boolean> {
  if (!db) return false;
  try {
    const ref = doc(db, 'bulletins', bulletin.id);
    await setDoc(ref, {
      ...bulletin,
      createdAtTimestamp: Date.now(),
      createdAtServer: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('[Firebase] Gagal tambah bulletin:', err);
    return false;
  }
}

/**
 * Hapus pengumuman kilat dari Firestore
 */
export async function deleteBulletinFromFirestore(bulletinId: string): Promise<boolean> {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'bulletins', bulletinId));
    return true;
  } catch (err) {
    console.error('[Firebase] Gagal hapus bulletin:', err);
    return false;
  }
}

// ==========================================
// PUSAT LAPORAN WARGA (REPORTS) FIRESTORE
// ==========================================

/**
 * Kirim laporan warga ke Firestore
 */
export async function submitReportToFirestore(report: ReportItem): Promise<boolean> {
  if (!db) return false;
  try {
    const ref = doc(db, 'reports', report.id);
    await setDoc(ref, {
      ...report,
      createdAtServer: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('[Firebase] Gagal kirim laporan:', err);
    return false;
  }
}

/**
 * Berlangganan daftar laporan pelanggaran untuk Admin
 */
export function listenToFirestoreReports(
  onUpdate: (reports: ReportItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) return () => {};

  try {
    const repQuery = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      repQuery,
      (snapshot) => {
        const list: ReportItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            postId: data.postId || '',
            targetUser: data.targetUser || 'Pengguna',
            postText: data.postText || '',
            reason: data.reason || 'Lainnya',
            details: data.details || '',
            reporterName: data.reporterName || 'Warga',
            status: data.status || 'pending',
            createdAt: data.createdAt || Date.now(),
            timeString: data.timeString || 'Baru saja',
          };
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('[Firebase] Listener reports:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Gagal listener reports:', err);
    return () => {};
  }
}

/**
 * Update status laporan (resolved / dismissed)
 */
export async function updateReportStatusInFirestore(
  reportId: string,
  status: 'resolved' | 'dismissed'
): Promise<boolean> {
  if (!db) return false;
  try {
    const ref = doc(db, 'reports', reportId);
    await updateDoc(ref, { status });
    return true;
  } catch (err) {
    console.error('[Firebase] Gagal update status laporan:', err);
    return false;
  }
}

/**
 * Hapus data laporan dari Firestore
 */
export async function deleteReportFromFirestore(reportId: string): Promise<boolean> {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
    return true;
  } catch (err) {
    console.error('[Firebase] Gagal hapus laporan:', err);
    return false;
  }
}

/**
 * Periksa apakah akun Google (berdasarkan Email atau UID) sudah pernah terdaftar di Kareba'Ta
 */
export async function checkRegisteredUser(
  email?: string | null,
  uid?: string | null
): Promise<{ isRegistered: boolean; username: string | null }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUid = (uid || '').trim();

  // 1. Cek cache lokal terlebih dahulu untuk kecepatan instan
  if (cleanEmail) {
    const localCached = localStorage.getItem(`karebata_registered_${cleanEmail}`);
    if (localCached && localCached.trim() && localCached !== 'warga_kareba') {
      return { isRegistered: true, username: localCached.trim().slice(0, 13) };
    }
  }
  if (cleanUid) {
    const localCachedUid = localStorage.getItem(`karebata_custom_username_${cleanUid}`);
    if (localCachedUid && localCachedUid.trim() && localCachedUid !== 'warga_kareba') {
      return { isRegistered: true, username: localCachedUid.trim().slice(0, 13) };
    }
  }

  if (!db) {
    return { isRegistered: false, username: null };
  }

  try {
    // 2. Cek dokumen di Firestore users collection berdasarkan email key
    if (cleanEmail) {
      const emailDocId = 'email_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const emailSnap = await getDoc(doc(db, 'users', emailDocId));
      if (emailSnap.exists()) {
        const d = emailSnap.data();
        const uname = d?.username || d?.userName || d?.displayName;
        if (uname && typeof uname === 'string' && uname.trim() && uname.trim() !== 'warga_kareba') {
          const cleanUname = uname.trim().slice(0, 13);
          localStorage.setItem(`karebata_registered_${cleanEmail}`, cleanUname);
          return { isRegistered: true, username: cleanUname };
        }
      }
    }

    // 3. Cek dokumen di Firestore users collection berdasarkan UID
    if (cleanUid) {
      const uidSnap = await getDoc(doc(db, 'users', cleanUid));
      if (uidSnap.exists()) {
        const d = uidSnap.data();
        const uname = d?.username || d?.userName || d?.displayName;
        if (uname && typeof uname === 'string' && uname.trim() && uname.trim() !== 'warga_kareba') {
          const cleanUname = uname.trim().slice(0, 13);
          if (cleanEmail) localStorage.setItem(`karebata_registered_${cleanEmail}`, cleanUname);
          localStorage.setItem(`karebata_custom_username_${cleanUid}`, cleanUname);
          return { isRegistered: true, username: cleanUname };
        }
      }
    }

    // 4. Query koleksi users jika dokumen email spesifik belum ada
    if (cleanEmail) {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data();
        const uname = d?.username || d?.userName || d?.displayName;
        if (uname && typeof uname === 'string' && uname.trim() && uname.trim() !== 'warga_kareba') {
          const cleanUname = uname.trim().slice(0, 13);
          localStorage.setItem(`karebata_registered_${cleanEmail}`, cleanUname);
          return { isRegistered: true, username: cleanUname };
        }
      }
    }

    return { isRegistered: false, username: null };
  } catch (err) {
    console.warn('[Firebase] Gagal cek status pendaftaran akun:', err);
    return { isRegistered: false, username: null };
  }
}

/**
 * Daftarkan dan simpan profil pengguna baru ke Firestore
 */
export async function saveRegisteredUserProfile(
  uid: string,
  username: string,
  email?: string | null
): Promise<boolean> {
  const cleanUsername = username.trim().replace(/^@/, '').slice(0, 13);
  const cleanEmail = (email || '').trim().toLowerCase();

  // Simpan ke cache lokal
  if (cleanEmail) {
    localStorage.setItem(`karebata_registered_${cleanEmail}`, cleanUsername);
  }
  if (uid) {
    localStorage.setItem(`karebata_custom_username_${uid}`, cleanUsername);
  }
  localStorage.setItem('karebata_username', cleanUsername);

  if (!db) return true;

  try {
    const payload = {
      uid,
      email: cleanEmail,
      username: cleanUsername,
      userName: cleanUsername,
      displayName: cleanUsername,
      updatedAt: serverTimestamp(),
      createdAtServer: serverTimestamp()
    };

    // 1. Simpan di doc(db, 'users', uid)
    if (uid) {
      await setDoc(doc(db, 'users', uid), payload, { merge: true });
    }

    // 2. Simpan juga index berdasarkan email di doc(db, 'users', emailDocId)
    // agar jika user login di HP/browser lain dengan email yang sama, langsung terdeteksi terdaftar!
    if (cleanEmail) {
      const emailDocId = 'email_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'users', emailDocId), payload, { merge: true });
    }

    return true;
  } catch (err) {
    console.error('[Firebase] Gagal simpan pendaftaran pengguna:', err);
    return false;
  }
}

/**
 * Simpan nama profil pengguna warga ke Firestore (kompatibilitas)
 */
export async function saveUserProfile(uid: string, username: string, email?: string): Promise<boolean> {
  return saveRegisteredUserProfile(uid, username, email);
}

/**
 * Ambil nama profil pengguna warga dari Firestore (kompatibilitas)
 */
export async function getUserProfile(uid: string, email?: string): Promise<string | null> {
  const res = await checkRegisteredUser(email, uid);
  return res.username;
}

/**
 * Berlangganan pengaturan bantuan & kontak WhatsApp admin secara real-time
 */
export function listenToHelpSettings(
  onUpdate: (settings: HelpSettings) => void
): () => void {
  // Ambil cache lokal terlebih dahulu agar UI instan tanpa jeda
  try {
    const cached = localStorage.getItem('karebata_help_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      onUpdate({ ...DEFAULT_HELP_SETTINGS, ...parsed });
    } else {
      onUpdate(DEFAULT_HELP_SETTINGS);
    }
  } catch {
    onUpdate(DEFAULT_HELP_SETTINGS);
  }

  if (!db) {
    return () => {};
  }

  try {
    const settingRef = doc(db, 'system_settings', 'help_contact');
    const unsubscribe = onSnapshot(
      settingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let currentWa = data.whatsappNumber || DEFAULT_HELP_SETTINGS.whatsappNumber;
          if (currentWa === "082299887766") currentWa = "085351037179";
          const merged: HelpSettings = {
            whatsappNumber: currentWa,
            whatsappGreeting: data.whatsappGreeting || DEFAULT_HELP_SETTINGS.whatsappGreeting,
            adminName: data.adminName || DEFAULT_HELP_SETTINGS.adminName,
            workingHours: data.workingHours || DEFAULT_HELP_SETTINGS.workingHours,
            helpEmail: data.helpEmail || DEFAULT_HELP_SETTINGS.helpEmail,
            helpInfo: data.helpInfo || DEFAULT_HELP_SETTINGS.helpInfo,
            updatedAt: data.updatedAtServer?.toMillis?.() || data.updatedAt || Date.now(),
          };
          try {
            localStorage.setItem('karebata_help_settings', JSON.stringify(merged));
          } catch {}
          onUpdate(merged);
        } else {
          // Jika dokumen belum dibuat di Firestore, inisialisasi dengan data default
          setDoc(settingRef, {
            ...DEFAULT_HELP_SETTINGS,
            createdAtServer: serverTimestamp(),
            updatedAtServer: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      },
      (error) => {
        console.warn('[Firebase] Catatan: Pengaturan bantuan menggunakan cache lokal:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Error listener help settings:', err);
    return () => {};
  }
}

/**
 * Menyimpan pengaturan bantuan & kontak WhatsApp admin terbaru ke Firestore
 */
export async function saveHelpSettingsToFirestore(
  settings: Partial<HelpSettings>
): Promise<boolean> {
  const merged: HelpSettings = {
    ...DEFAULT_HELP_SETTINGS,
    ...settings,
    updatedAt: Date.now(),
  };

  // Simpan ke cache lokal langsung
  try {
    localStorage.setItem('karebata_help_settings', JSON.stringify(merged));
  } catch {}

  if (!db) {
    return true; // Sukses di cache lokal
  }

  try {
    const settingRef = doc(db, 'system_settings', 'help_contact');
    await setDoc(settingRef, {
      ...merged,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
    console.log('[Firebase] Pengaturan bantuan & WhatsApp berhasil disimpan ke Firestore!');
    return true;
  } catch (error) {
    console.warn('[Firebase] Catatan: Gagal sync ke Firestore (tetap tersimpan di lokal):', error);
    return true;
  }
}

/**
 * STRUKTUR DATA AKUN WARGA YANG DITANGGUHKAN / DIBLOKIR
 */
export interface BannedUser {
  id: string; // Identifier unik dokumen (misal hash/slug email atau username)
  identifier: string; // Target pembanding (username atau email tanpa awalan @)
  userName?: string;
  email?: string;
  reason: string;
  bannedAt: string; // Tanggal pemblokiran format ramah
  timestamp: number;
  bannedBy?: string;
}

/**
 * Normalisasi identifier untuk perbandingan case-insensitive tanpa simbol @
 */
export function normalizeIdentifier(val?: string | null): string {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/^@+/, '');
}

/**
 * Periksa apakah seorang pengguna sedang berstatus ditangguhkan (banned)
 */
export function checkIfUserBanned(
  bannedList: BannedUser[],
  user: { email?: string | null; userName?: string | null; uid?: string | null }
): { isBanned: boolean; banRecord?: BannedUser } {
  if (!bannedList || bannedList.length === 0) {
    return { isBanned: false };
  }

  const normalizedEmail = normalizeIdentifier(user.email);
  const normalizedName = normalizeIdentifier(user.userName);
  const uid = user.uid ? user.uid.trim() : '';

  for (const b of bannedList) {
    const bIdent = normalizeIdentifier(b.identifier);
    const bEmail = normalizeIdentifier(b.email);
    const bName = normalizeIdentifier(b.userName);

    if (
      (normalizedEmail && (bIdent === normalizedEmail || bEmail === normalizedEmail)) ||
      (normalizedName && (bIdent === normalizedName || bName === normalizedName)) ||
      (uid && bIdent === uid)
    ) {
      return { isBanned: true, banRecord: b };
    }
  }

  return { isBanned: false };
}

/**
 * Berlangganan daftar akun yang ditangguhkan secara real-time dari Firestore
 */
export function listenToBannedUsers(
  onUpdate: (bannedUsers: BannedUser[]) => void
): () => void {
  // Ambil cache lokal terlebih dahulu
  try {
    const cached = localStorage.getItem('karebata_banned_users');
    if (cached) {
      const parsed: BannedUser[] = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        onUpdate(parsed);
      }
    }
  } catch {}

  if (!db) {
    return () => {};
  }

  try {
    const settingRef = doc(db, 'system_settings', 'banned_users');
    const unsubscribe = onSnapshot(
      settingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items: BannedUser[] = Array.isArray(data?.items) ? data.items : [];
          try {
            localStorage.setItem('karebata_banned_users', JSON.stringify(items));
          } catch {}
          onUpdate(items);
        } else {
          // Buat dokumen kosong jika belum ada
          setDoc(settingRef, {
            items: [],
            updatedAtServer: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      },
      (error) => {
        console.warn('[Firebase] Catatan: Menggunakan cache lokal untuk akun diblokir:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Error listener banned users:', err);
    return () => {};
  }
}

/**
 * Tangguhkan / Blokir akun warga baru dan sinkronkan ke Firestore
 */
export async function banUserInFirestore(params: {
  identifier: string;
  userName?: string;
  email?: string;
  reason?: string;
  bannedBy?: string;
}): Promise<boolean> {
  const cleanIdent = normalizeIdentifier(params.identifier || params.userName || params.email);
  if (!cleanIdent) return false;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const newBanItem: BannedUser = {
    id: `ban_${cleanIdent.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}`,
    identifier: cleanIdent,
    userName: params.userName ? params.userName.trim().replace(/^@+/, '') : cleanIdent,
    email: params.email ? params.email.trim() : undefined,
    reason: params.reason?.trim() || 'Melanggar aturan komunitas KarebaTa',
    bannedAt: dateStr,
    timestamp: Date.now(),
    bannedBy: params.bannedBy || 'Admin KarebaTa',
  };

  // Update cache lokal
  let currentList: BannedUser[] = [];
  try {
    const cached = localStorage.getItem('karebata_banned_users');
    if (cached) currentList = JSON.parse(cached);
  } catch {}

  // Hindari duplikasi
  const filtered = currentList.filter(
    (b) => normalizeIdentifier(b.identifier) !== cleanIdent &&
           normalizeIdentifier(b.userName) !== cleanIdent &&
           normalizeIdentifier(b.email) !== cleanIdent
  );
  const updatedList = [newBanItem, ...filtered];

  try {
    localStorage.setItem('karebata_banned_users', JSON.stringify(updatedList));
  } catch {}

  if (!db) {
    return true;
  }

  try {
    const settingRef = doc(db, 'system_settings', 'banned_users');
    await setDoc(settingRef, {
      items: updatedList,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firebase] Gagal simpan pemblokiran ke Firestore (tersimpan lokal):', error);
    return true;
  }
}

/**
 * Buka blokir / pulihkan akun warga
 */
export async function unbanUserInFirestore(identifierOrId: string): Promise<boolean> {
  const target = normalizeIdentifier(identifierOrId);
  if (!target) return false;

  let currentList: BannedUser[] = [];
  try {
    const cached = localStorage.getItem('karebata_banned_users');
    if (cached) currentList = JSON.parse(cached);
  } catch {}

  const updatedList = currentList.filter(
    (b) => b.id !== identifierOrId &&
           normalizeIdentifier(b.identifier) !== target &&
           normalizeIdentifier(b.userName) !== target &&
           normalizeIdentifier(b.email) !== target
  );

  try {
    localStorage.setItem('karebata_banned_users', JSON.stringify(updatedList));
  } catch {}

  if (!db) {
    return true;
  }

  try {
    const settingRef = doc(db, 'system_settings', 'banned_users');
    await setDoc(settingRef, {
      items: updatedList,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firebase] Gagal pulihkan blokir di Firestore (tersimpan lokal):', error);
    return true;
  }
}

/**
 * =========================================================
 * FITUR IKLAN BERSPONSOR (MONETISASI FEED WARGA)
 * =========================================================
 */

/**
 * Berlangganan pengaturan iklan bersponsor secara real-time dari Firestore
 */
export function listenToAdSettings(
  onUpdate: (settings: AdSettings) => void
): () => void {
  // Ambil cache lokal terlebih dahulu
  try {
    const cached = localStorage.getItem('karebata_ad_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.isEnabled === 'boolean') {
        onUpdate({ ...DEFAULT_AD_SETTINGS, ...parsed });
      } else {
        onUpdate(DEFAULT_AD_SETTINGS);
      }
    } else {
      onUpdate(DEFAULT_AD_SETTINGS);
    }
  } catch {
    onUpdate(DEFAULT_AD_SETTINGS);
  }

  if (!db) {
    return () => {};
  }

  try {
    const adDocRef = doc(db, 'system_settings', 'sponsor_ads');
    const unsubscribe = onSnapshot(
      adDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const merged: AdSettings = {
            isEnabled: typeof data.isEnabled === 'boolean' ? data.isEnabled : DEFAULT_AD_SETTINGS.isEnabled,
            frequency: typeof data.frequency === 'number' ? data.frequency : DEFAULT_AD_SETTINGS.frequency,
            ads: Array.isArray(data.ads) ? data.ads : DEFAULT_AD_SETTINGS.ads,
            updatedAt: data.updatedAtServer?.toMillis?.() || data.updatedAt || Date.now(),
          };
          try {
            localStorage.setItem('karebata_ad_settings', JSON.stringify(merged));
          } catch {}
          onUpdate(merged);
        } else {
          // Buat dokumen default jika belum ada di Firestore
          setDoc(adDocRef, {
            ...DEFAULT_AD_SETTINGS,
            createdAtServer: serverTimestamp(),
            updatedAtServer: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      },
      (error) => {
        console.warn('[Firebase] Catatan: Pengaturan iklan menggunakan cache lokal:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] Error listener ad settings:', err);
    return () => {};
  }
}

/**
 * Simpan seluruh pengaturan iklan ke Firestore dan LocalStorage
 */
export async function saveAdSettingsToFirestore(
  settings: Partial<AdSettings>
): Promise<boolean> {
  // Ambil current state lokal
  let current: AdSettings = DEFAULT_AD_SETTINGS;
  try {
    const cached = localStorage.getItem('karebata_ad_settings');
    if (cached) current = { ...DEFAULT_AD_SETTINGS, ...JSON.parse(cached) };
  } catch {}

  const merged: AdSettings = {
    ...current,
    ...settings,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem('karebata_ad_settings', JSON.stringify(merged));
  } catch {}

  if (!db) {
    return true;
  }

  try {
    const adDocRef = doc(db, 'system_settings', 'sponsor_ads');
    await setDoc(adDocRef, {
      ...merged,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase] Gagal sync iklan ke Firestore (tersimpan lokal):', err);
    return true;
  }
}

/**
 * Tambah atau Perbarui Iklan Sponsor Tunggal
 */
export async function upsertSponsorAd(ad: SponsorAd): Promise<boolean> {
  let current: AdSettings = DEFAULT_AD_SETTINGS;
  try {
    const cached = localStorage.getItem('karebata_ad_settings');
    if (cached) current = { ...DEFAULT_AD_SETTINGS, ...JSON.parse(cached) };
  } catch {}

  const existingIndex = current.ads.findIndex((a) => a.id === ad.id);
  let updatedAds: SponsorAd[];
  if (existingIndex >= 0) {
    updatedAds = [...current.ads];
    updatedAds[existingIndex] = ad;
  } else {
    updatedAds = [ad, ...current.ads];
  }

  return saveAdSettingsToFirestore({ ads: updatedAds });
}

/**
 * Hapus Iklan Sponsor
 */
export async function deleteSponsorAd(adId: string): Promise<boolean> {
  let current: AdSettings = DEFAULT_AD_SETTINGS;
  try {
    const cached = localStorage.getItem('karebata_ad_settings');
    if (cached) current = { ...DEFAULT_AD_SETTINGS, ...JSON.parse(cached) };
  } catch {}

  const updatedAds = current.ads.filter((a) => a.id !== adId);
  return saveAdSettingsToFirestore({ ads: updatedAds });
}

/**
 * Ubah Status Aktif / Nonaktif Iklan Sponsor
 */
export async function toggleAdActiveStatus(adId: string, isActive: boolean): Promise<boolean> {
  let current: AdSettings = DEFAULT_AD_SETTINGS;
  try {
    const cached = localStorage.getItem('karebata_ad_settings');
    if (cached) current = { ...DEFAULT_AD_SETTINGS, ...JSON.parse(cached) };
  } catch {}

  const updatedAds = current.ads.map((a) => (a.id === adId ? { ...a, isActive } : a));
  return saveAdSettingsToFirestore({ ads: updatedAds });
}

/**
 * =========================================================
 * LAYANAN DASHBOARD ADMIN KHUSUS & KEAMANAN
 * =========================================================
 */

/**
 * Login Admin menggunakan Email dan Password
 */
export async function loginAdminWithEmailPassword(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!auth) {
    return { success: false, error: "Firebase Authentication belum diinisialisasi" };
  }

  // Validasi email harus admin utama
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail !== PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: "Akses Ditolak: Hanya email Admin Utama yang memiliki izin masuk ke Dashboard.",
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    await logAdminActivity("LOGIN", `Admin login dengan email ${cleanEmail}`, cleanEmail);
    return { success: true, user: cred.user };
  } catch (err: any) {
    console.warn("[Firebase] Email/pass login error:", err);
    // Jika user belum dibuat dengan password di Firebase Auth, coba create akun pertama kali
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      try {
        const createRes = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        await logAdminActivity("LOGIN", `Akun password admin pertama kali dibuat untuk ${cleanEmail}`, cleanEmail);
        return { success: true, user: createRes.user };
      } catch (createErr: any) {
        return {
          success: false,
          error: err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
            ? "Password admin salah. Silakan periksa kembali."
            : `Gagal login: ${err.message || "Email atau password tidak cocok"}`,
        };
      }
    }
    return {
      success: false,
      error: err.code === "auth/wrong-password"
        ? "Password admin salah. Silakan periksa kembali."
        : `Gagal login: ${err.message || "Kredensial tidak valid"}`,
    };
  }
}

/**
 * Ganti Password Akun Admin
 */
export async function changeAdminPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth || !auth.currentUser) {
    return { success: false, error: "Sesi Admin tidak aktif. Silakan login kembali." };
  }

  try {
    await updatePassword(auth.currentUser, newPassword);
    await logAdminActivity("SETTINGS_CHANGE", "Password akun Admin utama berhasil diubah", auth.currentUser.email || PRIMARY_ADMIN_EMAIL);
    return { success: true };
  } catch (err: any) {
    console.error("[Firebase] Gagal update password:", err);
    return {
      success: false,
      error: err.code === "auth/requires-recent-login"
        ? "Demi keamanan, silakan logout dan login ulang sebelum mengganti password."
        : err.message || "Gagal mengganti password.",
    };
  }
}

/**
 * Berlangganan Pengaturan Umum Aplikasi & Admin Passcode secara Real-time
 */
export function listenToAdminAppConfig(
  onUpdate: (config: AdminAppConfig) => void
): () => void {
  // Ambil cache lokal
  try {
    const cached = localStorage.getItem("karebata_admin_app_config");
    if (cached) {
      onUpdate({ ...DEFAULT_ADMIN_APP_CONFIG, ...JSON.parse(cached) });
    } else {
      onUpdate(DEFAULT_ADMIN_APP_CONFIG);
    }
  } catch {
    onUpdate(DEFAULT_ADMIN_APP_CONFIG);
  }

  if (!db) return () => {};

  try {
    const docRef = doc(db, "system_settings", "app_config");
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let currentWa = data.adminWhatsapp || DEFAULT_ADMIN_APP_CONFIG.adminWhatsapp;
        if (currentWa === "082299887766") currentWa = "085351037179";
        const merged: AdminAppConfig = {
          appName: data.appName || DEFAULT_ADMIN_APP_CONFIG.appName,
          appLogoUrl: data.appLogoUrl || DEFAULT_ADMIN_APP_CONFIG.appLogoUrl,
          adminEmail: data.adminEmail || DEFAULT_ADMIN_APP_CONFIG.adminEmail,
          adminWhatsapp: currentWa,
          adminWorkingHours: data.adminWorkingHours || DEFAULT_ADMIN_APP_CONFIG.adminWorkingHours || "Setiap Hari: 08.00 - 21.00 WITA",
          privacyPolicyText: data.privacyPolicyText || DEFAULT_ADMIN_APP_CONFIG.privacyPolicyText,
          termsOfServiceText: data.termsOfServiceText || DEFAULT_ADMIN_APP_CONFIG.termsOfServiceText,
          adminPasscode: data.adminPasscode || DEFAULT_ADMIN_APP_CONFIG.adminPasscode,
          updatedAt: data.updatedAtServer?.toMillis?.() || Date.now(),
        };
        try {
          localStorage.setItem("karebata_admin_app_config", JSON.stringify(merged));
        } catch {}
        onUpdate(merged);
      } else {
        // Tulis nilai awal jika belum ada
        setDoc(docRef, {
          ...DEFAULT_ADMIN_APP_CONFIG,
          createdAtServer: serverTimestamp(),
          updatedAtServer: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }
    });
  } catch (err) {
    console.warn("[Firebase] Error listen app config:", err);
    return () => {};
  }
}

/**
 * Simpan Pengaturan Umum Aplikasi & Admin Passcode ke Firestore
 */
export async function saveAdminAppConfig(
  updates: Partial<AdminAppConfig>
): Promise<boolean> {
  let current = DEFAULT_ADMIN_APP_CONFIG;
  try {
    const cached = localStorage.getItem("karebata_admin_app_config");
    if (cached) current = { ...DEFAULT_ADMIN_APP_CONFIG, ...JSON.parse(cached) };
  } catch {}

  const merged: AdminAppConfig = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem("karebata_admin_app_config", JSON.stringify(merged));
  } catch {}

  if (!db) return true;

  try {
    const docRef = doc(db, "system_settings", "app_config");
    await setDoc(docRef, {
      ...merged,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });

    // Sinkronkan nomor WhatsApp dan jam kerja ke help_contact agar konsisten
    if (updates.adminWhatsapp || updates.adminWorkingHours) {
      const helpDoc = doc(db, "system_settings", "help_contact");
      const helpPayload: any = { updatedAtServer: serverTimestamp() };
      if (updates.adminWhatsapp) helpPayload.whatsappNumber = updates.adminWhatsapp;
      if (updates.adminWorkingHours) helpPayload.workingHours = updates.adminWorkingHours;
      await setDoc(helpDoc, helpPayload, { merge: true }).catch(() => {});
    }

    await logAdminActivity("SETTINGS_CHANGE", "Pengaturan aplikasi dan konfigurasi admin diperbarui", current.adminEmail);
    return true;
  } catch (err) {
    console.warn("[Firebase] Gagal simpan app config:", err);
    return true;
  }
}

/**
 * Catat Log Aktivitas Audit Admin
 */
export async function logAdminActivity(
  type: AdminAuditLog["type"],
  description: string,
  adminEmail: string = PRIMARY_ADMIN_EMAIL,
  metadata?: Record<string, any>
): Promise<void> {
  const newLog: AdminAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    description,
    adminEmail,
    timestamp: Date.now(),
    timeString: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  // Simpan lokal
  try {
    const cachedLogs = JSON.parse(localStorage.getItem("karebata_audit_logs") || "[]");
    localStorage.setItem("karebata_audit_logs", JSON.stringify([newLog, ...cachedLogs].slice(0, 100)));
  } catch {}

  if (!db) return;

  try {
    const logDoc = doc(db, "admin_audit_logs", newLog.id);
    await setDoc(logDoc, {
      ...newLog,
      metadata: metadata || {},
      createdAtServer: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[Firebase] Simpan log error:", err);
  }
}

/**
 * Berlangganan Log Aktivitas Audit Admin
 */
export function listenToAdminAuditLogs(
  onUpdate: (logs: AdminAuditLog[]) => void
): () => void {
  // Ambil dari cache lokal terlebih dahulu
  try {
    const cachedLogs = JSON.parse(localStorage.getItem("karebata_audit_logs") || "[]");
    if (Array.isArray(cachedLogs) && cachedLogs.length > 0) {
      onUpdate(cachedLogs);
    }
  } catch {}

  if (!db) return () => {};

  try {
    const logsCol = collection(db, "admin_audit_logs");
    const q = query(logsCol, orderBy("createdAtServer", "desc"), limit(60));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: AdminAuditLog[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            type: data.type || "EDIT_DATA",
            description: data.description || "",
            adminEmail: data.adminEmail || PRIMARY_ADMIN_EMAIL,
            timestamp: data.createdAtServer?.toMillis?.() || data.timestamp || Date.now(),
            timeString: data.timeString || "Baru saja",
          });
        });
        if (list.length > 0) {
          try {
            localStorage.setItem("karebata_audit_logs", JSON.stringify(list));
          } catch {}
          onUpdate(list);
        }
      },
      () => {
        // Fallback ke cache jika permissions error
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Berlangganan Daftar Pengguna (Users)
 */
export function listenToAllUsers(
  onUpdate: (users: UserProfile[]) => void
): () => void {
  // Cache lokal
  try {
    const cached = JSON.parse(localStorage.getItem("karebata_all_users") || "[]");
    if (Array.isArray(cached) && cached.length > 0) {
      onUpdate(cached);
    }
  } catch {}

  if (!db) return () => {};

  try {
    const usersCol = collection(db, "users");
    return onSnapshot(usersCol, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const userName = data.userName || data.name || data.displayName || "warga";
        list.push({
          uid: d.id,
          userName: userName.replace(/^@/, ""),
          email: data.email || `${userName.toLowerCase()}@warga.karebata`,
          displayName: data.displayName || data.name || userName,
          createdAt: data.createdAtServer?.toMillis?.() || data.createdAt || Date.now(),
          status: data.status || "active",
          suspendReason: data.suspendReason,
          suspendedUntil: data.suspendedUntil,
          postCount: data.postCount || 0,
          initial: (userName[0] || "W").toUpperCase(),
        });
      });

      if (list.length > 0) {
        try {
          localStorage.setItem("karebata_all_users", JSON.stringify(list));
        } catch {}
        onUpdate(list);
      }
    });
  } catch {
    return () => {};
  }
}

/**
 * Perbarui Data Pengguna oleh Admin
 */
export async function updateUserByAdmin(
  uid: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  if (!db) return true;
  try {
    const userDoc = doc(db, "users", uid);
    await setDoc(userDoc, {
      ...updates,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });

    await logAdminActivity(
      updates.status === "banned" ? "BAN_USER" : "EDIT_DATA",
      `Admin memperbarui akun pengguna ${updates.userName ? `@${updates.userName}` : uid}`,
      PRIMARY_ADMIN_EMAIL
    );
    return true;
  } catch (err) {
    console.warn("[Firebase] Gagal update user:", err);
    return false;
  }
}

/**
 * Hapus Akun Pengguna oleh Admin
 */
export async function deleteUserByAdmin(uid: string, userName?: string): Promise<boolean> {
  if (!db) return true;
  try {
    const userDoc = doc(db, "users", uid);
    await deleteDoc(userDoc);
    await logAdminActivity("DELETE_DATA", `Admin menghapus permanen akun warga @${userName || uid}`, PRIMARY_ADMIN_EMAIL);
    return true;
  } catch (err) {
    console.warn("[Firebase] Gagal hapus user:", err);
    return false;
  }
}

/**
 * Edit Postingan oleh Admin
 */
export async function updatePostByAdmin(
  postId: string,
  updates: { text?: string; location?: string; category?: string; isHidden?: boolean }
): Promise<boolean> {
  if (!db) return true;
  try {
    const postDoc = doc(db, "posts", postId);
    await updateDoc(postDoc, {
      ...updates,
      updatedAtServer: serverTimestamp(),
    });
    await logAdminActivity("EDIT_DATA", `Admin mengedit isi postingan #${postId}`, PRIMARY_ADMIN_EMAIL);
    return true;
  } catch (err) {
    console.warn("[Firebase] Gagal update post:", err);
    return false;
  }
}

/**
 * Sembunyikan / Pulihkan Postingan di Feed Warga
 */
export async function toggleHidePostInFirestore(
  postId: string,
  isHidden: boolean
): Promise<boolean> {
  if (!db) return true;
  try {
    const postDoc = doc(db, "posts", postId);
    await updateDoc(postDoc, {
      isHidden,
      updatedAtServer: serverTimestamp(),
    });
    await logAdminActivity(
      "EDIT_DATA",
      isHidden ? `Admin menyembunyikan postingan #${postId} dari feed warga` : `Admin memulihkan postingan #${postId} ke feed warga`,
      PRIMARY_ADMIN_EMAIL
    );
    return true;
  } catch (err) {
    console.warn("[Firebase] Gagal toggle hide post:", err);
    return false;
  }
}

/**
 * Update Papan Pengumuman Berjalan oleh Admin
 */
export async function updateBulletinInFirestore(
  bulletinId: string,
  updates: Partial<BulletinItem>
): Promise<boolean> {
  if (!db) return true;
  try {
    const bDoc = doc(db, "bulletins", bulletinId);
    await updateDoc(bDoc, {
      ...updates,
      updatedAtServer: serverTimestamp(),
    });
    await logAdminActivity("EDIT_DATA", `Admin memperbarui pengumuman berjalan #${bulletinId}`, PRIMARY_ADMIN_EMAIL);
    return true;
  } catch (err) {
    console.warn("[Firebase] Gagal update bulletin:", err);
    return false;
  }
}




