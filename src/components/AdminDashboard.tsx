import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  Megaphone,
  BarChart3,
  Settings,
  History,
  LogOut,
  Key,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Plus,
  Phone,
  Mail,
  Globe,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  ToggleLeft,
  ToggleRight,
  Save,
  Filter,
  ArrowUpRight,
  Activity,
  TrendingUp,
  UserX,
  UserCheck,
  Clock,
  Heart,
  MessageCircle,
  HelpCircle,
  Smartphone,
  Laptop,
} from "lucide-react";
import {
  loginAdminWithEmailPassword,
  changeAdminPassword,
  listenToAdminAppConfig,
  saveAdminAppConfig,
  logAdminActivity,
  listenToAdminAuditLogs,
  listenToAllUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
  updatePostByAdmin,
  toggleHidePostInFirestore,
  deletePostFromFirestore,
  listenToFirestoreBulletins,
  addBulletinToFirestore,
  updateBulletinInFirestore,
  deleteBulletinFromFirestore,
  listenToFirestoreReports,
  updateReportStatusInFirestore,
  deleteReportFromFirestore,
  listenToAdSettings,
  saveAdSettingsToFirestore,
  upsertSponsorAd,
  deleteSponsorAd,
  toggleAdActiveStatus,
  subscribeToAuth,
  logoutUser,
  PRIMARY_ADMIN_EMAIL,
  User,
  loginWithGoogle,
  loginAsSimulatedUser,
} from "../services/firebase";
import {
  FeedItem,
  ReportItem,
  SponsorAd,
  AdSettings,
  DEFAULT_AD_SETTINGS,
  UserProfile,
  AdminAuditLog,
  AdminAppConfig,
  DEFAULT_ADMIN_APP_CONFIG,
} from "../types";
import { BulletinItem } from "./RunningTextBar";
import { deleteFromImageKit } from "../services/imagekit";

export type AdminMenuKey =
  | "dashboard"
  | "users"
  | "posts"
  | "reports"
  | "bulletins"
  | "ads"
  | "analytics"
  | "settings"
  | "logs"
  | "logout";

interface AdminDashboardProps {
  feedPosts: FeedItem[];
  onBackToFeed: () => void;
  onPostDeleted?: (postId: string) => void;
  onPreviewPost?: (post: FeedItem) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  feedPosts,
  onBackToFeed,
  onPostDeleted,
  onPreviewPost,
}) => {
  // Sesi Autentikasi Admin
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Verifikasi Kunci Rahasia / Admin Passcode
  const [isPasscodeVerified, setIsPasscodeVerified] = useState<boolean>(() => {
    return sessionStorage.getItem("karebata_admin_passcode_verified") === "true";
  });
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);
  // Form Login Email & Password Admin
  const [loginEmail, setLoginEmail] = useState(PRIMARY_ADMIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Menu Aktif (10 Menu Lengkap)
  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>("dashboard");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Notifikasi Toast Ringkas
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // State Data Firestore Real-time
  const [appConfig, setAppConfig] = useState<AdminAppConfig>(DEFAULT_ADMIN_APP_CONFIG);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [bulletinsList, setBulletinsList] = useState<BulletinItem[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings>(DEFAULT_AD_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // State Fitur Menu 2: Pengguna
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "suspended" | "banned">("all");
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [editUserNameInput, setEditUserNameInput] = useState("");
  const [suspendModalUser, setSuspendModalUser] = useState<UserProfile | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState("Pelanggaran Norma Komunitas");
  const [suspendDurationDays, setSuspendDurationDays] = useState(7);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // State Fitur Menu 3: Postingan
  const [searchPostQuery, setSearchPostQuery] = useState("");
  const [postMediaFilter, setPostMediaFilter] = useState<"all" | "image" | "video" | "hidden">("all");
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<FeedItem | null>(null);
  const [editPostCaption, setEditPostCaption] = useState("");
  const [editPostLocation, setEditPostLocation] = useState("");
  const [editPostCategory, setEditPostCategory] = useState("Kabar Warga");
  const [postToDelete, setPostToDelete] = useState<FeedItem | null>(null);

  // State Fitur Menu 4: Laporan
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "resolved">("pending");

  // State Fitur Menu 5: Papan Pengumuman Berjalan
  const [newBulletinText, setNewBulletinText] = useState("");
  const [newBulletinCategory, setNewBulletinCategory] = useState("INFO RESMI");
  const [newBulletinLocation, setNewBulletinLocation] = useState("Wilayah & Sekitarnya");
  const [editingBulletin, setEditingBulletin] = useState<BulletinItem | null>(null);

  // State Fitur Menu 6: Iklan
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<SponsorAd | null>(null);
  const [adFormTitle, setAdFormTitle] = useState("");
  const [adFormAdvertiser, setAdFormAdvertiser] = useState("");
  const [adFormDesc, setAdFormDesc] = useState("");
  const [adFormImg, setAdFormImg] = useState("");
  const [adFormActionType, setAdFormActionType] = useState<"whatsapp" | "link">("whatsapp");
  const [adFormTarget, setAdFormTarget] = useState("");
  const [adFormBtnText, setAdFormBtnText] = useState("Pesan via WhatsApp");
  const [adFormLocation, setAdFormLocation] = useState("Wilayah & Sekitarnya");
  const [adFormExpiry, setAdFormExpiry] = useState("Aktif Selamanya");

  // State Fitur Menu 8: Pengaturan & Ganti Password / Passcode
  const [settingsAppName, setSettingsAppName] = useState(appConfig.appName);
  const [settingsEmail, setSettingsEmail] = useState(appConfig.adminEmail);
  const [settingsWhatsapp, setSettingsWhatsapp] = useState(appConfig.adminWhatsapp);
  const [settingsWorkingHours, setSettingsWorkingHours] = useState(appConfig.adminWorkingHours || "Setiap Hari: 08.00 - 21.00 WITA");
  const [settingsPrivacy, setSettingsPrivacy] = useState(appConfig.privacyPolicyText);
  const [settingsTerms, setSettingsTerms] = useState(appConfig.termsOfServiceText);
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // State Dialog Konfirmasi Kustom (Menggantikan confirm bawaan browser)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Pantau Autentikasi Pengguna
  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Berlangganan Firestore Realtime Saat Passcode Terverifikasi
  useEffect(() => {
    if (!isPasscodeVerified) return;

    const unsubConfig = listenToAdminAppConfig((cfg) => {
      setAppConfig(cfg);
      setSettingsAppName(cfg.appName);
      setSettingsEmail(cfg.adminEmail);
      setSettingsWhatsapp(cfg.adminWhatsapp);
      setSettingsWorkingHours(cfg.adminWorkingHours || "Setiap Hari: 08.00 - 21.00 WITA");
      setSettingsPrivacy(cfg.privacyPolicyText);
      setSettingsTerms(cfg.termsOfServiceText);
    });

    const unsubUsers = listenToAllUsers((users) => setUsersList(users));
    const unsubReports = listenToFirestoreReports((reps) => setReportsList(reps));
    const unsubBulletins = listenToFirestoreBulletins((buls) => setBulletinsList(buls));
    const unsubAds = listenToAdSettings((ads) => setAdSettings(ads));
    const unsubLogs = listenToAdminAuditLogs((logs) => setAuditLogs(logs));

    return () => {
      unsubConfig();
      unsubUsers();
      unsubReports();
      unsubBulletins();
      unsubAds();
      unsubLogs();
    };
  }, [isPasscodeVerified]);

  // Cek apakah pengguna saat ini berhak masuk (Hanya 1 Akun Admin Utama)
  const isEmailAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  }, [currentUser]);

  // Handler Login Email & Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await loginAdminWithEmailPassword(loginEmail, loginPassword);
      if (!res.success) {
        setLoginError(res.error || "Gagal masuk ke akun Admin.");
      } else {
        showToast("Login akun Admin berhasil! Masukkan Admin Passcode.");
      }
    } catch {
      setLoginError("Terjadi kendala saat login. Periksa koneksi internet Anda.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handler Verifikasi Admin Passcode (PIN Rahasia Tambahan)
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    const validPasscode = appConfig.adminPasscode || "12345";

    if (passcodeInput.trim() === validPasscode.trim()) {
      sessionStorage.setItem("karebata_admin_passcode_verified", "true");
      setIsPasscodeVerified(true);
      setPasscodeInput("");
      showToast("Autentikasi 2-Lapis Berhasil. Selamat datang di Dasbor Admin!");
      logAdminActivity("LOGIN", `Admin terverifikasi dengan Passcode Rahasia`, currentUser?.email || PRIMARY_ADMIN_EMAIL);
    } else {
      setPasscodeError("Admin Passcode salah! Akses ditolak.");
    }
  };

  // Handler Logout
  const handleLogout = async () => {
    sessionStorage.removeItem("karebata_admin_passcode_verified");
    setIsPasscodeVerified(false);
    await logAdminActivity("LOGOUT", "Admin keluar dari Dashboard", currentUser?.email || PRIMARY_ADMIN_EMAIL);
    await logoutUser();
    showToast("Anda telah keluar dari Dashboard Admin.");
    onBackToFeed();
  };

  // 1. DATA AGREGASI DASHBOARD (MENU 1)
  const totalUsersCount = useMemo(() => {
    const fromPosts = new Set(feedPosts.map((p) => p.user || p.name).filter(Boolean));
    return Math.max(usersList.length, fromPosts.size, 1);
  }, [usersList, feedPosts]);

  const totalViewsCount = useMemo(() => {
    return feedPosts.reduce((acc, p) => acc + (p.views || 0), 0);
  }, [feedPosts]);

  const totalLikesCount = useMemo(() => {
    return feedPosts.reduce((acc, p) => acc + (p.like || 0), 0);
  }, [feedPosts]);

  const pendingReportsCount = useMemo(() => {
    return reportsList.filter((r) => r.status === "pending").length;
  }, [reportsList]);

  // JIKA BELUM LOGIN ATAU PASSCODE BELUM TERVERIFIKASI
  if (!currentUser || !isEmailAdmin || !isPasscodeVerified) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="fixed top-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Logo & Judul Dashboard */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-950 border border-emerald-400/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Dashboard Admin Kareba'Ta
            </h1>
            <p className="text-xs text-slate-400">
              Portal Pengelolaan & Moderasi Khusus Pengelola Utama
            </p>
          </div>

          {/* PERINGATAN JIKA PENGGUNA BIASA MENCOBA MASUK */}
          {currentUser && !isEmailAdmin && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl space-y-2 text-center">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <h3 className="font-bold text-sm text-rose-200">Akses Ditolak</h3>
              <p className="text-xs text-rose-300 leading-relaxed">
                Akun Google Anda (<b>{currentUser.email}</b>) bukan merupakan Admin Utama Kareba'Ta. Pengguna biasa tidak memiliki izin mengakses halaman ini.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    setCurrentUser(null);
                  }}
                  className="px-4 py-1.5 bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Ganti Akun Admin
                </button>
                <button
                  type="button"
                  onClick={onBackToFeed}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          )}

          {/* LANGKAH 1: FORM LOGIN EMAIL & PASSWORD ADMIN */}
          {(!currentUser || !isEmailAdmin) && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Email Admin Utama
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="iditona5@gmail.com"
                    className="w-full bg-[#080D1A] border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Password Admin
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan password admin..."
                    className="w-full bg-[#080D1A] border border-slate-700 rounded-xl py-2.5 pl-9 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoggingIn ? "Memverifikasi Kredensial..." : "Masuk ke Akun Admin"}</span>
              </button>

              <div className="relative flex items-center justify-center my-1.5">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0F172A] px-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">atau</span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsLoggingIn(true);
                  try {
                    const res = await loginWithGoogle();
                    if (!res.user && res.error?.includes("auth/unauthorized-domain")) {
                      loginAsSimulatedUser(PRIMARY_ADMIN_EMAIL);
                    }
                  } catch {
                    loginAsSimulatedUser(PRIMARY_ADMIN_EMAIL);
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
                disabled={isLoggingIn}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer active:scale-98 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Masuk Cepat dengan Akun Google ({PRIMARY_ADMIN_EMAIL})</span>
              </button>
            </form>
          )}

          {/* LANGKAH 2: FORM ADMIN PASSCODE (KUNCI RAHASIA TAMBAHAN) */}
          {currentUser && isEmailAdmin && !isPasscodeVerified && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4 animate-fade-in">
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ADM
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentUser.email}</p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Akun Admin Terverifikasi</span>
                  </p>
                </div>
              </div>

              {passcodeError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Admin Passcode (Kunci Rahasia Tambahan)
                  </label>
                  <span className="text-[10px] text-slate-400">PIN 6-digit</span>
                </div>
                <div className="relative">
  <input
    type={showPasscode ? "text" : "password"}
    required
    maxLength={10}
    autoFocus
    value={passcodeInput}
    onChange={(e) => setPasscodeInput(e.target.value)}
    placeholder="Masukkan Passcode Rahasia..."
    className="w-full bg-[#080D1A] border border-slate-700 rounded-xl py-3 pl-10 pr-12 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 outline-none"
  />
  <Key className="w-4 h-4 text-amber-400 absolute left-3 top-3.5" />
  <button
    type="button"
    onClick={() => setShowPasscode(!showPasscode)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
  >
    {showPasscode ? (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.59 9.59 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
    ) : (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    )}
  </button>
</div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Passcode dapat diubah kapan saja di menu Pengaturan Dashboard.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-950 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Buka Akses Dashboard Admin</span>
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    setCurrentUser(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Keluar dari Sesi
                </button>
              </div>
            </form>
          )}

          {/* Tombol Balik ke Aplikasi Pengguna */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToFeed}
              className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <span>Kembali ke Aplikasi Kabar Warga</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN DASHBOARD ADMIN LENGKAP (10 MENU MATERIAL 3)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-emerald-500 selection:text-white">
      {/* Toast Notifikasi */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* SIDEBAR NAVIGATION DRAWER (MATERIAL 3) */}
      {/* ================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isMobileDrawerOpen ? "translate-x-0" : "-translate-x-0 max-lg:-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-950">
                K
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-white tracking-tight">
                  Kareba'Ta Admin
                </h2>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                  Panel Pengelola
                </span>
              </div>
            </div>
            {/* Tutup Drawer di HP */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10 Menu List Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("dashboard");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "dashboard"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="flex-1 text-left">1. Dashboard</span>
          </button>

          {/* 2. Pengguna */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("users");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "users"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>2. Pengguna</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {totalUsersCount}
            </span>
          </button>

          {/* 3. Postingan */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("posts");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "posts"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>3. Postingan</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {feedPosts.length}
            </span>
          </button>

          {/* 4. Laporan */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("reports");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "reports"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4" />
              <span>4. Laporan</span>
            </div>
            {pendingReportsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold animate-pulse">
                {pendingReportsCount}
              </span>
            )}
          </button>

          {/* 5. Papan Pengumuman Berjalan */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("bulletins");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "bulletins"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <Megaphone className="w-4 h-4" />
              <span>5. Teks Berjalan</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {bulletinsList.length}
            </span>
          </button>

          {/* 6. Iklan */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("ads");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "ads"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>6. Iklan Sponsor</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {adSettings.ads.filter((a) => a.isActive).length} Aktif
            </span>
          </button>

          {/* 7. Analitik */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("analytics");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "analytics"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="flex-1 text-left">7. Analitik</span>
          </button>

          {/* 8. Pengaturan */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("settings");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "settings"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="flex-1 text-left">8. Pengaturan</span>
          </button>

          {/* 9. Log Aktivitas */}
          <button
            type="button"
            onClick={() => {
              setActiveMenu("logs");
              setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeMenu === "logs"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <History className="w-4 h-4" />
              <span>9. Log Aktivitas</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {auditLogs.length}
            </span>
          </button>

          {/* 10. Keluar */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="flex-1 text-left">10. Keluar</span>
          </button>
        </nav>

        {/* Profil Admin Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0A0F1D]">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.email}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">Admin Utama</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white capitalize">
                {activeMenu === "dashboard" && "1. Dashboard & Ikhtisar Aplikasi"}
                {activeMenu === "users" && "2. Manajemen Pengguna & Akun Warga"}
                {activeMenu === "posts" && "3. Moderasi Postingan & Kabar Warga"}
                {activeMenu === "reports" && "4. Laporan Pelanggaran Warga"}
                {activeMenu === "bulletins" && "5. Papan Teks Pengumuman Berjalan"}
                {activeMenu === "ads" && "6. Iklan Bersponsor & Monetisasi"}
                {activeMenu === "analytics" && "7. Analitik & Statistik Penggunaan"}
                {activeMenu === "settings" && "8. Pengaturan Aplikasi & Kunci Admin"}
                {activeMenu === "logs" && "9. Log Aktivitas Audit Pengelola"}
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Kareba'Ta Cloud Database &bull; Realtime Sync Aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToFeed}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Lihat Aplikasi Warga</span>
            </button>
          </div>
        </header>

        {/* Konten Halaman Sesuai Menu Aktif */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* =============================================================== */}
          {/* MENU 1: DASHBOARD */}
          {/* =============================================================== */}
          {activeMenu === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* Kartu Statistik Utama Material 3 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* 1. Pengguna */}
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">Total Pengguna</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{totalUsersCount}</h3>
                </div>

                {/* 2. Postingan */}
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">Total Postingan</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{feedPosts.length}</h3>
                </div>

                {/* 3. Views */}
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
                    <Eye className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">Total Dilihat</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{totalViewsCount}</h3>
                </div>

                {/* 4. Suka */}
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
                    <Heart className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">Total Suka</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{totalLikesCount}</h3>
                </div>

                {/* 5. Laporan */}
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">Laporan Masuk</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{pendingReportsCount}</h3>
                </div>

                {/* 6. Iklan Aktif */}
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-2">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">Iklan Tayang</p>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {adSettings.ads.filter((a) => a.isActive).length}
                  </h3>
                </div>
              </div>

              {/* Seksi Postingan Terbaru Warga */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Postingan Terkini di Beranda Warga</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveMenu("posts")}
                    className="text-xs font-bold text-emerald-400 hover:underline"
                  >
                    Kelola Semua Postingan &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {feedPosts.slice(0, 6).map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#080D1A] border border-slate-800/80 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {(post.user || post.name || "W")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            @{post.user || post.name || "warga"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{post.location || post.time}</p>
                        </div>
                        {post.isHidden && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                            Disembunyikan
                          </span>
                        )}
                      </div>

                      {post.img && (
                        <div className="h-32 rounded-xl overflow-hidden bg-black/40">
                          <img
                            src={post.thumbnail || post.img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {post.text || "Tanpa teks"}
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>👁️ {post.views || 0} tayang</span>
                        <span>❤️ {post.like || 0} suka</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 2: PENGGUNA */}
          {/* =============================================================== */}
          {activeMenu === "users" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Pencarian Pengguna */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      placeholder="Cari nama atau username pengguna..."
                      className="w-full bg-[#080D1A] border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>

                  {/* Filter Status Akun */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {(["all", "active", "suspended", "banned"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setUserStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer whitespace-nowrap ${
                          userStatusFilter === st
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {st === "all" ? "Semua Status" : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabel / Kartu Daftar Pengguna */}
                <div className="space-y-2.5">
                  {feedPosts
                    .map((p) => ({
                      userName: (p.user || p.name || "warga").replace(/^@/, ""),
                      email: p.email || `${(p.user || "warga").toLowerCase()}@warga.karebata`,
                      initial: (p.user || p.name || "W")[0].toUpperCase(),
                    }))
                    .filter((u, idx, arr) => arr.findIndex((x) => x.userName === u.userName) === idx)
                    .filter((u) => {
                      if (!searchUserQuery.trim()) return true;
                      return (
                        u.userName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
                      );
                    })
                    .map((user) => (
                      <div
                        key={user.userName}
                        className="bg-[#080D1A] border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {user.initial}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">@{user.userName}</h4>
                            <p className="text-[11px] text-slate-400">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForEdit({
                                uid: user.userName,
                                userName: user.userName,
                                email: user.email,
                                createdAt: Date.now(),
                                status: "active",
                                initial: user.initial,
                              });
                              setEditUserNameInput(user.userName);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Edit Nama</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSuspendModalUser({
                                uid: user.userName,
                                userName: user.userName,
                                email: user.email,
                                createdAt: Date.now(),
                                status: "suspended",
                                initial: user.initial,
                              });
                            }}
                            className="px-3 py-1.5 bg-amber-950/60 border border-amber-800/80 hover:bg-amber-900 text-amber-300 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: "Blokir Akun Pengguna",
                                message: `Yakin ingin memblokir akun @${user.userName}? Akun tidak akan dapat memposting lagi.`,
                                onConfirm: async () => {
                                  await updateUserByAdmin(user.userName, { status: "banned" });
                                  showToast(`Akun @${user.userName} berhasil diblokir.`);
                                  setConfirmDialog(null);
                                },
                              });
                            }}
                            className="px-3 py-1.5 bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Blokir
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* MODAL EDIT NAMA PENGGUNA */}
              {selectedUserForEdit && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-sm p-5 space-y-4">
                    <h3 className="text-sm font-black text-white">Edit Nama Pengguna</h3>
                    <input
                      type="text"
                      value={editUserNameInput}
                      onChange={(e) => setEditUserNameInput(e.target.value)}
                      placeholder="Masukkan nama pengguna baru..."
                      className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForEdit(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const clean = editUserNameInput.trim().replace(/^@/, "");
                          if (clean) {
                            await updateUserByAdmin(selectedUserForEdit.uid, { userName: clean });
                            showToast(`Nama pengguna diubah menjadi @${clean}`);
                            setSelectedUserForEdit(null);
                          }
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 3: POSTINGAN */}
          {/* =============================================================== */}
          {activeMenu === "posts" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchPostQuery}
                      onChange={(e) => setSearchPostQuery(e.target.value)}
                      placeholder="Cari postingan, caption, lokasi, atau penulis..."
                      className="w-full bg-[#080D1A] border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {(["all", "image", "video", "hidden"] as const).map((med) => (
                      <button
                        key={med}
                        type="button"
                        onClick={() => setPostMediaFilter(med)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer whitespace-nowrap ${
                          postMediaFilter === med
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {med === "all" ? "Semua Media" : med}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedPosts
                    .filter((p) => {
                      if (!searchPostQuery.trim()) return true;
                      const q = searchPostQuery.toLowerCase();
                      return (
                        p.text?.toLowerCase().includes(q) ||
                        p.location?.toLowerCase().includes(q) ||
                        p.user?.toLowerCase().includes(q)
                      );
                    })
                    .map((post) => (
                      <div
                        key={post.id}
                        className="bg-[#080D1A] border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-white truncate">
                              @{post.user || post.name || "warga"}
                            </span>
                            <span className="text-[10px] text-slate-500">&bull; {post.time}</span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              post.isHidden
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {post.isHidden ? "Tersembunyi" : "Aktif di Beranda"}
                          </span>
                        </div>

                        {post.img && (
                          <div className="h-44 rounded-xl overflow-hidden bg-black/40 relative">
                            <img
                              src={post.thumbnail || post.img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {post.mediaType === "video" && (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                                Video
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                          {post.text || "Tanpa teks"}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>👁️ {post.views || 0}</span>
                            <span>❤️ {post.like || 0}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Tombol Sembunyikan / Pulihkan */}
                            <button
                              type="button"
                              onClick={async () => {
                                await toggleHidePostInFirestore(post.id, !post.isHidden);
                                showToast(
                                  post.isHidden
                                    ? "Postingan dipulihkan ke beranda warga."
                                    : "Postingan disembunyikan dari beranda."
                                );
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                            >
                              {post.isHidden ? "Pulihkan" : "Sembunyikan"}
                            </button>

                            {/* Tombol Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPostForEdit(post);
                                setEditPostCaption(post.text || "");
                                setEditPostLocation(post.location || "");
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition"
                              aria-label="Edit Postingan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: "Hapus Postingan Permanen",
                                  message: "Yakin ingin menghapus postingan ini secara permanen dari server?",
                                  onConfirm: async () => {
                                    await deletePostFromFirestore(post.id);
                                    if (post.fileId) await deleteFromImageKit(post.fileId);
                                    showToast("Postingan berhasil dihapus permanen.");
                                    setConfirmDialog(null);
                                  },
                                });
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg transition"
                              aria-label="Hapus Postingan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* MODAL EDIT POSTINGAN */}
              {selectedPostForEdit && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-md p-5 space-y-4">
                    <h3 className="text-sm font-black text-white">Edit Postingan Warga</h3>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Isi Teks / Berita</label>
                      <textarea
                        rows={3}
                        value={editPostCaption}
                        onChange={(e) => setEditPostCaption(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Lokasi</label>
                      <input
                        type="text"
                        value={editPostLocation}
                        onChange={(e) => setEditPostLocation(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPostForEdit(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await updatePostByAdmin(selectedPostForEdit.id, {
                            text: editPostCaption.trim(),
                            location: editPostLocation.trim(),
                          });
                          showToast("Postingan berhasil diperbarui.");
                          setSelectedPostForEdit(null);
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 4: LAPORAN */}
          {/* =============================================================== */}
          {activeMenu === "reports" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Laporan Pelanggaran Komunitas Warga</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {(["all", "pending", "resolved"] as const).map((rf) => (
                      <button
                        key={rf}
                        type="button"
                        onClick={() => setReportFilter(rf)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                          reportFilter === rf
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {rf === "all" ? "Semua" : rf === "pending" ? "Menunggu" : "Selesai"}
                      </button>
                    ))}
                  </div>
                </div>

                {reportsList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white">Tidak Ada Laporan Pelanggaran</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Komunitas Kareba'Ta saat ini kondusif dan tertib.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportsList
                      .filter((r) => (reportFilter === "all" ? true : r.status === reportFilter))
                      .map((report) => (
                        <div
                          key={report.id}
                          className="bg-[#080D1A] border border-slate-800 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-rose-400 uppercase tracking-wide">
                              ⚠️ {report.reason}
                            </span>
                            <span className="text-[10px] text-slate-500">{report.timeString}</span>
                          </div>

                          <p className="text-xs text-slate-300">
                            Target Pengguna: <b>@{report.targetUser}</b>
                          </p>

                          {report.postText && (
                            <blockquote className="p-3 bg-black/40 border-l-2 border-amber-400 text-xs text-slate-300 italic rounded-r-xl">
                              "{report.postText}"
                            </blockquote>
                          )}

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                report.status === "resolved"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              Status: {report.status === "resolved" ? "Selesai Ditinjau" : "Menunggu Aksi"}
                            </span>

                            <div className="flex items-center gap-2">
                              {report.status !== "resolved" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateReportStatusInFirestore(report.id, "resolved");
                                    showToast("Laporan ditandai selesai.");
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                                >
                                  Tandai Selesai
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    title: "Hapus Postingan Pelanggaran",
                                    message: "Hapus postingan yang dilaporkan ini secara permanen?",
                                    onConfirm: async () => {
                                      await deletePostFromFirestore(report.postId);
                                      await updateReportStatusInFirestore(report.id, "resolved");
                                      showToast("Postingan pelanggar berhasil dihapus.");
                                      setConfirmDialog(null);
                                    },
                                  });
                                }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition"
                              >
                                Hapus Postingan
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 5: PAPAN PENGUMUMAN BERJALAN */}
          {/* =============================================================== */}
          {activeMenu === "bulletins" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-emerald-400" />
                    <span>Kelola Teks Pengumuman Berjalan</span>
                  </h3>
                </div>

                {/* Form Tambah Pengumuman */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBulletinText.trim()) return;
                    await addBulletinToFirestore({
                      id: `bulletin-${Date.now()}`,
                      text: newBulletinText.trim(),
                      category: newBulletinCategory,
                      location: newBulletinLocation,
                    });
                    setNewBulletinText("");
                    showToast("Teks pengumuman berjalan berhasil diterbitkan!");
                  }}
                  className="bg-[#080D1A] border border-slate-800 p-4 rounded-2xl space-y-3"
                >
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Isi Teks Pengumuman *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBulletinText}
                      onChange={(e) => setNewBulletinText(e.target.value)}
                      placeholder="Contoh: Info Pemadaman Bergilir PLN..."
                      className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Kategori</label>
                      <select
                        value={newBulletinCategory}
                        onChange={(e) => setNewBulletinCategory(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="INFO RESMI">INFO RESMI</option>
                        <option value="PERINGATAN">PERINGATAN</option>
                        <option value="LALU LINTAS">LALU LINTAS</option>
                        <option value="CUACA BMKG">CUACA BMKG</option>
                        <option value="PENGUMUMAN">PENGUMUMAN</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Lokasi</label>
                      <input
                        type="text"
                        value={newBulletinLocation}
                        onChange={(e) => setNewBulletinLocation(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    + Terbitkan Pengumuman Realtime
                  </button>
                </form>

                {/* Daftar Pengumuman Tersimpan */}
                <div className="space-y-2 pt-2">
                  {bulletinsList.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#080D1A] border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {item.category}
                        </span>
                        <p className="text-xs font-semibold text-white mt-1 leading-snug">
                          {item.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteBulletinFromFirestore(item.id);
                          showToast("Pengumuman berhasil dihapus.");
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 6: IKLAN */}
          {/* =============================================================== */}
          {activeMenu === "ads" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>Manajemen Slot Iklan Bersponsor</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Iklan muncul di sela beranda kabar warga dengan tombol langsung ke WhatsApp toko.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAd(null);
                      setAdFormTitle("");
                      setAdFormAdvertiser("");
                      setAdFormDesc("");
                      setAdFormImg("https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80");
                      setAdFormTarget(appConfig.adminWhatsapp || "085351037179");
                      setIsAdModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition"
                  >
                    + Pasang Iklan Baru
                  </button>
                </div>

                {/* Saklar Global & Frekuensi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#080D1A] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Status Iklan di Beranda</p>
                      <p className="text-[11px] text-slate-400">
                        {adSettings.isEnabled ? "Aktif tampil di HP warga" : "Nonaktif (disembunyikan)"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await saveAdSettingsToFirestore({ isEnabled: !adSettings.isEnabled });
                        showToast(
                          !adSettings.isEnabled
                            ? "Iklan di beranda warga diaktifkan."
                            : "Iklan di beranda warga dinonaktifkan."
                        );
                      }}
                      className="cursor-pointer"
                    >
                      {adSettings.isEnabled ? (
                        <ToggleRight className="w-10 h-10 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="bg-[#080D1A] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Frekuensi Tayang</p>
                      <p className="text-[11px] text-slate-400">Tampil setiap berapa kabar?</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[3, 4, 5, 7].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={async () => {
                            await saveAdSettingsToFirestore({ frequency: num });
                            showToast(`Frekuensi diubah: 1 iklan tiap ${num} kabar`);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            adSettings.frequency === num
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          Tiap {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daftar Banner Iklan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {adSettings.ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="bg-[#080D1A] border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div className="h-40 bg-black/50 overflow-hidden relative">
                        {ad.imageUrl && (
                          <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                          {ad.badgeText || "Bersponsor"}
                        </span>
                      </div>

                      <div className="p-4 space-y-1 flex-1">
                        <h4 className="text-xs font-bold text-white">{ad.title}</h4>
                        <p className="text-xs text-amber-400 font-semibold">{ad.advertiserName}</p>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={async () => {
                            await toggleAdActiveStatus(ad.id, !ad.isActive);
                            showToast(!ad.isActive ? "Iklan diaktifkan." : "Iklan dijeda.");
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            ad.isActive
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}
                        >
                          {ad.isActive ? "Jeda Iklan" : "Aktifkan"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: "Hapus Iklan Sponsor",
                              message: "Yakin ingin menghapus spanduk iklan sponsor ini?",
                              onConfirm: async () => {
                                await deleteSponsorAd(ad.id);
                                showToast("Iklan berhasil dihapus.");
                                setConfirmDialog(null);
                              },
                            });
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODAL TAMBAH / EDIT IKLAN */}
              {isAdModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-8">
                    <h3 className="text-sm font-black text-white">
                      {editingAd ? "Edit Iklan Sponsor" : "Pasang Iklan Sponsor Baru"}
                    </h3>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const adToSave: SponsorAd = {
                          id: editingAd?.id || `ad-${Date.now()}`,
                          title: adFormTitle.trim(),
                          advertiserName: adFormAdvertiser.trim(),
                          badgeText: "Iklan Bersponsor",
                          description: adFormDesc.trim(),
                          imageUrl: adFormImg.trim(),
                          actionType: adFormActionType,
                          actionTarget: adFormTarget.trim(),
                          actionButtonText: adFormBtnText.trim(),
                          location: adFormLocation.trim(),
                          expiryDate: adFormExpiry.trim(),
                          isActive: true,
                          createdAt: editingAd?.createdAt || Date.now(),
                        };
                        await upsertSponsorAd(adToSave);
                        showToast("Iklan sponsor berhasil disimpan!");
                        setIsAdModalOpen(false);
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Judul Promosi *</label>
                        <input
                          type="text"
                          required
                          value={adFormTitle}
                          onChange={(e) => setAdFormTitle(e.target.value)}
                          placeholder="Diskon 20% Kopi Arabika Sulteng"
                          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Nama Toko / Usaha *</label>
                        <input
                          type="text"
                          required
                          value={adFormAdvertiser}
                          onChange={(e) => setAdFormAdvertiser(e.target.value)}
                          placeholder="Warkop Sudirman & Roastery"
                          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">Deskripsi Promosi *</label>
                        <textarea
                          rows={2}
                          required
                          value={adFormDesc}
                          onChange={(e) => setAdFormDesc(e.target.value)}
                          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">URL Poster / Banner</label>
                        <input
                          type="url"
                          value={adFormImg}
                          onChange={(e) => setAdFormImg(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-300 block mb-1">Nomor WhatsApp *</label>
                          <input
                            type="text"
                            required
                            value={adFormTarget}
                            onChange={(e) => setAdFormTarget(e.target.value)}
                            placeholder="081234567890"
                            className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 block mb-1">Teks Tombol</label>
                          <input
                            type="text"
                            value={adFormBtnText}
                            onChange={(e) => setAdFormBtnText(e.target.value)}
                            placeholder="Pesan via WhatsApp"
                            className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsAdModalOpen(false)}
                          className="px-4 py-2 text-xs text-slate-400"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl"
                        >
                          Simpan Iklan
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 7: ANALITIK */}
          {/* =============================================================== */}
          {activeMenu === "analytics" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pertumbuhan Warga & Aktivitas */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Statistik Pertumbuhan Komunitas</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Total Akun Terdaftar</span>
                        <span className="font-bold text-white">{totalUsersCount}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Rasio Interaksi (Likes / Views)</span>
                        <span className="font-bold text-white">
                          {totalViewsCount > 0
                            ? Math.round((totalLikesCount / totalViewsCount) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="w-[45%] h-full bg-indigo-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Perangkat Pengguna */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-sky-400" />
                    <span>Distribusi Perangkat Pengguna</span>
                  </h3>
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between p-3 bg-[#080D1A] rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Smartphone (Android & iOS)</p>
                          <p className="text-[10px] text-slate-400">PWA & Browser Mobile</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-400">92%</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#080D1A] rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-indigo-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Laptop & Komputer Desktop</p>
                          <p className="text-[10px] text-slate-400">Web Browser</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-indigo-400">8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 8: PENGATURAN */}
          {/* =============================================================== */}
          {activeMenu === "settings" && (
            <div className="space-y-6 animate-fade-in">
              {/* KARTU KHUSUS: PENGATURAN NOMOR WHATSAPP & JAM RESPON ADMIN */}
              <div className="bg-gradient-to-r from-[#0F172A] via-[#111C35] to-[#0F172A] border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-[#25D366] border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white">
                          Pengaturan Kontak WhatsApp & Jam Respon Admin
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          Aktif Real-time
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pengaturan ini langsung tersinkronisasi ke tombol <b>Layanan Pasang Iklan Sponsor</b> di aplikasi warga.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-[#080D1A] px-4 py-2 rounded-2xl border border-slate-700 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400">Nomor Saat Ini:</span>
                    <span className="font-mono text-sm sm:text-base font-black text-[#25D366] tracking-wider select-all">
                      {appConfig.adminWhatsapp || "085351037179"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Input Nomor WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nomor WhatsApp Admin (Tujuan Chat Iklan & Layanan)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={settingsWhatsapp}
                        onChange={(e) => setSettingsWhatsapp(e.target.value)}
                        placeholder="Contoh: 081234567890 atau 6281234567890..."
                        className="w-full bg-[#080D1A] border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Input Jam Respon Admin */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jam Respon Admin (Ditampilkan di Halaman Iklan)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={settingsWorkingHours}
                        onChange={(e) => setSettingsWorkingHours(e.target.value)}
                        placeholder="Contoh: Setiap Hari: 08.00 - 21.00 WITA..."
                        className="w-full bg-[#080D1A] border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      const digits = settingsWhatsapp.replace(/\D/g, "");
                      const intl = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
                      window.open(`https://wa.me/${intl}`, "_blank");
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                    aria-label="Tes Tautan WhatsApp"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Tes Tautan WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const cleanWa = settingsWhatsapp.trim();
                      const cleanHours = settingsWorkingHours.trim() || "Setiap Hari: 08.00 - 21.00 WITA";
                      if (cleanWa.length < 8) {
                        showToast("Nomor WhatsApp terlalu pendek (minimal 8 digit).");
                        return;
                      }
                      await saveAdminAppConfig({
                        adminWhatsapp: cleanWa,
                        adminWorkingHours: cleanHours,
                      });
                      showToast(`Pengaturan WhatsApp (${cleanWa}) & Jam Respon berhasil diperbarui!`);
                    }}
                    className="px-6 py-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan WhatsApp & Jam Respon</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Pengaturan Identitas Aplikasi & Kontak */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span>Identitas Aplikasi & Kontak Pengelola</span>
                  </h3>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await saveAdminAppConfig({
                        appName: settingsAppName.trim(),
                        adminEmail: settingsEmail.trim(),
                        adminWhatsapp: settingsWhatsapp.trim(),
                        privacyPolicyText: settingsPrivacy.trim(),
                        termsOfServiceText: settingsTerms.trim(),
                      });
                      showToast("Pengaturan aplikasi berhasil disimpan ke Firestore!");
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Nama Aplikasi</label>
                      <input
                        type="text"
                        value={settingsAppName}
                        onChange={(e) => setSettingsAppName(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Nomor WhatsApp Admin</label>
                      <input
                        type="text"
                        value={settingsWhatsapp}
                        onChange={(e) => setSettingsWhatsapp(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Email Resmi Admin</label>
                      <input
                        type="email"
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Kebijakan Privasi</label>
                      <textarea
                        rows={3}
                        value={settingsPrivacy}
                        onChange={(e) => setSettingsPrivacy(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Syarat & Ketentuan</label>
                      <textarea
                        rows={3}
                        value={settingsTerms}
                        onChange={(e) => setSettingsTerms(e.target.value)}
                        className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                    >
                      Simpan Pengaturan Aplikasi
                    </button>
                  </form>
                </div>

                {/* 2. Keamanan Kunci Admin: Ganti Password & Passcode */}
                <div className="space-y-6">
                  {/* Ganti Admin Passcode */}
                  <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>Ganti PIN Rahasia / Passcode Admin</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      PIN Rahasia saat ini: <b className="text-amber-400 font-mono tracking-wider">{appConfig.adminPasscode || "123456"}</b>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      PIN ini adalah autentikasi keamanan lapis ke-2 saat Anda membuka portal <code className="text-emerald-400">/admin</code>. Anda dapat menggantinya dengan 4 - 10 angka atau karakter baru kapan saja.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        maxLength={10}
                        value={newAdminPasscode}
                        onChange={(e) => setNewAdminPasscode(e.target.value)}
                        placeholder="Ketik PIN baru (min. 4 digit, contoh: 987654)..."
                        className="flex-1 bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (newAdminPasscode.trim().length >= 4) {
                            await saveAdminAppConfig({ adminPasscode: newAdminPasscode.trim() });
                            showToast("PIN Rahasia Admin berhasil diganti!");
                            setNewAdminPasscode("");
                          } else {
                            showToast("PIN minimal 4 digit.");
                          }
                        }}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shadow-md active:scale-95"
                      >
                        Simpan PIN Baru
                      </button>
                    </div>
                  </div>

                  {/* Ganti Password Akun Admin */}
                  <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Ganti Password Login Admin</span>
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Password Baru</label>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Minimal 6 karakter..."
                          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Konfirmasi Password Baru</label>
                        <input
                          type="password"
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          placeholder="Ulangi password baru..."
                          className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isUpdatingPassword}
                        onClick={async () => {
                          if (newAdminPassword.length < 6) {
                            showToast("Password minimal 6 karakter.");
                            return;
                          }
                          if (newAdminPassword !== confirmAdminPassword) {
                            showToast("Konfirmasi password tidak cocok!");
                            return;
                          }
                          setIsUpdatingPassword(true);
                          const res = await changeAdminPassword(newAdminPassword);
                          setIsUpdatingPassword(false);
                          if (res.success) {
                            showToast("Password akun Admin berhasil diperbarui!");
                            setNewAdminPassword("");
                            setConfirmAdminPassword("");
                          } else {
                            showToast(res.error || "Gagal mengganti password.");
                          }
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                      >
                        {isUpdatingPassword ? "Menyimpan Password..." : "Simpan Password Baru"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 9: LOG AKTIVITAS */}
          {/* =============================================================== */}
          {activeMenu === "logs" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Audit Trail Log Aktivitas Admin</span>
                  </h3>
                  <span className="text-xs text-slate-400">{auditLogs.length} catatan aktivitas</span>
                </div>

                <div className="space-y-2.5">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#080D1A] border border-slate-800 p-3.5 rounded-2xl flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                            log.type === "LOGIN" || log.type === "LOGOUT"
                              ? "bg-blue-500/20 text-blue-300"
                              : log.type === "DELETE_DATA" || log.type === "BAN_USER"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {log.type}
                        </span>
                        <div>
                          <p className="text-xs text-white font-medium">{log.description}</p>
                          <p className="text-[10px] text-slate-500">{log.adminEmail}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                        {log.timeString}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL KONFIRMASI KUSTOM ADMIN (Bebas 100% dari confirm bawaan browser) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-[#0B132B] border border-slate-700/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
