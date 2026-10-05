import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  MapPin,
  Camera as CameraIcon,
  Image as ImageIcon,
  CheckCircle2,
  Bookmark,
  X,
  Trash2,
  Search,
  Flag,
  ChevronRight,
  ChevronUp,
  PenLine,
  Pencil,
  Video,
  Play,
  ArrowLeft,
  LogIn,
  LogOut,
  User as UserIcon,
  Newspaper,
  SlidersHorizontal,
  Eye,
  HelpCircle,
  Megaphone,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { PostDetailModal } from "./components/PostDetailModal";
import { FeedMedia } from "./components/FeedMedia";
import { FeedItem, PostItem, ReportItem, HelpSettings, DEFAULT_HELP_SETTINGS, SponsorAd, AdSettings, DEFAULT_AD_SETTINGS } from "./types";
import { KarebaTaLogo } from "./components/KarebaTaLogo";
import { SearchModal, SearchFilterCategory } from "./components/SearchModal";
import { CommentActions } from "./components/CommentActions";
import { ShareBar } from "./components/ShareBar";
import { HelpContactModal } from "./components/HelpContactModal";
import { SponsorAdCard } from "./components/SponsorAdCard";
import { extractVideoThumbnail } from "./utils/thumbnail";
import { compressImageFile } from "./utils/compressor";
import { uploadToImageKit, deleteFromImageKit } from "./services/imagekit";
import {
  savePostToFirestore,
  listenToFirestorePosts,
  deletePostFromFirestore,
  togglePostLikeInFirestore,
  incrementPostViewInFirestore,
  addCommentToFirestore,
  listenToFirestoreBulletins,
  submitReportToFirestore,
  subscribeToAuth,
  logoutUser,
  saveUserProfile,
  getUserProfile,
  checkRegisteredUser,
  saveRegisteredUserProfile,
  listenToHelpSettings,
  listenToAdminAppConfig,
  listenToBannedUsers,
  checkIfUserBanned,
  BannedUser,
  listenToAdSettings,
  auth,
  User,
  isUserAdmin,
  PRIMARY_ADMIN_EMAIL
} from "./services/firebase";
import { RunningTextBar, BulletinItem } from "./components/RunningTextBar";
import { CardCarousel } from "./components/CardCarousel";
import { PullToRefresh } from "./components/PullToRefresh";
import { AdminDashboard } from "./components/AdminDashboard";
import { preloadFeedMedia } from "./utils/mediaPreloader";
import { LoginModal } from "./components/LoginModal";
import { LoginPage } from "./components/LoginPage";
import { SetupUsernamePage } from "./components/SetupUsernamePage";

export default function KarebaFeedFinal() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingUploadAction, setPendingUploadAction] = useState<"camera" | "gallery" | null>(null);
  const [loginRedirectMessage, setLoginRedirectMessage] = useState<string | null>(null);

  const [userName, setUserName] = useState<string>(() => {
    return "warga_kareba";
  });
  const userEmail = currentUser?.email || "warga.kareba@email.com";
  // Nama pengguna selalu bersumber dari ketikan user (maks 13 huruf), BUKAN alamat email
  const userDisplayName = userName;
  const initial = (userName.trim()[0] || "W").toUpperCase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [isExtractingThumbnail, setIsExtractingThumbnail] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("image");
  const [description, setDescription] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);

  // Status suka (Like) tersimpan di perangkat agar tidak berkedip / hilang saat Firestore menyinkronkan
  const [likedPostIds, setLikedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("karebata_liked_posts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("karebata_liked_posts", JSON.stringify(likedPostIds));
    } catch (e) {
      console.warn("Gagal menyimpan liked posts:", e);
    }
  }, [likedPostIds]);

  // Papan Teks Berjalan (Kabar Kilat & Warta Terkini)
  const [bulletins, setBulletins] = useState<BulletinItem[]>([
    {
      id: "b-1",
      category: "LALU LINTAS",
      text: "Arus lalu lintas pesisir dan jalur protokol terpantau lancar dan nyaman dilalui sore ini.",
      location: "Kawasan Pesisir",
      time: "Terkini",
    },
    {
      id: "b-2",
      category: "IKON KOTA",
      text: "Lampu hias jembatan utama aktif berkilau indah menghubungkan kawasan pesisir.",
      location: "Jembatan Utama",
      time: "15 mnt lalu",
    },
    {
      id: "b-3",
      category: "PRAKIRAAN CUACA",
      text: "BMKG Wilayah: Suhu 26°C - 31°C, hembusan angin sepoi-sepoi dan potensi gerimis ringan di lereng perbukitan.",
      location: "Kawasan Sekitar",
      time: "30 mnt lalu",
    },
    {
      id: "b-4",
      category: "KULINER",
      text: "Semarak aneka kuliner tradisional dan jajanan hangat ramai dinikmati warga petang ini.",
      location: "Sentra Kuliner",
      time: "1 jam lalu",
    },
    {
      id: "b-5",
      category: "AGENDA WARGA",
      text: "Aksi bersih pantai bersama Komunitas Relawan Minggu pagi pukul 06.30 WITA di pesisir pantai.",
      location: "Pesisir Pantai",
      time: "2 jam lalu",
    },
  ]);

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpSettings, setHelpSettings] = useState<HelpSettings>(DEFAULT_HELP_SETTINGS);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<SearchFilterCategory>("all");
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeDetailPost, setActiveDetailPost] = useState<PostItem | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [highlightSource, setHighlightSource] = useState<"card" | "search" | "new_upload" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uploadSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const helpBtnTouchRef = useRef<{ x: number; y: number; moved: boolean }>({ x: 0, y: 0, moved: false });
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success">("idle");
  const [lastUploadedPost, setLastUploadedPost] = useState<{
    id: string;
    title: string;
    img?: string;
    thumbnail?: string;
    mediaType?: "image" | "video";
  } | null>(null);
  const [postToDelete, setPostToDelete] = useState<{ id: string; title?: string; img?: string } | null>(null);
  const [reportPostData, setReportPostData] = useState<{ id: string; user: string; text?: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState<string>("");
  // Deteksi rute Dashboard Admin terpisah (/admin atau #/admin atau #admin)
  const isDedicatedAdminRoute = () => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === "/admin" || path.startsWith("/admin/") || hash === "#admin" || hash === "#/admin";
  };

  const [viewMode, setViewMode] = useState<"login" | "set_name" | "feed" | "admin">(() => {
    if (isDedicatedAdminRoute()) return "admin";
    // Keamanan: Saat aplikasi baru dibuka (setelah keluar aplikasi / browser ditutup),
    // selalu hadapkan pengguna ke halaman login (pilihan Masuk Google & Kabar Warga)
    const hasActiveSession = typeof window !== "undefined" && sessionStorage.getItem("karebata_active_session") === "true";
    if (hasActiveSession) {
      if (typeof window !== "undefined" && window.location.hash === "#feed") return "feed";
      const hasGuestSession = typeof window !== "undefined" && sessionStorage.getItem("kareba_guest_mode") === "true";
      if (hasGuestSession) return "feed";
    }
    // Jika belum ada sesi aktif, bersihkan hash agar tetap di halaman login
    if (typeof window !== "undefined" && window.location.hash === "#feed") {
      try {
        window.history.replaceState(null, "", window.location.pathname);
      } catch {}
    }
    return "login";
  });

  // Pantau perpindahan rute URL (/admin, #/admin, #feed, #login)
  useEffect(() => {
    const handleRouteChange = () => {
      if (isDedicatedAdminRoute()) {
        setViewMode("admin");
        return;
      }
      const hasActiveSession = typeof window !== "undefined" && sessionStorage.getItem("karebata_active_session") === "true";
      if (!hasActiveSession && window.location.hash === "#feed") {
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch {}
        setViewMode("login");
        return;
      }
      if (window.location.hash === "#feed") {
        setViewMode("feed");
      } else if (window.location.hash === "#login") {
        setViewMode("login");
      }
    };
    window.addEventListener("hashchange", handleRouteChange);
    window.addEventListener("popstate", handleRouteChange);
    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  // Berlangganan pengumuman kilat secara real-time dari Firestore
  useEffect(() => {
    const unsubBulletins = listenToFirestoreBulletins((remoteBulletins) => {
      if (remoteBulletins && remoteBulletins.length > 0) {
        setBulletins(remoteBulletins);
      }
    });
    return () => unsubBulletins();
  }, []);

  // Berlangganan status autentikasi Google Firebase
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      // Keamanan: Cek apakah sesi aplikasi saat ini sudah aktif di browser
      const hasActiveSession = typeof window !== "undefined" && sessionStorage.getItem("karebata_active_session") === "true";

      if (!hasActiveSession) {
        // Jika aplikasi baru dibuka setelah browser/tab ditutup, wajibkan login ulang demi keamanan
        if (user) {
          logoutUser().catch(() => {});
        }
        setCurrentUser(null);
        setViewMode((prev) => (prev === "admin" ? "admin" : "login"));
        return;
      }

      setCurrentUser(user);
      if (user) {
        checkRegisteredUser(user.email, user.uid).then((res) => {
          if (res.isRegistered && res.username) {
            setUserName(res.username);
          } else {
            setUserName("warga_kareba");
          }
        }).catch(() => {
          setUserName("warga_kareba");
        });
      } else {
        setUserName("warga_kareba");
      }
    });
    return () => unsubAuth();
  }, []);

  // Berlangganan data Akun Warga yang Ditangguhkan / Diblokir secara real-time
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  useEffect(() => {
    const unsubBanned = listenToBannedUsers((items) => {
      setBannedUsers(items);
    });
    return () => unsubBanned();
  }, []);

  // Berlangganan data Pengaturan Iklan Bersponsor secara real-time
  const [adSettings, setAdSettings] = useState<AdSettings>(DEFAULT_AD_SETTINGS);
  useEffect(() => {
    const unsubAds = listenToAdSettings((settings) => {
      setAdSettings(settings);
    });
    return () => unsubAds();
  }, []);

  // Periksa status penangguhan akun pengguna saat ini
  const currentBanStatus = useMemo(() => {
    return checkIfUserBanned(bannedUsers, {
      email: currentUser?.email,
      userName,
      uid: currentUser?.uid,
    });
  }, [bannedUsers, currentUser, userName]);

  // Handler klik kamera di header (harus login terlebih dahulu)
  const handleCameraClick = () => {
    if (currentBanStatus.isBanned) {
      showToast("Tabe' akun Anda telah ditangguhkan karena melanggar aturan komunitas.");
      return;
    }
    if (!currentUser) {
      setLoginRedirectMessage("Masuk dengan Akun Google untuk mengambil foto & membagikan kabar warga.");
      setPendingUploadAction("camera");
      setViewMode("login");
      return;
    }
    openCamera();
  };

  // Handler klik galeri/media di header (harus login terlebih dahulu)
  const handleGalleryClick = () => {
    if (currentBanStatus.isBanned) {
      showToast("Tabe' akun Anda telah ditangguhkan karena melanggar aturan komunitas.");
      return;
    }
    if (!currentUser) {
      setLoginRedirectMessage("Masuk dengan Akun Google untuk memilih foto atau video dari galeri.");
      setPendingUploadAction("gallery");
      setViewMode("login");
      return;
    }
    openCustomGallery();
  };

  // Callback saat user berhasil login Google:
  // - Pengguna lama (email/akun sudah pernah terdaftar): tidak perlu ngetik nama lagi, langsung masuk beranda!
  // - Pengguna baru (email/akun belum pernah terdaftar): WAJIB masuk halaman ngetik nama terlebih dahulu, baru muncul aplikasi!
  const handleLoginSuccess = async (loggedInUser?: User | null) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("karebata_active_session", "true");
    }
    setIsLoginModalOpen(false);
    setLoginRedirectMessage(null);

    const activeUser = loggedInUser || currentUser || auth.currentUser;
    if (activeUser) {
      setCurrentUser(activeUser);
    }

    if (!activeUser) {
      setViewMode("login");
      return;
    }

    const email = activeUser.email || "";
    const uid = activeUser.uid || "";

    // Periksa status pendaftaran akun Google ini di database
    const checkRes = await checkRegisteredUser(email, uid);

    if (checkRes.isRegistered && checkRes.username) {
      // 1. AKUN SUDAH TERDAFTAR SEBELUMNYA:
      // Sesuai permintaan pengguna:
      // "kecuali sudah terdaftar email akun sebelum nya tinggal masuk email saja tidak perlu tulisan nama"
      const clean = checkRes.username;
      setUserName(clean);
      setViewMode("feed");
      showToast(`Selamat datang kembali, @${clean}!`);
    } else {
      // 2. AKUN BARU ATAU GANTI KE AKUN LAIN YANG BELUM TERDAFTAR:
      // Sesuai permintaan pengguna:
      // "ketika orang login google setelah itu masuk halaman tulisan nama pengguna terus baru muncul halaman aplikasi,
      // dan ketika ganti akun tetap ada nulis nama lagi pokok nya setia ganti akun lain akun atao login google selaluka ada tulis nama"
      setUserName("warga_kareba");
      setViewMode("set_name");
    }
  };

  // Callback simpan nama pengguna baru dari halaman pengetikan nama
  const handleSaveUsername = (typedUsername: string) => {
    const cleanName = typedUsername.trim().replace(/^@/, "").slice(0, 13);
    if (!cleanName) return;

    if (typeof window !== "undefined") {
      sessionStorage.setItem("karebata_active_session", "true");
    }

    setUserName(cleanName);
    if (currentUser?.uid) {
      saveRegisteredUserProfile(currentUser.uid, cleanName, currentUser.email).catch(() => {});
    }

    // Perbarui postingan lokal agar langsung memakai nama yang diketik
    const cleanInitial = (cleanName[0] || "W").toUpperCase();
    setFeed((prev) =>
      prev.map((item) =>
        isMyPost(item)
          ? { ...item, user: cleanName, name: cleanName, init: cleanInitial, avatar: undefined }
          : item
      )
    );
    setPosts((prev) =>
      prev.map((p) =>
        isMyPost(p)
          ? { ...p, user: cleanName, name: cleanName, init: cleanInitial }
          : p
      )
    );

    // SETELAH SIMPAN NAMA -> BARU MUNCUL HALAMAN APLIKASI (BERANDA)!
    setViewMode("feed");
    showToast(`Nama pengguna berhasil disetel: @${cleanName}`);

    const action = pendingUploadAction;
    setPendingUploadAction(null);
    if (action === "camera") {
      setTimeout(() => {
        openCamera();
      }, 400);
    } else if (action === "gallery") {
      setTimeout(() => {
        openCustomGallery();
      }, 400);
    }
  };

  // Callback saat user memilih nonton bebas tanpa login (Warga Kareba)
  const handleContinueAsGuest = () => {
    sessionStorage.setItem("kareba_guest_mode", "true");
    sessionStorage.setItem("karebata_active_session", "true");
    setLoginRedirectMessage(null);
    setViewMode("feed");
    showToast("Selamat datang, Warga Kareba!");
  };

  // Handler logout pengguna
  const handleLogout = async () => {
    const ok = await logoutUser();
    if (ok) {
      setCurrentUser(null);
      setUserName("warga_kareba");
      sessionStorage.removeItem("kareba_guest_mode");
      sessionStorage.removeItem("karebata_active_session");
      localStorage.removeItem("karebata_username");
      setViewMode("login");
      showToast("Berhasil keluar dari akun. Sesi diamankan.");
    }
  };

  // Fungsi Tarik Layar ke Bawah untuk Memperbarui (Pull-to-Refresh seperti di aplikasi Facebook)
  const handlePullRefresh = async () => {
    // Memberikan jeda loading natural
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Tambahkan kabar terkini baru di papan teks berjalan
    const freshBulletin: BulletinItem = {
      id: `b-refresh-${Date.now()}`,
      category: "KABAR TERKINI",
      text: "Pembaruan Langsung: Arus lalu lintas pesisir & kawasan jembatan utama lancar terkendali.",
      location: "Pusat Kota",
      time: "Baru saja",
    };
    setBulletins((prev) => [freshBulletin, ...prev.filter((b) => !b.id.startsWith("b-refresh-"))]);

    // Segarkan waktu feed
    setFeed((prev) =>
      prev.map((item, idx) => ({
        ...item,
        time: idx === 0 ? "Baru saja" : item.time,
      }))
    );

    showToast("Kabar berhasil diperbarui!");
  };

  // Helper untuk mengecek apakah suatu postingan adalah milik akun sendiri:
  // - Pada postingan sendiri: HANYA kita yang melihat icon X (Hapus), dan TIDAK melihat icon Laporkan.
  // - Pada postingan orang lain: kita melihat icon Laporkan, dan TIDAK melihat icon X (Hapus).
  const isMyPost = (item: { isMyPost?: boolean; user?: string; email?: string }) => {
    if (typeof item.isMyPost === "boolean") {
      return item.isMyPost;
    }
    return (
      item.user === userName ||
      item.user === "kamu" ||
      item.email === "iditona5@gmail.com" ||
      item.email === userEmail
    );
  };

  // In-app interactive states to avoid window.prompt / alert in iframe
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [newUserNameInput, setNewUserNameInput] = useState("");
  const [activeCommentItem, setActiveCommentItem] = useState<FeedItem | null>(null);
  const [commentInputText, setCommentInputText] = useState("");
  const [activeSharePostId, setActiveSharePostId] = useState<string | null>(null);

  // Quick stats state: like, komentar, dan bagikan bernilai nol sebelum ada interaksi
  const [stats, setStats] = useState({
    likes: 0,
    komentar: 0,
    bagikan: 0,
  });

  // FUNGSI GALERI CUSTOM - TIDAK PAKAI TAMPILAN BROWSER
  const openCustomGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|3gp|avi)$/i.test(file.name);
      
      if (isVid) {
        const url = URL.createObjectURL(file);
        setSelectedImage(url);
        setSelectedMediaType("video");
        setIsExtractingThumbnail(true);
        try {
          const thumb = await extractVideoThumbnail(file);
          setSelectedThumbnail(thumb);
        } catch {
          setSelectedThumbnail(null);
        } finally {
          setIsExtractingThumbnail(false);
        }
      } else {
        setSelectedMediaType("image");
        setSelectedThumbnail(null);
        // Kompres otomatis gambar: hemat gudang ImageKit & kencang meski sinyal lelet
        const compressedUrl = await compressImageFile(file);
        setSelectedImage(compressedUrl);
      }
    }
  };

  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedThumb = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
      setSelectedThumbnail(compressedThumb);
    }
  };

  // FUNGSI KAMERA BAWAAN HP LANGSUNG
  const openCamera = () => {
    // Membuka kamera bawaan HP langsung (native camera)
    cameraInputRef.current?.click();
  };

  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedMediaType("image");
      setSelectedThumbnail(null);
      // Kompres otomatis hasil jepretan kamera: hemat kuota, super cepat, hemat ImageKit
      const compressedUrl = await compressImageFile(file);
      setSelectedImage(compressedUrl);
      showToast("Foto berhasil diambil dan dioptimalkan!");
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // State postingan disimpan (Bookmark)
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("karebata_saved_posts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State untuk "Postingan Kamu"
  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: "post-video-1",
      title: "Pesona Pesisir Bahari",
      loc: "Kawasan Pesisir Barat",
      img: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
      mediaType: "video",
      caption: "Rekaman video senja dan ombak tenang di pesisir bahari. Suasana adem dan damai.",
      createdAt: "30 menit lalu",
      name: "Sahabat Kareba",
      email: "iditona5@gmail.com",
      user: "kamu",
      init: "K",
      isMyPost: true,
    },
    {
      id: "post-1",
      title: "Pantai Indah",
      loc: "Pesisir Barat",
      img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
      caption: "Pemandangan pesisir pantai menjelang petang. Angin sepoi-sepoi dan ombak tenang.",
      createdAt: "2 jam lalu",
      name: "Sahabat Kareba",
      email: "iditona5@gmail.com",
      user: "kamu",
      init: "K",
      isMyPost: true,
    },
    {
      id: "post-2",
      title: "Jembatan Utama Kota",
      loc: "Pusat Kota",
      img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&auto=format&fit=crop&q=80",
      caption: "Ikon kebanggaan kota yang menghubungkan wilayah pesisir, bersinar indah di malam hari.",
      createdAt: "5 jam lalu",
      name: "Sahabat Kareba",
      email: "iditona5@gmail.com",
      user: "kamu",
      init: "K",
      isMyPost: true,
    },
    {
      id: "post-3",
      title: "Kuliner Tradisional",
      loc: "Sentra Kuliner",
      img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80",
      caption: "Mencicipi olahan tradisional nusantara hangat yang nikmat dan menggugah selera.",
      createdAt: "1 hari lalu",
      name: "Sahabat Kareba",
      email: "iditona5@gmail.com",
      user: "kamu",
      init: "K",
      isMyPost: true,
    },
  ]);

  // State untuk Feed Vertikal
  const [feed, setFeed] = useState<FeedItem[]>([
    {
      id: "post-1",
      user: "warga_kareba",
      init: "W",
      name: "Kawan Warga Kareba (Kamu)",
      email: "iditona5@gmail.com",
      time: "2 jam lalu",
      text: "Senja hari ini, tenang banget 🌅 Menikmati semilir angin di pesisir bersama kawan-kawan. (Foto Horizontal - Tampil Rasio Asli)",
      img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
      mediaType: "image",
      like: 0,
      isLiked: false,
      location: "Pesisir Barat",
      isMyPost: true,
      comments: [
        {
          id: "c-sample-1",
          user: "andi_kareba",
          text: "Indah sekali pemandangan senja ini!",
          time: "1 jam lalu",
          likes: 12,
          isLiked: false,
        },
        {
          id: "c-sample-2",
          user: "warga_kareba",
          text: "Terima kasih kanda! Yuk mampir sore-sore.",
          time: "30 menit lalu",
          likes: 4,
          isLiked: true,
        },
      ],
    },
    {
      id: "feed-2",
      user: "pesona_nusantara",
      init: "P",
      name: "Pesona Alam Nusantara",
      email: "pesona@karebata.id",
      time: "3 jam lalu",
      text: "Pemandangan pegunungan hijau yang memagari kawasan lembah 🏔️ Segar dan asri sekali!",
      img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80",
      mediaType: "image",
      like: 0,
      isLiked: false,
      location: "Puncak Bukit Hijau",
      isMyPost: false,
      comments: [],
    },
    {
      id: "post-video-1",
      user: "warga_kareba",
      init: "W",
      name: "Sahabat Kareba (Kamu)",
      email: "iditona5@gmail.com",
      time: "30 menit lalu",
      text: "Rekaman video senja dan ombak tenang di pesisir bahari. Suasana adem dan damai.",
      img: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
      mediaType: "video",
      like: 0,
      isLiked: false,
      location: "Kawasan Pesisir Barat",
      isMyPost: true,
      comments: [],
    },
    {
      id: "post-2",
      user: "warga_kareba",
      init: "W",
      name: "Sahabat Kareba (Kamu)",
      email: "iditona5@gmail.com",
      time: "5 jam lalu",
      text: "Ikon kebanggaan kota yang menghubungkan wilayah pesisir, bersinar indah di malam hari.",
      img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&auto=format&fit=crop&q=80",
      mediaType: "image",
      like: 0,
      isLiked: false,
      location: "Pusat Kota",
      isMyPost: true,
      comments: [],
    },
    {
      id: "post-3",
      user: "warga_kareba",
      init: "W",
      name: "Sahabat Kareba (Kamu)",
      email: "iditona5@gmail.com",
      time: "1 hari lalu",
      text: "Mencicipi olahan tradisional nusantara hangat yang nikmat dan menggugah selera.",
      img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80",
      mediaType: "image",
      like: 0,
      isLiked: false,
      location: "Sentra Kuliner",
      isMyPost: true,
      comments: [],
    },
  ]);

  // Total suka/love yang didapatkan oleh postingan kabar milik pengguna sendiri
  // (Jika pengguna menyukai kabar orang lain, angka love di profil sendiri TIDAK akan bertambah)
  const myTotalLikes = useMemo(() => {
    return feed
      .filter((item) => isMyPost(item))
      .reduce((sum, item) => sum + (item.like || 0), 0);
  }, [feed, userName, userEmail, currentUser]);

  // Total berapa kali postingan kabar milik pengguna sendiri dibagikan
  // (Jika pengguna membagikan kabar orang lain, angka bagikan di profil sendiri TIDAK akan bertambah)
  const myTotalShares = useMemo(() => {
    return feed
      .filter((item) => isMyPost(item))
      .reduce((sum, item) => sum + (item.shares || 0), 0);
  }, [feed, userName, userEmail, currentUser]);

  // Total berapa kali postingan kabar milik pengguna sendiri disimpan (bookmark)
  // (Jika pengguna menyimpan kabar orang lain, angka simpan di profil sendiri TIDAK akan bertambah)
  const myTotalSaves = useMemo(() => {
    return feed
      .filter((item) => isMyPost(item))
      .reduce((sum, item) => sum + (item.saves || 0), 0);
  }, [feed, userName, userEmail, currentUser]);

  // Handler saat sebuah kabar dibagikan (menambahkan hitungan share pada postingan tersebut)
  // Angka bagikan di profil atas HANYA bertambah jika postingan yang dibagikan adalah milik Anda sendiri
  const handlePostShared = (postId: string) => {
    setFeed((prev) =>
      prev.map((item) =>
        item.id === postId
          ? { ...item, shares: (item.shares || 0) + 1 }
          : item
      )
    );
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? { ...item, shares: (item.shares || 0) + 1 }
          : item
      )
    );
  };

  // Handler untuk menyimpan / membatalkan simpan sebuah kabar (Bookmark)
  // - Menambahkan / menghapus dari daftar tersimpan milik pengguna (savedPostIds)
  // - Menambahkan / mengurangi jumlah saves pada postingan tersebut
  // - Angka Simpan di profil atas HANYA bertambah jika kabar yang disimpan adalah milik Anda sendiri!
  const handleToggleSave = (postId: string) => {
    const isCurrentlySaved = savedPostIds.includes(postId);
    const willBeSaved = !isCurrentlySaved;

    setSavedPostIds((prev) => {
      const next = prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId];
      try {
        localStorage.setItem("karebata_saved_posts", JSON.stringify(next));
      } catch {
        // Abaikan jika penyimpanan terbatas
      }
      return next;
    });

    showToast(isCurrentlySaved ? "Dihapus dari kabar tersimpan" : "Kabar berhasil disimpan!");

    // Update saves count di feed
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id === postId) {
          const cur = item.saves || 0;
          return {
            ...item,
            saves: willBeSaved ? cur + 1 : Math.max(0, cur - 1),
          };
        }
        return item;
      })
    );

    // Update saves count di posts jika ada
    setPosts((prev) =>
      prev.map((item) => {
        if (item.id === postId) {
          const cur = item.saves || 0;
          return {
            ...item,
            saves: willBeSaved ? cur + 1 : Math.max(0, cur - 1),
          };
        }
        return item;
      })
    );
  };

  // Filter pencarian terarah langsung di halaman utama: Akun, Lokasi, atau Berita
  const displayFeed = useMemo(() => {
    const rawQ = searchQuery.trim();
    if (!rawQ) return feed;

    const lowerQ = rawQ.toLowerCase();

    // Deteksi otomatis jika pengguna mengetik awalan khusus
    let activeFilter = searchCategory;
    let cleanQ = lowerQ;

    if (rawQ.startsWith("@")) {
      activeFilter = "account";
      cleanQ = lowerQ.replace(/^@+/, "").trim();
    } else if (rawQ.toLowerCase().startsWith("lokasi:")) {
      activeFilter = "location";
      cleanQ = lowerQ.replace(/^lokasi:\s*/i, "").trim();
    } else if (rawQ.toLowerCase().startsWith("berita:")) {
      activeFilter = "news";
      cleanQ = lowerQ.replace(/^berita:\s*/i, "").trim();
    }

    if (!cleanQ && activeFilter === "account") {
      return feed;
    }

    return feed.filter((item) => {
      const itemUser = (item.user || "").toLowerCase().replace(/^@+/, "");
      const itemName = (item.name || "").toLowerCase();
      const itemLoc = (item.location || "").toLowerCase();
      const itemText = (item.text || "").toLowerCase();

      if (activeFilter === "account") {
        // CUKUP akun yang punya postingan itu saja yang muncul
        return itemUser.includes(cleanQ) || itemName.includes(cleanQ);
      }

      if (activeFilter === "location") {
        // SEMUA postingan dengan lokasi yang sama yang muncul
        return itemLoc.includes(cleanQ);
      }

      if (activeFilter === "news") {
        // Postingan dengan isi/judul/topik berita yang cocok yang muncul
        return itemText.includes(cleanQ);
      }

      // 'all': cocokkan nama akun, lokasi, atau teks berita
      return (
        itemUser.includes(cleanQ) ||
        itemName.includes(cleanQ) ||
        itemLoc.includes(cleanQ) ||
        itemText.includes(cleanQ)
      );
    });
  }, [feed, searchQuery, searchCategory]);

  // Helper untuk menggulirkan layar langsung tertuju ke media postingan di feed
  const scrollToFeedMedia = (postId: string) => {
    // Cari elemen media langsung dari postingan di feed
    const mediaEl =
      document.getElementById(`feed-post-media-${postId}`) ||
      document.getElementById(`feed-post-${postId}`) ||
      document.getElementById("feed-vertical-container");

    if (mediaEl) {
      const headerEl = document.getElementById("karebata-feed-header");
      const headerH = headerEl ? headerEl.offsetHeight + 10 : 65;
      const rect = mediaEl.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetTop = rect.top + scrollTop - headerH;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }
  };

  // Deteksi jarak scroll untuk memunculkan tombol kembali ke atas ketika terscroll jauh (> 350px)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Matikan 100% semua menu dan gestur bawaan browser (Context Menu, Long-press Popup, Drag Ghosting)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return; // Izinkan hanya pada input formulir untuk keperluan paste/ketik
      }
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("dragstart", handleDragStart);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  // Sinkronisasi postingan real-time dari Firestore proyek pribadi
  useEffect(() => {
    const unsubscribe = listenToFirestorePosts((remotePosts) => {
      const remoteList = remotePosts || [];
      const remoteIds = new Set(remoteList.map((p) => p.id));
      const remoteImgUrls = new Set(remoteList.map((p) => p.img).filter(Boolean));

      setFeed((prevFeed) => {
        const prevMap = new Map(prevFeed.map((p) => [p.id, p]));
        const currentUid = (currentUser?.email || currentUser?.uid || userName || "").toLowerCase();

        const updatedRemote = remoteList.map((r) => {
          const prev = prevMap.get(r.id);
          const isLiked =
            likedPostIds.includes(r.id) ||
            (currentUid && r.likedBy && r.likedBy.some((u) => u.toLowerCase() === currentUid)) ||
            Boolean(prev?.isLiked);
          return {
            ...r,
            isLiked: Boolean(isLiked),
          };
        });

        // Sinkronisasi dua arah:
        // Jika postingan dinamis (feed-...) dihapus di Firebase console,
        // postingan tersebut tidak akan ada di remoteIds, sehingga otomatis ikut hilang dari feed aplikasi.
        const existingUnique = prevFeed.filter((p) => {
          if (remoteIds.has(p.id)) return false; // Sudah diperbarui dari remote
          if (p.id.startsWith("feed-")) return false; // Dihapus di penyimpanan Firestore
          return true; // Postingan sampel bawaan aplikasi tetap dipertahankan
        });

        return [...updatedRemote, ...existingUnique];
      });

      // Sinkronkan juga daftar "Kabar Kamu" (carousel atas)
      setPosts((prevPosts) => {
        return prevPosts.filter((p) => {
          if (p.id.startsWith("feed-")) {
            return remoteIds.has(p.id) || Boolean(p.img && remoteImgUrls.has(p.img));
          }
          return true;
        });
      });
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [likedPostIds, currentUser, userName]);

  // Berlangganan data Pengaturan WhatsApp Admin & Bantuan Warga secara real-time
  useEffect(() => {
    const unsubHelp = listenToHelpSettings((settings) => {
      setHelpSettings(settings);
    });

    const unsubConfig = listenToAdminAppConfig((cfg) => {
      setHelpSettings((prev) => ({
        ...prev,
        whatsappNumber: cfg.adminWhatsapp || prev.whatsappNumber,
        workingHours: cfg.adminWorkingHours || prev.workingHours,
      }));
    });

    return () => {
      unsubHelp();
      unsubConfig();
    };
  }, []);

  // Preload cerdas media beranda (gambar & video poster) ke memori GPU browser
  // sehingga saat pengguna menggulir (scroll), media sudah 100% matang tanpa kedipan tirai atau muncul setengah
  useEffect(() => {
    const mediaUrls: (string | undefined)[] = [];
    feed.forEach((f) => {
      if (f.img) mediaUrls.push(f.img);
      if (f.thumbnail) mediaUrls.push(f.thumbnail);
    });
    if (adSettings?.ads) {
      adSettings.ads.forEach((ad) => {
        if (ad.imageUrl) mediaUrls.push(ad.imageUrl);
      });
    }
    if (mediaUrls.length > 0) {
      preloadFeedMedia(mediaUrls);
    }
  }, [feed, adSettings]);

  // Fungsi untuk naik kembali ke media di atas dengan animasi halus
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Kunci scroll layar latar belakang saat modal aktif agar halaman belakang tidak ikut tergulir (scroll-lock)
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isHelpOpen ||
      isEditProfileOpen ||
      reportPostData ||
      postToDelete ||
      activeCommentItem ||
      activeDetailPost
    );

    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [
    isEditProfileOpen,
    reportPostData,
    postToDelete,
    activeCommentItem,
    activeDetailPost,
  ]);

  // Efek penandaan postingan ketika kata pencarian cocok
  useEffect(() => {
    if (!isSearchOpen || !searchQuery.trim()) {
      setHighlightedPostId(null);
      setHighlightSource(null);
      return;
    }

    if (displayFeed.length > 0) {
      setHighlightedPostId(displayFeed[0].id);
      setHighlightSource("search");
    } else {
      setHighlightedPostId(null);
    }
  }, [searchQuery, isSearchOpen, displayFeed]);

  // Lacak postingan yang sudah dihitung tayangannya (view) dalam sesi ini agar tidak dihitung berulang-ulang
  const viewedPostIdsRef = useRef<Set<string>>(new Set());

  const handleRegisterView = useCallback((postId: string) => {
    if (!postId || viewedPostIdsRef.current.has(postId)) return;
    viewedPostIdsRef.current.add(postId);

    // Update optimis di state lokal feed agar angka di layar pengguna langsung bertambah seketika
    setFeed((prevFeed) =>
      prevFeed.map((item) =>
        item.id === postId
          ? { ...item, views: (item.views || 0) + 1 }
          : item
      )
    );

    // Simpan penambahan tayangan ke basis data Firestore
    incrementPostViewInFirestore(postId);
  }, []);

  // Daftarkan pengamat scroll (IntersectionObserver) untuk menghitung tayangan secara otomatis saat kabar terlihat di layar
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute("data-post-id");
            if (postId) {
              handleRegisterView(postId);
            }
          }
        });
      },
      {
        threshold: 0.35, // Terhitung tayang saat minimal 35% postingan masuk ke layar HP
      }
    );

    const postElements = document.querySelectorAll("[data-post-id]");
    postElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [displayFeed, handleRegisterView]);

  // Fungsi ketika klik salah satu kartu kabar kamu atau kartu tersimpan: memunculkan tampilan layar penuh (full screen)
  const handleOpenCardInFeed = (p: PostItem) => {
    if (p.id) {
      handleRegisterView(p.id);
    }
    // Cari postingan yang sesuai di dalam daftar feed
    let target = feed.find((f) => f.id === p.id || (p.img && f.img === p.img));
    const isOwner = isMyPost(p) || (target ? isMyPost(target) : false);

    if (!target) {
      // Jika belum ada di feed warga, sisipkan langsung agar bisa dilihat
      target = {
        id: p.id,
        user: isOwner ? userName : (p.user || "warga"),
        init: isOwner ? initial : (p.init || "W"),
        name: isOwner ? "Sahabat Kareba (Kamu)" : (p.name || p.user || "Warga"),
        email: isOwner ? userEmail : p.email,
        avatar: isOwner ? undefined : p.avatar,
        time: p.createdAt || "Baru saja",
        text: p.caption || p.title || "Kabar Warga",
        img: p.img,
        thumbnail: p.thumbnail,
        mediaType: p.mediaType || "image",
        like: 0,
        isLiked: false,
        location: p.loc,
        comments: [],
        isMyPost: isOwner,
      };
      setFeed((prev) => [target!, ...prev]);
    }

    // Buka tampilan LAYAR PENUH (FULL SCREEN) persis seperti di feed
    const fullText = p.caption || target.text || p.title || "Kabar Warga";
    setActiveDetailPost({
      id: target.id,
      title: fullText,
      caption: fullText,
      loc: p.loc || target.location || "Sulawesi Tengah",
      img: p.img || target.img,
      thumbnail: p.thumbnail || target.thumbnail,
      mediaType: p.mediaType || target.mediaType || "image",
      createdAt: p.createdAt || target.time || "Baru saja",
      name: isOwner ? userName : (target.name || p.name || target.user || p.user || "Warga"),
      email: isOwner ? userEmail : (target.email || p.email),
      user: isOwner ? userName : (target.user || p.user || "warga"),
      init: isOwner ? initial : (target.init || p.init || (p.user ? p.user.trim().replace(/^@/, "")[0] : "W")).toUpperCase(),
      avatar: isOwner ? undefined : (target.avatar || p.avatar),
      isMyPost: isOwner,
    });
  };

  // State untuk melipat / membuka deskripsi panjang yang dipotong
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const toggleExpandPost = (id: string) => {
    const isCurrentlyExpanded = !!expandedPosts[id];

    setExpandedPosts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    // Jika sedang melipat kembali ke deskripsi terpotong:
    // Pastikan posisi layar tetap pas di postingan ini agar tidak melompat ke postingan lain
    if (isCurrentlyExpanded) {
      setTimeout(() => {
        const targetPost = document.getElementById(`post-card-${id}`);
        if (!targetPost) return;

        const header = document.getElementById("karebata-feed-header");
        const headerH = header ? header.offsetHeight : 54;
        const rect = targetPost.getBoundingClientRect();

        // Jika bagian atas postingan terdorong ke atas melebihi header saat teks mengkerut,
        // kembalikan pandangan layar tepat pas di postingan tersebut di bawah header
        if (rect.top < headerH) {
          const targetY = window.scrollY + rect.top - headerH;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: "smooth",
          });
        }
      }, 40);
    }
  };

  // Toggle Like pada feed (sinkron dengan counter like di atas)
  const handleToggleLike = (id: string) => {
    const targetItem = feed.find((item) => item.id === id);
    if (!targetItem) return;

    const newLiked = !targetItem.isLiked;

    // Perbarui daftar ID postingan yang disukai (tersimpan di localStorage)
    setLikedPostIds((prev) => {
      if (newLiked) {
        return prev.includes(id) ? prev : [...prev, id];
      } else {
        return prev.filter((item) => item !== id);
      }
    });

    setFeed((prevFeed) =>
      prevFeed.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            isLiked: newLiked,
            like: newLiked ? item.like + 1 : Math.max(0, item.like - 1),
          };
        }
        return item;
      })
    );

    // Sinkronkan ke database Firestore proyek pribadi
    const updatedCount = newLiked ? targetItem.like + 1 : Math.max(0, targetItem.like - 1);
    const userIdentifier = currentUser?.email || currentUser?.uid || userName || "warga_kareba";
    togglePostLikeInFirestore(id, updatedCount, userIdentifier, newLiked);
  };

  // State untuk menampilkan baris kartu kecil postingan tersimpan saat icon tersimpan diklik
  const [showSavedSection, setShowSavedSection] = useState(false);

  // Kompilasi kartu tersimpan dari koleksi postingan horizontal dan feed
  const savedItems: PostItem[] = savedPostIds
    .map((id) => {
      const foundPost = posts.find((p) => p.id === id);
      if (foundPost) return foundPost;
      const foundFeed = feed.find((f) => f.id === id);
      if (foundFeed) {
        return {
          id: foundFeed.id,
          title: foundFeed.text,
          loc: foundFeed.location || "Kawasan Sekitar",
          img: foundFeed.img || "",
          thumbnail: foundFeed.thumbnail,
          mediaType: foundFeed.mediaType,
          caption: foundFeed.text,
          createdAt: foundFeed.time,
          name: foundFeed.name,
          user: foundFeed.user,
          email: foundFeed.email,
          init: foundFeed.init,
          avatar: foundFeed.avatar,
          isMyPost: isMyPost(foundFeed),
        };
      }
      return null;
    })
    .filter((item): item is PostItem => item !== null);

  // Handler Like pada Komentar
  const handleLikeComment = (commentId: string) => {
    if (!activeCommentItem) return;
    setFeed((prevFeed) =>
      prevFeed.map((item) => {
        if (item.id === activeCommentItem.id) {
          return {
            ...item,
            comments: (item.comments || []).map((comm) => {
              if (comm.id === commentId) {
                const currentLikes = comm.likes ?? 0;
                const isNowLiked = !comm.isLiked;
                return {
                  ...comm,
                  isLiked: isNowLiked,
                  likes: isNowLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1),
                };
              }
              return comm;
            }),
          };
        }
        return item;
      })
    );
    setActiveCommentItem((prev) =>
      prev
        ? {
            ...prev,
            comments: (prev.comments || []).map((comm) => {
              if (comm.id === commentId) {
                const currentLikes = comm.likes ?? 0;
                const isNowLiked = !comm.isLiked;
                return {
                  ...comm,
                  isLiked: isNowLiked,
                  likes: isNowLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1),
                };
              }
              return comm;
            }),
          }
        : null
    );
  };

  // Handler Balas Komentar
  const handleReplyComment = (commentUser: string) => {
    setCommentInputText(`@${commentUser} `);
    const inputEl = document.getElementById("comment-input-field");
    if (inputEl) {
      inputEl.focus();
    }
  };

  // Handler Hapus Komentar (hanya pemilik komentar)
  const handleDeleteComment = (commentId: string) => {
    if (!activeCommentItem) return;
    setFeed((prevFeed) =>
      prevFeed.map((item) => {
        if (item.id === activeCommentItem.id) {
          return {
            ...item,
            comments: (item.comments || []).filter((comm) => comm.id !== commentId),
          };
        }
        return item;
      })
    );
    setActiveCommentItem((prev) =>
      prev
        ? {
            ...prev,
            comments: (prev.comments || []).filter((comm) => comm.id !== commentId),
          }
        : null
    );
    setStats((prev) => ({
      ...prev,
      komentar: Math.max(0, prev.komentar - 1),
    }));
    showToast("Komentar berhasil dihapus");
  };

  // Handler Kirim Komentar Baru (Wajib Login Google)
  const handleSubmitComment = () => {
    if (currentBanStatus.isBanned) {
      showToast("Tabe' akun Anda telah ditangguhkan karena melanggar aturan komunitas.");
      return;
    }
    if (!currentUser) {
      setLoginRedirectMessage("Masuk dengan Akun Google terlebih dahulu untuk mengirim komentar.");
      setViewMode("login");
      return;
    }
    if (!commentInputText.trim() || !activeCommentItem) return;
    const text = commentInputText.trim();
    const newComment = {
      id: `c-${Date.now()}`,
      user: userName,
      text: text,
      time: "Baru saja",
      likes: 0,
      isLiked: false,
    };

    setFeed((prev) =>
      prev.map((item) =>
        item.id === activeCommentItem.id
          ? {
              ...item,
              comments: [...(item.comments || []), newComment],
            }
          : item
      )
    );
    setActiveCommentItem((prev) =>
      prev
        ? {
            ...prev,
            comments: [...(prev.comments || []), newComment],
          }
        : null
    );
    setCommentInputText("");
    setStats((prev) => ({ ...prev, komentar: prev.komentar + 1 }));
    showToast("Komentar terkirim!");

    // Simpan komentar ke Firestore database
    addCommentToFirestore(activeCommentItem.id, newComment);
  };

  // Cek apakah ketiga syarat (media, deskripsi, lokasi) sudah terisi lengkap
  const isPublishReady =
    Boolean(selectedImage) &&
    description.trim().length > 0 &&
    selectedLocation.trim().length > 0;

  // Fungsi Posting Baru ke Feed & Postingan Kamu
  const handleCreatePost = () => {
    if (currentBanStatus.isBanned) {
      showToast("Tabe' akun Anda telah ditangguhkan karena melanggar aturan komunitas.");
      return;
    }
    if (!currentUser) {
      setLoginRedirectMessage("Silakan masuk dengan Akun Google terlebih dahulu untuk menerbitkan kabar.");
      setViewMode("login");
      return;
    }
    if (!selectedImage) {
      showToast("Pilih foto atau video terlebih dahulu!");
      return;
    }
    if (!description.trim()) {
      showToast("Tulis deskripsi kabar terlebih dahulu!");
      return;
    }
    if (!selectedLocation.trim()) {
      showToast("Isi lokasi kabar terlebih dahulu!");
      return;
    }

    // Ambil snapshot data form saat tombol diklik
    const mediaToUpload = selectedFile || selectedImage;
    const initialMediaUrl = selectedImage;
    const initialThumbnailUrl = selectedThumbnail || (selectedMediaType === "image" ? selectedImage : undefined);
    const currentMediaType = selectedMediaType;
    const finalDesc = description.trim().slice(0, 500);
    const finalLoc = selectedLocation.trim().slice(0, 30);
    const postTitle = finalDesc.split("\n")[0].slice(0, 24) || "Momen Spesial";
    const feedId = `feed-${Date.now()}`;
    const postId = `post-${Date.now()}`;

    // LANGSUNG KOSONGKAN FORM (Media, Deskripsi, dan Lokasi HILANG SEKETIKA agar bisa langsung posting lagi)
    setSelectedImage(null);
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setDescription("");
    setSelectedLocation("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }

    showToast("Sedang mengunggah media...");
    setUploadStatus("uploading");

    // PROSES UPLOAD DI LATAR BELAKANG (Indikator di bawah papan tombol)
    setUploadingCount((prev) => prev + 1);

    (async () => {
      let finalMediaUrl = initialMediaUrl;
      let finalThumbnailUrl = initialThumbnailUrl;
      let uploadedFileId: string | undefined;
      let uploadedThumbFileId: string | undefined;

      try {
        // Unggah media utama ke ImageKit CDN
        const uploadRes = await uploadToImageKit(
          mediaToUpload,
          `kareba_${Date.now()}.${currentMediaType === "video" ? "mp4" : "jpg"}`
        );
        if (uploadRes && uploadRes.url) {
          finalMediaUrl = uploadRes.url;
          uploadedFileId = uploadRes.fileId;
          if (!finalThumbnailUrl && uploadRes.thumbnailUrl) {
            finalThumbnailUrl = uploadRes.thumbnailUrl;
          }
        }

        // Jika video memiliki cover thumbnail terpisah
        if (currentMediaType === "video" && initialThumbnailUrl && initialThumbnailUrl.startsWith("data:")) {
          const thumbRes = await uploadToImageKit(
            initialThumbnailUrl,
            `thumb_${Date.now()}.jpg`
          );
          if (thumbRes && thumbRes.url) {
            finalThumbnailUrl = thumbRes.url;
            uploadedThumbFileId = thumbRes.fileId;
          }
        }
      } catch (err) {
        console.warn("Gagal unggah ke ImageKit, menggunakan cache lokal:", err);
      }

      // KABAR BARU MUNCUL DI FEED & KABAR KAMU SETELAH PROSES UNGGAH 100% SELESAI
      const newFeedItem: FeedItem = {
        id: feedId,
        user: userName,
        init: initial,
        name: userName,
        email: currentUser?.email || "iditona5@gmail.com",
        avatar: undefined,
        time: "Baru saja",
        text: finalDesc || "Momen spesial hari ini 📸",
        img: finalMediaUrl,
        thumbnail: finalThumbnailUrl,
        fileId: uploadedFileId,
        thumbFileId: uploadedThumbFileId,
        mediaType: currentMediaType,
        like: 0,
        isLiked: false,
        location: finalLoc || undefined,
        comments: [],
        isMyPost: true,
      };

      const newPostItem: PostItem = {
        id: postId,
        title: postTitle,
        loc: finalLoc || "Sulawesi Tengah",
        img: finalMediaUrl,
        thumbnail: finalThumbnailUrl,
        fileId: uploadedFileId,
        thumbFileId: uploadedThumbFileId,
        mediaType: currentMediaType,
        caption: finalDesc,
        createdAt: "Baru saja",
        name: userName,
        email: currentUser?.email || "iditona5@gmail.com",
        user: userName,
        init: initial,
        isMyPost: true,
      };

      setFeed((prev) => [newFeedItem, ...prev]);
      setPosts((prev) => [newPostItem, ...prev]);

      // Tambahkan juga ke papan teks berjalan secara instan setelah selesai
      const newBulletin: BulletinItem = {
        id: `b-${Date.now()}`,
        category: "KABAR BARU",
        text: `@${userName}: ${postTitle} — ${finalDesc.slice(0, 90)}`,
        location: finalLoc || "Kawasan Sekitar",
        time: "Baru saja",
      };
      setBulletins((prev) => [newBulletin, ...prev]);

      // Auto-scroll carousel Kabar Kamu ke paling depan agar kartu langsung kelihatan
      setTimeout(() => {
        carouselRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      }, 100);

      // Simpan ke Firestore proyek pribadi di latar belakang
      savePostToFirestore(newFeedItem, newPostItem);

      // Hentikan status loading di bawah tombol
      setUploadingCount((prev) => Math.max(0, prev - 1));
      setUploadStatus("idle");

      // Set kartu notifikasi kabar berhasil diunggah (otomatis hilang setelah 3.5 detik)
      if (uploadSuccessTimeoutRef.current) {
        clearTimeout(uploadSuccessTimeoutRef.current);
      }
      setLastUploadedPost({
        id: feedId,
        title: postTitle,
        img: finalMediaUrl,
        thumbnail: finalThumbnailUrl,
        mediaType: currentMediaType,
      });

      uploadSuccessTimeoutRef.current = setTimeout(() => {
        setLastUploadedPost(null);
      }, 3500);

      // Beri efek highlight pada kabar baru di feed
      setHighlightedPostId(feedId);
      setHighlightSource("new_upload");

      // Scroll halus layar ke postingan yang baru saja berhasil diunggah
      setTimeout(() => {
        const newPostElement = document.getElementById(`feed-post-${feedId}`);
        if (newPostElement) {
          newPostElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      // Hilangkan status highlight setelah 8 detik
      setTimeout(() => {
        setHighlightedPostId((cur) => (cur === feedId ? null : cur));
      }, 8000);
    })();
  };

  // Bagikan post
  const handleShare = (text: string, postId?: string) => {
    if (navigator.share) {
      navigator
        .share({
          title: "Kareba'Ta",
          text: text,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} - Dibagikan dari Kareba'Ta`);
      showToast("Tautan kabar berhasil disalin!");
    }
    if (postId) {
      handlePostShared(postId);
    }
  };

  // Laporkan postingan - Membuka modal pelaporan interaktif
  const handleReportPost = (postId: string, user: string, text?: string) => {
    setReportPostData({ id: postId, user, text });
    setReportReason("");
    setReportDetails("");
  };

  const handleConfirmReport = () => {
    if (!reportPostData) return;
    if (!reportReason) {
      showToast("Pilih salah satu alasan pelaporan terlebih dahulu.");
      return;
    }
    const targetUser = reportPostData.user;
    const reportItem: ReportItem = {
      id: `rep-${Date.now()}`,
      postId: reportPostData.id,
      targetUser: reportPostData.user,
      postText: reportPostData.text || "",
      reason: reportReason,
      details: reportDetails,
      reporterName: userName || "Warga",
      status: "pending",
      createdAt: Date.now(),
      timeString: "Baru saja",
    };
    submitReportToFirestore(reportItem);
    setReportPostData(null);
    showToast(`Laporan atas kabar @${targetUser} berhasil dikirim untuk ditinjau tim Kareba'Ta.`);
  };

  // FUNGSI PENGHAPUSAN SINKRON: Menghapus berita dari Feed DAN Kartu Kabar Kamu sekaligus
  const handleExecuteDeletePost = (targetId: string, mediaUrl?: string) => {
    // 1. Temukan postingan target untuk menyinkronkan ID dan URL medianya
    const feedMatch = feed.find((f) => f.id === targetId || (mediaUrl && f.img === mediaUrl));
    const postMatch = posts.find((p) => p.id === targetId || (mediaUrl && p.img === mediaUrl));
    const targetMedia = mediaUrl || feedMatch?.img || postMatch?.img;
    const allMatchingIds = new Set<string>([targetId]);
    if (feedMatch) allMatchingIds.add(feedMatch.id);
    if (postMatch) allMatchingIds.add(postMatch.id);

    // 2. Hapus dari daftar Feed Beranda
    setFeed((prev) =>
      prev.filter((item) => !allMatchingIds.has(item.id) && (!targetMedia || item.img !== targetMedia))
    );

    // 3. Hapus dari deretan Kartu Kabar Kamu
    setPosts((prev) =>
      prev.filter((item) => !allMatchingIds.has(item.id) && (!targetMedia || item.img !== targetMedia))
    );

    // 4. Hapus dari daftar postingan tersimpan
    setSavedPostIds((prev) =>
      prev.filter((id) => !allMatchingIds.has(id))
    );

    // 5. Tutup modal detail layar penuh jika postingan yang dihapus sedang terbuka
    if (
      activeDetailPost &&
      (allMatchingIds.has(activeDetailPost.id) || (targetMedia && activeDetailPost.img === targetMedia))
    ) {
      setActiveDetailPost(null);
    }

    // 6. Hapus dari Firestore
    allMatchingIds.forEach((id) => {
      deletePostFromFirestore(id);
    });

    // 7. Hapus file gambar/video dari penyimpanan ImageKit CDN
    const targetFileId = feedMatch?.fileId || postMatch?.fileId;
    if (targetFileId) {
      deleteFromImageKit(targetFileId);
    }
    const targetThumbFileId = feedMatch?.thumbFileId || postMatch?.thumbFileId;
    if (targetThumbFileId) {
      deleteFromImageKit(targetThumbFileId);
    }

    setPostToDelete(null);
    showToast("Berita Anda berhasil dihapus");
  };

  // JIKA SEDANG MEMBUKA HALAMAN DASBOR ADMIN TERPISAH
  if (viewMode === "admin") {
    return (
      <>
        <AdminDashboard
          feedPosts={feed}
          onBackToFeed={() => {
            if (typeof window !== "undefined") {
              try {
                window.history.pushState(null, "", "/");
              } catch {}
              window.location.hash = "";
            }
            setViewMode("feed");
          }}
          onPostDeleted={(postId) => {
            handleExecuteDeletePost(postId);
          }}
          onPreviewPost={(post) => {
            setActiveDetailPost({
              id: post.id,
              title: post.location || "Kabar Warga",
              loc: post.location || "Wilayah Sekitar",
              img: post.img,
              thumbnail: post.thumbnail,
              mediaType: post.mediaType,
              caption: post.text,
              createdAt: post.time,
              name: post.name,
              email: post.email,
              user: post.user,
              init: post.init,
              views: post.views,
              isMyPost: isMyPost(post),
            });
          }}
        />
        {activeDetailPost && (
          <PostDetailModal
            post={activeDetailPost}
            views={feed.find((f) => f.id === activeDetailPost.id)?.views || activeDetailPost.views || 0}
            onClose={() => setActiveDetailPost(null)}
            onShowToast={showToast}
            isOwner={activeDetailPost ? isMyPost(activeDetailPost) : false}
            isSaved={Boolean(activeDetailPost && savedPostIds.includes(activeDetailPost.id))}
            onToggleSave={handleToggleSave}
            onShare={handlePostShared}
            onDelete={(id) => {
              setPostToDelete({ id, title: activeDetailPost?.title, img: activeDetailPost?.img });
              setActiveDetailPost(null);
            }}
            onReport={(id, user) => {
              handleReportPost(id, user, activeDetailPost?.title || activeDetailPost?.caption);
              setActiveDetailPost(null);
            }}
          />
        )}
      </>
    );
  }

  // JIKA SETELAH LOGIN GOOGLE: LANGSUNG MASUK KE HALAMAN NGETIK NAMA (TIDAK PAKAI NAMA EMAIL)
  if (viewMode === "set_name") {
    return (
      <>
        <SetupUsernamePage
          currentUser={currentUser}
          initialValue={userName !== "warga_kareba" ? userName : ""}
          onSaveUsername={handleSaveUsername}
          onLogout={handleLogout}
        />
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-neutral-700 animate-slide-up">
            <span className="w-2 h-2 rounded-full bg-[#E5A000]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // JIKA SEDANG MEMBUKA HALAMAN LOGIN TERPISAH SEBELUM MUNCUL BERANDA
  if (viewMode === "login") {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={handleContinueAsGuest}
          initialMessage={loginRedirectMessage}
        />
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-neutral-700 animate-slide-up">
            <span className="w-2 h-2 rounded-full bg-[#E5A000]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-100 text-neutral-900 flex justify-center selection:bg-[#00632B] selection:text-white">
      <div id="karebata-feed-app" className="w-full max-w-md bg-white min-h-screen pb-8 relative font-sans shadow-sm flex flex-col">
        {/* INPUT TERSEMBUNYI - INI KUNCINYA, TIDAK KELIHATAN */}
        <input
          id="custom-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          id="custom-thumbnail-input"
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleThumbnailSelect}
        />
        <input
          id="native-camera-input"
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleNativeCameraCapture}
        />

        {/* NOTIFIKASI TOAST MELAYANG */}
        {toastMessage && (
          <div
            id="status-toast"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-32px)] bg-neutral-900/95 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-neutral-700 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* NOTIFIKASI MELAYANG: SEDANG MENGUNGGAH MEDIA */}
        {uploadStatus === "uploading" && (
          <div
            id="uploading-status-banner"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-32px)] bg-white border border-[#00632B]/30 text-neutral-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 animate-pulse"
          >
            <div className="w-4 h-4 border-2 border-[#00632B] border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-[#00632B]">Sedang mengunggah media...</span>
          </div>
        )}

        {/* NOTIFIKASI BESAR & JELAS: KABAR BERHASIL DIUNGGAH */}
        {lastUploadedPost && (
          <div
            id="upload-success-notification"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-sm bg-white border-2 border-[#00632B] rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-fade-in"
          >
            {/* Thumbnail Media yang Diunggah */}
            <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 shadow-2xs relative">
              {lastUploadedPost.mediaType === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white">
                  <Video className="w-5 h-5 text-emerald-400" />
                </div>
              ) : lastUploadedPost.img ? (
                <img
                  src={lastUploadedPost.thumbnail || lastUploadedPost.img}
                  alt={lastUploadedPost.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-[#00632B] m-auto" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00632B]">
                <CheckCircle2 className="w-4 h-4 text-[#00632B] shrink-0" />
                <span>Berita berhasil di unggah</span>
              </div>
              <p className="text-xs font-medium text-neutral-800 truncate mt-0.5">
                {lastUploadedPost.title}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (uploadSuccessTimeoutRef.current) {
                    clearTimeout(uploadSuccessTimeoutRef.current);
                  }
                  const target = feed.find((f) => f.id === lastUploadedPost.id) || posts.find((p) => p.id === lastUploadedPost.id);
                  if (target) {
                    handleOpenCardInFeed(target as any);
                  }
                  setLastUploadedPost(null);
                }}
                className="px-2.5 py-1.5 bg-[#00632B] hover:bg-[#004f22] text-white text-[11px] font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
              >
                Lihat
              </button>
              <button
                type="button"
                onClick={() => {
                  if (uploadSuccessTimeoutRef.current) {
                    clearTimeout(uploadSuccessTimeoutRef.current);
                  }
                  setLastUploadedPost(null);
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* APP HEADER & PAPAN TEKS BERJALAN DI BAWAH BAR - Bebas getar/goyang saat mentok scroll */}
        <div
          className="sticky top-0 z-40 bg-white w-full"
          style={{
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <header
            id="karebata-feed-header"
            className="bg-white border-b border-neutral-200 px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between transition-all duration-150 min-h-[53px]"
          >
            {isSearchOpen ? (
              /* SAAT PENCARIAN AKTIF: LOGO, ICON KAMERA, DAN ICON MEDIA HILANG, TAMPIL PAPAN PENCARIAN */
              <div className="w-full flex flex-col gap-2 py-1 animate-fade-in">
                <div className="w-full flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2.5 bg-neutral-100 rounded-full px-3.5 py-1.5 border border-neutral-300 focus-within:border-[#00632B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00632B]/20 transition">
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      id="header-search-input"
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onFocus={() => setIsSearchSuggestionsOpen(true)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery.trim()) {
                          setIsSearchSuggestionsOpen(false);
                          const container = document.getElementById("feed-vertical-container");
                          if (container) {
                            container.scrollIntoView({ behavior: "smooth" });
                          }
                        }
                      }}
                      placeholder={
                        searchCategory === "account"
                          ? "Ketik nama akun (@username)..."
                          : searchCategory === "location"
                          ? "Ketik nama lokasi / tempat..."
                          : searchCategory === "news"
                          ? "Ketik kata kunci berita / topik..."
                          : "Cari berita, lokasi, atau nama akun..."
                      }
                      className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setHighlightedPostId(null);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-200 transition cursor-pointer"
                        aria-label="Hapus ketikan"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    id="search-header-cancel-btn"
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setIsSearchSuggestionsOpen(false);
                      setSearchCategory("all");
                      setSearchQuery("");
                      setHighlightedPostId(null);
                      scrollToTop();
                    }}
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer shrink-0"
                  >
                    Batal
                  </button>
                </div>

                {/* TAB FILTER KATEGORI: SEMUA | AKUN | LOKASI | BERITA */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setSearchCategory("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      searchCategory === "all"
                        ? "bg-[#00632B] text-white shadow-2xs"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchCategory("account")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                      searchCategory === "account"
                        ? "bg-[#00632B] text-white shadow-2xs"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Akun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchCategory("location")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                      searchCategory === "location"
                        ? "bg-[#00632B] text-white shadow-2xs"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Lokasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchCategory("news")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                      searchCategory === "news"
                        ? "bg-[#00632B] text-white shadow-2xs"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Berita</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SAAT PENCARIAN TIDAK AKTIF: LOGO DI KIRI, ICON PENCARIAN, KAMERA, DAN MEDIA DI KANAN */
              <>
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="flex items-center text-left hover:opacity-80 active:scale-95 transition cursor-pointer"
                  aria-label="Kembali ke media paling atas"
                >
                  <KarebaTaLogo />
                </button>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    id="header-search-trigger"
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setIsSearchSuggestionsOpen(true);
                    }}
                    className="p-2 text-neutral-800 hover:text-[#00632B] transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
                    aria-label="Cari"
                  >
                    <Search className="w-6 h-6" strokeWidth={2} />
                  </button>
                  <button
                    id="header-camera-trigger"
                    type="button"
                    onClick={handleCameraClick}
                    className="p-2 text-neutral-800 hover:text-[#00632B] transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
                    aria-label="Kamera"
                  >
                    <CameraIcon className="w-6 h-6" strokeWidth={2} />
                  </button>
                  <button
                    id="header-gallery-trigger"
                    type="button"
                    onClick={handleGalleryClick}
                    className="p-2 text-neutral-800 hover:text-[#00632B] transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
                    aria-label="Galeri Media"
                  >
                    <ImageIcon className="w-6 h-6" strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </header>

          {/* Papan Teks Berjalan di Bawah Bar */}
          <RunningTextBar
            announcements={bulletins}
            onItemClick={(text) => {
              showToast(text);
            }}
          />
        </div>

        {/* FITUR TARIK/GESER KE BAWAH UNTUK MEMPERBARUI (PULL-TO-REFRESH KUSTOM DENGAN KONTEN TETAP KOKOH TANPA TERGESER TURUN) */}
        <PullToRefresh onRefresh={handlePullRefresh}>
          {/* PROFIL WARGA */}
          <section id="profile-section" className="w-full p-4 flex items-center justify-between bg-white border-b border-neutral-100">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Foto Profil: Selalu menampilkan huruf pertama nama pengguna */}
            <div className="relative shrink-0">
              {currentUser ? (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] ring-2 ring-[#E5A000] ring-offset-2 ring-offset-white flex items-center justify-center text-2xl font-extrabold shadow-sm text-white select-none">
                  {initial}
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] ring-2 ring-[#E5A000] ring-offset-2 ring-offset-white flex items-center justify-center text-white shadow-xs">
                  <UserIcon className="w-7 h-7 text-white" />
                </div>
              )}
              {currentUser && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" aria-label="Sedang Aktif" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-bold text-base sm:text-lg text-neutral-900 tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                  {currentUser ? userName : "Warga Kareba"}
                </h2>
                {currentUser && (
                  <button
                    id="edit-username-pencil-icon"
                    type="button"
                    onClick={() => {
                      setNewUserNameInput(userName);
                      setIsEditProfileOpen(true);
                    }}
                    className="p-1 rounded-md text-neutral-400 hover:text-[#00632B] hover:bg-neutral-100 transition active:scale-90 cursor-pointer shrink-0"
                    aria-label="Edit nama pengguna"
                  >
                    <Pencil className="w-3.5 h-3.5 text-neutral-500 hover:text-[#00632B]" />
                  </button>
                )}
              </div>
              <p className="text-neutral-500 text-xs mt-0.5 whitespace-nowrap">
                {currentUser ? `@${userName}` : "Pengunjung"}
              </p>
            </div>
          </div>
          {currentUser ? (
            <div className="flex items-center gap-2 shrink-0">
              {isUserAdmin(currentUser.email) && (
                <button
                  id="header-admin-dashboard-btn"
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.hash = "#admin";
                    }
                    setViewMode("admin");
                  }}
                  className="p-1.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/80 transition active:scale-90 cursor-pointer shadow-2xs flex items-center justify-center"
                  aria-label="Khusus"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </button>
              )}
              <button
                id="edit-username-profile-btn"
                type="button"
                onClick={() => {
                  setNewUserNameInput("");
                  setIsEditProfileOpen(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg border border-neutral-200 transition active:scale-95 cursor-pointer"
                aria-label="Edit nama pengguna"
              >
                <Pencil className="w-3 h-3 text-neutral-500" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition active:scale-95 cursor-pointer"
                aria-label="Keluar akun Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPendingUploadAction(null);
                setLoginRedirectMessage(null);
                setViewMode("login");
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#00632B] hover:bg-[#004f22] rounded-lg border border-emerald-700 shadow-xs transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
              aria-label="Masuk dengan Google"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Masuk Google</span>
            </button>
          )}
        </section>

        {/* PERINGATAN RESMI JIKA AKUN DITANGGUHKAN OLEH ADMIN */}
        {currentBanStatus.isBanned && (
          <div id="banned-account-alert" className="mx-4 my-3 p-4 bg-gradient-to-r from-rose-50 via-red-50 to-rose-100/80 border-2 border-rose-300 rounded-2xl shadow-sm text-rose-950 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base text-rose-950 leading-snug">
                  Tabe' akun Anda telah ditangguhkan karena melanggar aturan komunitas.
                </h3>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  Fitur untuk membuat postingan kabar baru dan mengirim komentar telah dinonaktifkan sementara oleh Pengelola.
                </p>
                {currentBanStatus.banRecord?.reason && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 border border-rose-200 rounded-lg text-xs font-semibold text-rose-900">
                    <span>Alasan:</span>
                    <span className="font-normal">{currentBanStatus.banRecord.reason}</span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Hubungi Admin via WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATS - RAPAT KANAN KIRI: ICON DI ATAS, ANGKA DI BAWAH, SEMUA ICON MONOKROM / TIDAK BERWARNA */}
        <section id="stats-section" className="w-full flex items-center justify-around py-2.5 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex-1 flex flex-col items-center justify-center py-0.5" aria-label="Suka kabar kamu">
            <div className="flex items-center justify-center text-neutral-700 mb-1" aria-label="Icon Suka">
              <Heart className="w-4 h-4 text-neutral-700" />
            </div>
            <p className="font-bold text-base text-neutral-900 leading-tight">
              {myTotalLikes > 0
                ? (myTotalLikes >= 1000 ? `${(myTotalLikes / 1000).toFixed(1)}k` : myTotalLikes)
                : 0}
            </p>
          </div>
          <div className="w-px h-7 bg-neutral-200" />
          <div className="flex-1 flex flex-col items-center justify-center py-0.5" aria-label="Total kabar kamu dibagikan">
            <div className="flex items-center justify-center text-neutral-700 mb-1" aria-label="Icon Bagikan">
              <Share2 className="w-4 h-4 text-neutral-700" />
            </div>
            <p className="font-bold text-base text-neutral-900 leading-tight">
              {myTotalShares > 0
                ? (myTotalShares >= 1000 ? `${(myTotalShares / 1000).toFixed(1)}k` : myTotalShares)
                : 0}
            </p>
          </div>
          <div className="w-px h-7 bg-neutral-200" />
          <div
            className="flex-1 flex flex-col items-center justify-center py-0.5"
            aria-label="Total kabar kamu disimpan"
          >
            <div className="flex items-center justify-center text-neutral-700 mb-1" aria-label="Icon Simpan">
              <Bookmark className="w-4 h-4 text-neutral-700" />
            </div>
            <p className="font-bold text-base text-neutral-900 leading-tight">
              {myTotalSaves > 0
                ? (myTotalSaves >= 1000 ? `${(myTotalSaves / 1000).toFixed(1)}k` : myTotalSaves)
                : 0}
            </p>
          </div>
        </section>

        {/* HORIZONTAL: KABAR KAMU / KABAR TERSIMPAN */}
        <section id="my-posts-carousel" className="w-full py-4 border-b border-neutral-200 bg-white">
          <div className="flex items-center justify-between mb-3 pl-2.5 pr-4">
            <h2 className="font-bold text-sm tracking-tight text-neutral-900 flex items-center gap-2">
              {showSavedSection ? (
                <>
                  <Bookmark className="w-4 h-4 fill-[#00632B] text-[#00632B]" />
                  <span>Kabar Tersimpan</span>
                </>
              ) : (
                <>
                  <span>Kabar kamu</span>
                  <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
                    {posts.length}
                  </span>
                </>
              )}
            </h2>
            <button
              id="saved-posts-count-badge"
              type="button"
              onClick={() => setShowSavedSection((prev) => !prev)}
              className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition active:scale-95 cursor-pointer shadow-2xs ${
                showSavedSection
                  ? "bg-[#00632B] text-white border-[#00632B] shadow-xs"
                  : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border-neutral-200"
              }`}
              aria-label="Tersimpan"
            >
              <Bookmark
                className={`w-3.5 h-3.5 transition-colors ${
                  showSavedSection ? "fill-white text-white" : "fill-[#00632B] text-[#00632B]"
                }`}
              />
              <span className={showSavedSection ? "text-white" : "text-neutral-800"}>
                Tersimpan ({savedItems.length})
              </span>
            </button>
          </div>

          {/* KETIKA KARTU SIMPAN MUNCUL: TAMPILKAN KARTU TERSIMPAN DAN SEMBUNYIKAN KARTU KABAR KAMU */}
          {showSavedSection ? (
            savedItems.length === 0 ? (
              <div className="p-4 mx-2.5 rounded-xl bg-emerald-50/70 border border-dashed border-[#00632B]/30 text-center animate-fade-in">
                <Bookmark className="w-5 h-5 text-[#00632B] mx-auto mb-1" />
                <p className="text-xs text-neutral-700 font-medium">Belum ada kabar yang tersimpan</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 mb-2">
                  Tandai kabar dengan icon simpan untuk melihatnya di sini.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSavedSection(false)}
                  className="text-xs text-[#00632B] font-semibold hover:underline cursor-pointer"
                >
                  Kembali ke Kabar Kamu
                </button>
              </div>
            ) : (
              <CardCarousel id="saved-posts-carousel" className="animate-fade-in">
                {savedItems.map((p) => {
                  const isVid =
                    p.mediaType === "video" ||
                    p.img?.startsWith("data:video") ||
                    p.img?.includes(".mp4") ||
                    p.img?.includes("video");

                  return (
                    <div
                      key={`saved-${p.id}`}
                      id={`saved-card-${p.id}`}
                      data-card-item="true"
                      onClick={() => {
                        if (!(window as any).__KAREBATA_IS_DRAGGING_CARD__) {
                          handleOpenCardInFeed(p);
                        }
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      className="relative w-[125px] min-w-[125px] max-w-[125px] bg-emerald-50/80 hover:bg-emerald-100/70 rounded-xl p-2 cursor-pointer transition-colors border border-emerald-200/80 shadow-xs shrink-0 select-none"
                      style={{ WebkitTouchCallout: "none" }}
                    >
                      <div className="relative overflow-hidden rounded-lg bg-neutral-100 h-20 w-full flex items-center justify-center select-none">
                        {isVid ? (
                          <div className="relative h-20 w-full bg-neutral-100 flex items-center justify-center overflow-hidden rounded-lg">
                            <img
                              src={p.thumbnail || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80"}
                              alt={p.title}
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                              className="h-20 w-full object-cover rounded-lg pointer-events-none select-none"
                              style={{ WebkitTouchCallout: "none" }}
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                              <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-sm border border-white/20">
                                <Play className="w-3 h-3 fill-white translate-x-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={p.img}
                            alt={p.title}
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            className="h-20 w-full object-cover rounded-lg pointer-events-none select-none"
                            style={{ WebkitTouchCallout: "none" }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-white backdrop-blur-xs flex items-center gap-1 z-10 font-medium">
                          {isVid ? (
                            <>
                              <Video className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Video</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-2.5 h-2.5 text-amber-400" />
                              <span>Foto</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 font-bold text-neutral-900 truncate">{p.title}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{p.loc}</p>
                    </div>
                  );
                })}
              </CardCarousel>
            )
          ) : (
            /* KARTU KABAR KAMU (TAMPIL KETIKA KARTU TERSIMPAN TIDAK AKTIF) */
            <CardCarousel id="user-posts-carousel" className="animate-fade-in">
              {posts.map((p) => {
                const isVid =
                  p.mediaType === "video" ||
                  p.img?.startsWith("data:video") ||
                  p.img?.includes(".mp4") ||
                  p.img?.includes("video");

                return (
                  <div
                    key={p.id}
                    id={`user-post-card-${p.id}`}
                    data-card-item="true"
                    onClick={() => {
                      if (!(window as any).__KAREBATA_IS_DRAGGING_CARD__) {
                        handleOpenCardInFeed(p);
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative w-[125px] min-w-[125px] max-w-[125px] bg-neutral-50 hover:bg-neutral-100 rounded-xl p-2 cursor-pointer transition-colors border border-neutral-200 shadow-xs shrink-0 select-none group"
                    style={{ WebkitTouchCallout: "none" }}
                  >
                    <div className="relative overflow-hidden rounded-lg bg-neutral-100 h-20 w-full flex items-center justify-center select-none">
                      {isVid ? (
                        <div className="relative h-20 w-full bg-neutral-100 flex items-center justify-center overflow-hidden rounded-lg">
                          <img
                            src={p.thumbnail || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80"}
                            alt={p.title}
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            className="h-20 w-full object-cover rounded-lg pointer-events-none select-none"
                            style={{ WebkitTouchCallout: "none" }}
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                            <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-sm border border-white/20">
                              <Play className="w-3 h-3 fill-white translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={p.img}
                          alt={p.title}
                          loading="eager"
                          decoding="async"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className="h-20 w-full object-cover rounded-lg pointer-events-none select-none"
                          style={{ WebkitTouchCallout: "none" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span className="absolute bottom-1 right-1 text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-white backdrop-blur-xs flex items-center gap-1 z-10 font-medium">
                        {isVid ? (
                          <>
                            <Video className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Video</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-2.5 h-2.5 text-amber-400" />
                            <span>Foto</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5 font-bold text-neutral-900 truncate">{p.title}</p>
                    <p className="text-[10px] text-neutral-500 truncate">{p.loc}</p>
                  </div>
                );
              })}
            </CardCarousel>
          )}
        </section>

        {/* PEMBATAS SECTION RAPAT & GARIS ABU-ABU TERANG */}
        <div className="w-full h-[2px] bg-neutral-200" aria-hidden="true" />

        {/* FORM KABAR MEDIA - MUNCUL SAAT FOTO/VIDEO DIPILIH */}
        {selectedImage && (
          <>
            <section id="media-post-composer-card" className="w-full bg-white p-4 space-y-3">
              {/* Pratinjau Foto/Video Bersih & Sederhana */}
              <div id="composer-thumbnail-card" className="flex items-center gap-3 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                {/* Kotak Foto / Video Terpilih (Tidak dapat diklik) */}
                <div className="relative w-20 h-20 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 shadow-2xs select-none">
                  {selectedMediaType === "video" ? (
                    selectedThumbnail ? (
                      <img
                        src={selectedThumbnail}
                        alt="Foto terpilih"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-neutral-400" />
                      </div>
                    )
                  ) : (
                    <img
                      src={selectedImage}
                      alt="Foto terpilih"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {selectedMediaType === "video" && (
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Video className="w-2.5 h-2.5 text-[#00632B]" />
                    </span>
                  )}
                </div>

                {/* Keterangan & Tombol Ganti / Hapus */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-neutral-800">
                    {selectedMediaType === "video" ? "Video siap dibagikan" : "Foto siap dibagikan"}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleGalleryClick}
                      className="text-xs text-[#00632B] hover:text-[#004f22] font-semibold cursor-pointer"
                    >
                      Ganti Foto
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      id="delete-selected-image-btn"
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setSelectedFile(null);
                        setSelectedThumbnail(null);
                        setDescription("");
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>

              {/* KETIK DESKRIPSI KABAR (BATAS 500 HURUF) */}
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 focus-within:border-[#00632B] focus-within:bg-white transition space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="post-description-input" className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 text-[#00632B]" /> Deskripsi Kabar:
                  </label>
                  <span className={`text-[11px] font-medium ${description.length >= 500 ? "text-red-600 font-bold" : "text-neutral-400"}`}>
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  id="post-description-input"
                  value={description}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Ketik deskripsi kabar Anda, cerita atau peristiwa... (maks. 500 huruf)"
                  className="bg-transparent w-full outline-none text-base sm:text-sm text-neutral-900 placeholder-neutral-400 resize-none"
                  autoFocus
                />
              </div>

              {/* KETIK LOKASI MANUAL (BATAS 30 HURUF) */}
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 focus-within:border-[#00632B] focus-within:bg-white transition space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="post-location-input" className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-yellow-500" /> Ketik Lokasi Manual:
                  </label>
                  <span className={`text-[11px] font-medium ${selectedLocation.length >= 30 ? "text-red-600 font-bold" : "text-neutral-400"}`}>
                    {selectedLocation.length}/30
                  </span>
                </div>
                <input
                  id="post-location-input"
                  type="text"
                  maxLength={30}
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value.slice(0, 30))}
                  placeholder="Ketik lokasi (contoh: Danau Tempe, Sengkang)..."
                  className="bg-transparent w-full outline-none text-base sm:text-sm text-neutral-900 placeholder-neutral-400"
                />
              </div>

              {/* Indikator Kelengkapan Syarat Posting */}
              <div className="flex items-center justify-between text-[11px] px-1 text-neutral-500">
                <span className="font-semibold text-neutral-600">Syarat Publikasi:</span>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-0.5 ${selectedImage ? "text-emerald-600 font-bold" : "text-neutral-400"}`}>
                    {selectedImage ? "✓" : "○"} Media
                  </span>
                  <span className={`flex items-center gap-0.5 ${description.trim() ? "text-emerald-600 font-bold" : "text-neutral-400"}`}>
                    {description.trim() ? "✓" : "○"} Deskripsi
                  </span>
                  <span className={`flex items-center gap-0.5 ${selectedLocation.trim() ? "text-emerald-600 font-bold" : "text-neutral-400"}`}>
                    {selectedLocation.trim() ? "✓" : "○"} Lokasi
                  </span>
                </div>
              </div>

              {/* Tombol Publikasi Kabar - Bebas dari loading, orang bisa langsung posting lagi */}
              <button
                id="publish-post-btn"
                type="button"
                disabled={!isPublishReady}
                onClick={handleCreatePost}
                className={`w-full py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                  isPublishReady
                    ? "bg-[#00632B] hover:bg-[#004f22] text-white cursor-pointer shadow-sm active:scale-[0.99]"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Bagikan kabar sekarang</span>
              </button>

              {/* Indikator Proses Loading Upload di Bawah Papan Tombol */}
              {uploadingCount > 0 && (
                <div className="w-full mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-4 h-4 border-2 border-[#00632B] border-t-transparent rounded-full animate-spin shrink-0" />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="font-bold text-neutral-900 text-xs truncate">
                        {uploadingCount > 1
                          ? `Sedang mengunggah ${uploadingCount} berita...`
                          : "Sedang mengunggah berita..."}
                      </span>
                      <span className="text-[11px] text-neutral-500 mt-0.5">
                        Formulir kosong & siap dipakai untuk posting lagi.
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-[#00632B] bg-white px-2 py-0.5 rounded-full border border-emerald-100 shadow-2xs shrink-0">
                    Latar Belakang
                  </span>
                </div>
              )}
            </section>
            <div className="w-full h-[2px] bg-neutral-200" aria-hidden="true" />
          </>
        )}

        {/* PEMBATAS SECTION RAPAT & GARIS ABU-ABU TERANG */}
        <div className="w-full h-[2px] bg-neutral-200" aria-hidden="true" />

        {/* FEED VERTIKAL WARGA - SEMUA KARTU RAPAT & DIBERI GARIS PEMBATAS ABU-ABU TERANG */}
        <section id="feed-vertical-container" className="w-full bg-white">
          <div className="w-full px-4 pt-3.5 pb-2.5 bg-white border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {searchQuery.trim() ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    {searchCategory === "account" || searchQuery.startsWith("@") ? (
                      <div className="w-6 h-6 rounded-full bg-[#00632B]/10 flex items-center justify-center text-[#00632B] shrink-0">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                    ) : searchCategory === "location" || searchQuery.toLowerCase().startsWith("lokasi:") ? (
                      <div className="w-6 h-6 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                      </div>
                    ) : searchCategory === "news" || searchQuery.toLowerCase().startsWith("berita:") ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-[#00632B] shrink-0">
                        <Newspaper className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 shrink-0">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="font-bold text-sm tracking-tight text-neutral-900 truncate">
                        {searchCategory === "account" || searchQuery.startsWith("@")
                          ? `Postingan @${searchQuery.replace(/^@+/, "")}`
                          : searchCategory === "location" || searchQuery.toLowerCase().startsWith("lokasi:")
                          ? `Lokasi: ${searchQuery.replace(/^lokasi:\s*/i, "")}`
                          : searchCategory === "news" || searchQuery.toLowerCase().startsWith("berita:")
                          ? `Berita: "${searchQuery.replace(/^berita:\s*/i, "")}"`
                          : `Hasil: "${searchQuery}"`}
                      </h2>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {searchCategory === "account" || searchQuery.startsWith("@")
                          ? "Hanya postingan milik akun ini yang ditampilkan"
                          : searchCategory === "location" || searchQuery.toLowerCase().startsWith("lokasi:")
                          ? "Semua kabar dengan lokasi yang sama"
                          : searchCategory === "news"
                          ? "Kabar dengan topik berita yang cocok"
                          : "Pencarian di seluruh kategori"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <h2 className="font-bold text-sm tracking-tight text-neutral-900">
                    Kabar Warga
                  </h2>
                )}
              </div>

              {searchQuery.trim() ? (
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-[#00632B] font-semibold whitespace-nowrap">
                    {displayFeed.length} kabar
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchCategory("all");
                      setIsSearchOpen(false);
                      setIsSearchSuggestionsOpen(false);
                      setHighlightedPostId(null);
                      scrollToTop();
                    }}
                    className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-full font-medium transition cursor-pointer whitespace-nowrap"
                  >
                    Kembali
                  </button>
                </div>
              ) : (
                <button
                  id="help-kabar-warga-btn"
                  type="button"
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                      helpBtnTouchRef.current = {
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY,
                        moved: false,
                      };
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length > 0) {
                      const dx = Math.abs(e.touches[0].clientX - helpBtnTouchRef.current.x);
                      const dy = Math.abs(e.touches[0].clientY - helpBtnTouchRef.current.y);
                      if (dx > 6 || dy > 6) {
                        helpBtnTouchRef.current.moved = true;
                      }
                    }
                  }}
                  onTouchEnd={() => {
                    if (helpBtnTouchRef.current.moved) {
                      setTimeout(() => {
                        helpBtnTouchRef.current.moved = false;
                      }, 300);
                    }
                  }}
                  onClick={(e) => {
                    if (helpBtnTouchRef.current.moved) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    setIsHelpOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-amber-950 bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 hover:from-amber-200 hover:to-yellow-200 active:from-amber-300 active:to-yellow-300 rounded-lg border border-amber-300/80 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0 ml-2"
                  aria-label="Layanan Pasang Iklan Sponsor & Promosi UMKM"
                >
                  <Megaphone className="w-3 h-3 text-amber-700" />
                  <span>Pasang Iklan</span>
                </button>
              )}
            </div>

            {/* Filter Cepat di Feed Saat Pencarian Aktif */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-neutral-100 overflow-x-auto no-scrollbar">
                <span className="text-[10px] uppercase font-bold text-neutral-400 mr-0.5 shrink-0">Filter:</span>
                <button
                  type="button"
                  onClick={() => setSearchCategory("all")}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    searchCategory === "all"
                      ? "bg-[#00632B] text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory("account")}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                    searchCategory === "account"
                      ? "bg-[#00632B] text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                  }`}
                >
                  <UserIcon className="w-3 h-3" />
                  <span>Akun Milik Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory("location")}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                    searchCategory === "location"
                      ? "bg-[#00632B] text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                  }`}
                >
                  <MapPin className="w-3 h-3 text-yellow-500" />
                  <span>Lokasi Sama</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory("news")}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                    searchCategory === "news"
                      ? "bg-[#00632B] text-white"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                  }`}
                >
                  <Newspaper className="w-3 h-3 text-emerald-500" />
                  <span>Berita Sama</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full bg-white">
            {displayFeed.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Search className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-semibold text-neutral-700">Tidak ada kabar ditemukan</p>
                <p className="text-xs text-neutral-400">
                  {searchCategory === "account"
                    ? `Tidak ada postingan yang dibuat oleh akun "${searchQuery.replace(/^@+/, "")}".`
                    : searchCategory === "location"
                    ? `Tidak ada kabar dari lokasi "${searchQuery.replace(/^lokasi:\s*/i, "")}".`
                    : searchCategory === "news"
                    ? `Tidak ada berita yang cocok dengan "${searchQuery.replace(/^berita:\s*/i, "")}".`
                    : `Tidak ditemukan kabar warga dengan kata kunci "${searchQuery}".`}
                </p>
                {searchCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSearchCategory("all")}
                    className="mt-1 text-xs text-[#00632B] font-semibold hover:underline block mx-auto cursor-pointer"
                  >
                    Coba cari di semua kategori
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchCategory("all");
                    setIsSearchOpen(false);
                    setIsSearchSuggestionsOpen(false);
                    setHighlightedPostId(null);
                    scrollToTop();
                  }}
                  className="mt-2 text-xs bg-[#00632B] hover:bg-[#004f22] text-white font-medium px-4 py-2 rounded-full cursor-pointer shadow-xs transition"
                >
                  Kembali ke Semua Kabar
                </button>
              </div>
            ) : (
              displayFeed.map((f, index) => (
              <Fragment key={f.id}>
                {index > 0 && (
                  <div
                    id={`post-divider-${index}`}
                    className="w-full h-[2px] bg-neutral-200"
                    aria-hidden="true"
                  />
                )}
                <article
                  id={`feed-post-${f.id}`}
                  data-post-id={f.id}
                  className={`w-full bg-white space-y-3 pt-3.5 pb-4 ${
                    highlightedPostId === f.id
                      ? "ring-2 ring-[#00632B] bg-[#00632B]/5 shadow-md rounded-2xl"
                      : ""
                  }`}
                >
                  {/* Penanda bahwa postingan ini baru saja diunggah */}
                  {highlightedPostId === f.id && highlightSource === "new_upload" && (
                    <div className="mx-4 px-3.5 py-2 bg-gradient-to-r from-[#00632B] to-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center justify-between shadow-xs animate-pulse">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Kabar Anda berhasil diterbitkan & kini aktif!</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Baru Saja</span>
                    </div>
                  )}

                  {/* Penanda bahwa postingan ini dibuka dari klik kartu */}
                  {highlightedPostId === f.id && highlightSource === "card" && (
                    <div className="mx-4 px-3 py-1.5 bg-[#00632B] text-white text-[11px] font-semibold rounded-lg flex items-center justify-between shadow-xs animate-pulse">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kabar dari kartu yang Anda buka</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Kabar Warga</span>
                    </div>
                  )}

                  {/* Penanda temuan pencarian langsung di media kabar */}
                  {highlightedPostId === f.id && highlightSource === "search" && (
                    <div className="mx-4 px-3 py-1.5 bg-[#00632B] text-white text-[11px] font-semibold rounded-lg flex items-center justify-between shadow-xs animate-pulse">
                      <div className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" />
                        <span>Kabar berhasil ditemukan</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Kabar Warga</span>
                    </div>
                  )}
                {/* Post Header: Nama & Waktu tetap satu baris, tidak turun ke bawah */}
                <div className="px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Foto Profil dengan Cincin Lingkar Kuning Emas */}
                    {f.avatar ? (
                      <img
                        src={f.avatar}
                        alt={f.user}
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-[#E5A000] ring-offset-1 ring-offset-white border border-[#E5A000] shadow-xs select-none"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] ring-2 ring-[#E5A000] ring-offset-1 ring-offset-white border border-[#E5A000] flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 select-none">
                        {((isMyPost(f) ? userName : f.user).trim().replace(/^@/, "")[0] || f.init || "W").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const targetUser = isMyPost(f) ? userName : f.user;
                            setSearchCategory("account");
                            setSearchQuery(`@${targetUser.replace(/^@/, "")}`);
                            setIsSearchOpen(true);
                            setIsSearchSuggestionsOpen(false);
                          }}
                          className="text-sm font-bold text-neutral-900 tracking-tight truncate max-w-[130px] sm:max-w-[180px] hover:text-[#00632B] transition cursor-pointer text-left"
                          aria-label={`Lihat hanya postingan @${f.user}`}
                        >
                          {f.user}
                        </button>
                        <span className="text-[11px] text-neutral-300 shrink-0">•</span>
                        <span className="text-[11px] text-neutral-500 font-normal shrink-0 whitespace-nowrap">
                          {f.time}
                        </span>
                      </div>
                      {f.location && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchCategory("location");
                              setSearchQuery(f.location!);
                              setIsSearchOpen(true);
                              setIsSearchSuggestionsOpen(false);
                            }}
                            className="flex items-center gap-0.5 text-neutral-600 font-medium truncate max-w-[180px] hover:text-[#00632B] transition cursor-pointer text-left"
                            aria-label={`Lihat semua postingan di ${f.location}`}
                          >
                            <MapPin className="w-3 h-3 text-yellow-500 shrink-0 inline" />
                            <span className="truncate">{f.location}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Icon Simpan di atas kanan postingan */}
                  <button
                    id={`save-feed-header-${f.id}`}
                    type="button"
                    onClick={() => handleToggleSave(f.id)}
                    className="p-1.5 text-neutral-400 hover:text-[#00632B] hover:bg-[#00632B]/10 rounded-lg transition cursor-pointer"
                    aria-label="Simpan kabar"
                  >
                    <Bookmark
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        savedPostIds.includes(f.id)
                          ? "fill-[#00632B] text-[#00632B]"
                          : "text-neutral-500 hover:text-[#00632B]"
                      }`}
                    />
                  </button>
                </div>

                {/* Media Foto/Video: Vertikal rasio 4:5 dipotong atas bawah, Horizontal rasio asli */}
                <div id={`feed-post-media-${f.id}`} className="w-full scroll-mt-20">
                  <FeedMedia
                    src={f.img}
                    thumbnail={f.thumbnail}
                    alt={f.text}
                    description={f.text}
                    mediaType={f.mediaType}
                    author={{
                      name: isMyPost(f) ? userName : (f.name || f.user || "Kawan Warga Kareba"),
                      username: isMyPost(f) ? userName : f.user,
                      email: f.email || (f.user === "kamu" ? "iditona5@gmail.com" : `${f.user}@karebata.id`),
                      location: f.location || "Kawasan Sekitar",
                      time: f.time,
                      initials: isMyPost(f)
                        ? (userName.trim().replace(/^@/, "")[0] || "W").toUpperCase()
                        : (f.user ? f.user.trim().replace(/^@/, "")[0] : f.init || "W").toUpperCase(),
                      avatar: isMyPost(f) ? undefined : f.avatar,
                      description: f.text,
                    }}
                  />
                </div>

                {/* Post Content / Deskripsi di bawah media - Hanya menampilkan selengkapnya jika teks benar-benar panjang/terpotong */}
                <div className="px-4">
                  {(() => {
                    const isLong = f.text.length > 110 || f.text.split("\n").length > 2;
                    return (
                      <div
                        id={`post-desc-container-${f.id}`}
                        onClick={() => {
                          if (isLong) {
                            toggleExpandPost(f.id);
                          }
                        }}
                        className={`select-none ${isLong ? "cursor-pointer group" : ""}`}
                      >
                        <h3
                          className={`text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-snug transition-all ${
                            isLong && !expandedPosts[f.id] ? "line-clamp-2" : ""
                          }`}
                        >
                          {f.text}
                        </h3>
                        {isLong && (
                          <span className="text-xs font-semibold text-[#00632B] hover:text-[#004f22] mt-1 inline-block">
                            {expandedPosts[f.id] ? "Tampilkan lebih sedikit" : "selengkapnya"}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Post Actions: Suka, Bagikan, Laporkan */}
                <div className="px-4 flex items-center gap-6 text-xs font-semibold text-neutral-600">
                  <button
                    id={`like-btn-${f.id}`}
                    type="button"
                    onClick={() => handleToggleLike(f.id)}
                    className={`flex items-center gap-1.5 py-1 transition ${
                      f.isLiked ? "text-red-500 font-bold" : "hover:text-red-500 text-neutral-600"
                    }`}
                    aria-label="Suka"
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform active:scale-125 ${
                        f.isLiked ? "fill-red-500 text-red-500" : "text-neutral-500"
                      }`}
                    />
                    <span>Suka</span>
                  </button>

                  <button
                    id={`share-btn-${f.id}`}
                    type="button"
                    onClick={() => setActiveSharePostId((prev) => (prev === f.id ? null : f.id))}
                    className={`flex items-center gap-1.5 py-1 transition ${
                      activeSharePostId === f.id ? "text-emerald-600 font-bold" : "hover:text-emerald-600 text-neutral-600"
                    }`}
                    aria-label="Bagikan"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan{f.shares && f.shares > 0 ? ` (${f.shares})` : ""}</span>
                  </button>

                  {/* Sesuai aturan kepemilikan:
                      - Pada postingan kita sendiri: HANYA kita yang melihat icon X (Hapus). Icon Laporkan TIDAK terlihat.
                      - Pada postingan orang lain: kita melihat icon Laporkan. Icon X (Hapus) TIDAK terlihat.
                  */}
                  {isMyPost(f) ? (
                    <button
                      id={`delete-btn-${f.id}`}
                      type="button"
                      onClick={() => setPostToDelete({ id: f.id, title: f.text, img: f.img })}
                      className="flex items-center gap-1.5 py-1 text-neutral-500 hover:text-red-600 transition cursor-pointer"
                      aria-label="Hapus kabar"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">Hapus</span>
                    </button>
                  ) : (
                    <button
                      id={`report-btn-${f.id}`}
                      type="button"
                      onClick={() => handleReportPost(f.id, f.user, f.text)}
                      className="flex items-center gap-1.5 py-1 hover:text-red-500 text-neutral-600 transition cursor-pointer"
                      aria-label="Laporkan"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Laporkan</span>
                    </button>
                  )}

                  {/* Ikon Tayangan / View (Fitur Analitik) - Posisi di samping kanan icon Laporkan/Hapus */}
                  <div
                    className="flex items-center gap-1.5 py-1 text-neutral-500 select-none ml-auto sm:ml-0"
                    aria-label={`${(f.views || 0).toLocaleString("id-ID")} kali dilihat`}
                  >
                    <Eye className="w-4 h-4 text-neutral-400" />
                    <span>{f.views ? f.views.toLocaleString("id-ID") : 0} dilihat</span>
                  </div>
                </div>

                {/* Bar Bagikan Interaktif (FB, WA, Salin) */}
                {activeSharePostId === f.id && (
                  <div className="mx-4 mt-2.5 px-3 py-0.5 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between animate-fade-in">
                    <ShareBar
                      newsUrl={window.location.href}
                      title={f.text}
                      onShared={() => {
                        handlePostShared(f.id);
                      }}
                      onShowToast={showToast}
                    />
                    <button
                      type="button"
                      onClick={() => setActiveSharePostId(null)}
                      className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition shrink-0"
                      aria-label="Tutup"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </article>

              {/* KARTU IKLAN BERSPONSOR DI SELA-SELA FEED BERITA WARGA */}
              {(() => {
                if (!adSettings.isEnabled) return null;
                const activeAds = adSettings.ads.filter((a) => a.isActive);
                if (activeAds.length === 0) return null;

                const freq = Math.max(2, adSettings.frequency || 4);
                // Selipkan iklan secara otomatis setiap kelipatan `freq` berita
                const isAdSlot = (index + 1) % freq === 0;
                if (!isAdSlot) return null;

                const slotNum = Math.floor((index + 1) / freq) - 1;
                const adToShow = activeAds[slotNum % activeAds.length];

                return (
                  <div key={`ad-slot-${f.id}-${adToShow.id}`} className="w-full">
                    <div className="w-full h-[2px] bg-neutral-200" aria-hidden="true" />
                    <SponsorAdCard
                      ad={adToShow}
                      onOpenHelp={() => setIsHelpOpen(true)}
                      onShowToast={showToast}
                    />
                  </div>
                );
              })()}
            </Fragment>
          )))}
          </div>
        </section>
        </PullToRefresh>

        {/* TOMBOL MELAYANG KEMBALI KE MEDIA DI ATAS (MUNCUL OTOMATIS SAAT TERSCROLL KE BAWAH) */}
        {showScrollTop && (
          <button
            id="scroll-to-top-btn"
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-6 right-5 z-40 bg-neutral-900/90 hover:bg-neutral-900 active:scale-95 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md border border-neutral-700/60 flex items-center gap-2 transition-all duration-200 cursor-pointer animate-fade-in group"
            aria-label="Kembali ke media paling atas"
          >
            <ChevronUp className="w-4 h-4 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-semibold tracking-tight">Ke Atas</span>
          </button>
        )}



        {/* MODAL KONFIRMASI HAPUS POSTINGAN SENDIRI */}
        {postToDelete && (
          <div
            id="delete-post-modal-overlay"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 max-w-md mx-auto animate-fade-in touch-none overscroll-contain select-none"
            onClick={() => setPostToDelete(null)}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
          >
            <div
              className="bg-white border border-neutral-200 rounded-2xl w-full p-5 space-y-4 shadow-2xl touch-auto select-auto"
              onClick={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-neutral-900">Hapus Kabar</h3>
                <button
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus kabar ini? Kabar akan dihapus dari Kareba&apos;Ta.
              </p>

              <div className="flex gap-2.5 pt-1">
                <button
                  id="cancel-delete-post-btn"
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="confirm-delete-post-btn"
                  type="button"
                  onClick={() => {
                    if (postToDelete) {
                      handleExecuteDeletePost(postToDelete.id, postToDelete.img);
                    }
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Hapus Kabar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HALAMAN / MODAL LAPORKAN KABAR - FULL SCREEN */}
        {reportPostData && (
          <div
            id="report-post-modal-overlay"
            className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto animate-fade-in"
          >
            {/* Header Full Screen */}
            <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 leading-tight">Laporkan Kabar</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Kabar oleh @{reportPostData.user}</p>
                </div>
              </div>
              <button
                id="close-report-modal-btn"
                type="button"
                onClick={() => setReportPostData(null)}
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                aria-label="Tutup Halaman Laporan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Halaman Full Screen (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Kutipan konten yang dilaporkan */}
              {reportPostData.text && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-600 italic">
                  &ldquo;{reportPostData.text}&rdquo;
                </div>
              )}

              {/* Pilihan alasan pelaporan dengan deskripsi tegas untuk asusila / sensual */}
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-2">
                  Pilih Alasan Pelaporan:
                </label>
                <div className="space-y-2">
                  {[
                    {
                      title: "Konten Asusila, Sensual & Pornografi",
                      desc: "Pakaian seksi/terbuka berlebihan, goyangan/tarian erotis, julur lidah sensual, atau gestur berbau pornografi.",
                    },
                    {
                      title: "Informasi Palsu / Hoaks",
                      desc: "Berita bohong, fitnah, atau kabar menyesatkan warga.",
                    },
                    {
                      title: "Ujaran Kebencian & Pelecehan",
                      desc: "SARA, perundungan, hinaan personal, atau pelecehan sesama warga.",
                    },
                    {
                      title: "Spam, Penipuan & Promosi Liar",
                      desc: "Iklan berulang, link berbahaya, penipuan uang, atau judi online.",
                    },
                    {
                      title: "Kekerasan & Bahaya Nyata",
                      desc: "Mendorong perkelahian, tawuran, senjata tajam, atau aksi kejahatan.",
                    },
                    {
                      title: "Pelanggaran Norma & Etika Lainnya",
                      desc: "Melanggar ketertiban dan pedoman etika komunitas Kareba'Ta.",
                    },
                  ].map((opt) => {
                    const isSelected = reportReason === opt.title;
                    return (
                      <label
                        key={opt.title}
                        onClick={() => setReportReason(opt.title)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                          isSelected
                            ? "border-red-500 bg-red-50/50 text-neutral-900 ring-1 ring-red-400 shadow-xs"
                            : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/80 text-neutral-700"
                        }`}
                      >
                        {/* Cincin Lingkaran: Abu-abu netral secara default, berubah Merah saat dipilih */}
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-2 border-red-600 bg-white ring-2 ring-red-200"
                              : "border-2 border-neutral-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-red-600 transition-transform scale-100" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="report_reason"
                          checked={isSelected}
                          onChange={() => setReportReason(opt.title)}
                          className="sr-only"
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-tight ${isSelected ? "text-red-700" : "text-neutral-900"}`}>
                            {opt.title}
                          </p>
                          <p className="text-[11px] text-neutral-500 leading-normal mt-1">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Catatan tambahan opsional */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Keterangan Tambahan <span className="text-neutral-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  id="report-details-input"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Jelaskan detail tindakan atau menit/bagian yang melanggar..."
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-red-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                Laporan Anda bersifat rahasia. Tim moderator Kareba&apos;Ta akan segera meninjau dan menghapus konten jika terbukti melanggar norma komunitas.
              </div>
            </div>

            {/* Footer Tombol Aksi Sticky di Bawah */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-4 flex gap-3 shadow-lg">
              <button
                id="cancel-report-btn"
                type="button"
                onClick={() => setReportPostData(null)}
                className="flex-1 py-3 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="submit-report-btn"
                type="button"
                onClick={handleConfirmReport}
                disabled={!reportReason}
                className={`flex-1 py-3 text-xs font-bold text-white rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                  reportReason
                    ? "bg-red-600 hover:bg-red-700 active:scale-[0.99]"
                    : "bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none"
                }`}
              >
                <Flag className="w-4 h-4" />
                <span>Kirim Laporan</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL EDIT PROFIL WARGA (IN-APP) - LATAR PUTIH */}
        {isEditProfileOpen && (
          <div
            id="edit-profile-modal-overlay"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 max-w-md mx-auto touch-none overscroll-contain select-none animate-fade-in"
            onClick={() => setIsEditProfileOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
          >
            <div
              className="bg-white border border-neutral-200 rounded-2xl w-full p-5 space-y-4 shadow-2xl touch-auto select-auto"
              onClick={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-neutral-900">Ubah Nama Pengguna</h3>
                  <p className="text-[11px] text-neutral-500">Maksimal 13 huruf</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer rounded-lg hover:bg-neutral-100 transition"
                  aria-label="Tutup modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Pratinjau Foto Profil dengan Huruf Pertama */}
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] text-white font-extrabold text-xl flex items-center justify-center shrink-0 border-2 border-[#E5A000] select-none">
                  {(newUserNameInput.trim().replace(/^@/, "")[0] || (userName[0] || "W")).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-neutral-500 font-medium">Foto Profil (Huruf Pertama Nama Pengguna):</p>
                  <p className="text-sm font-bold text-neutral-900 truncate">
                    Huruf "{(newUserNameInput.trim().replace(/^@/, "")[0] || (userName[0] || "W")).toUpperCase()}"
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="edit-username-input" className="text-xs text-neutral-600 font-medium">
                    Nama Pengguna
                  </label>
                  <span className={`text-[11px] font-semibold ${newUserNameInput.length >= 13 ? "text-amber-600" : "text-neutral-400"}`}>
                    {newUserNameInput.length}/13
                  </span>
                </div>
                <div className="relative flex items-center bg-neutral-50 rounded-xl border border-neutral-300 focus-within:border-[#00632B] focus-within:bg-white transition-all">
                  <span className="pl-3.5 text-sm font-semibold select-none text-neutral-400">
                    @
                  </span>
                  <input
                    id="edit-username-input"
                    type="text"
                    maxLength={13}
                    value={newUserNameInput.replace(/^@/, "")}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^@/, "").replace(/\s+/g, "_").slice(0, 13);
                      setNewUserNameInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newUserNameInput.trim()) {
                        const trimmed = newUserNameInput.trim().replace(/^@/, "").slice(0, 13);
                        if (trimmed) {
                          setUserName(trimmed);
                          if (currentUser) {
                            localStorage.setItem(`karebata_custom_username_${currentUser.uid}`, trimmed);
                            saveUserProfile(currentUser.uid, trimmed).catch(() => {});
                          }
                          localStorage.setItem("karebata_username", trimmed);
                          const cleanInit = (trimmed[0] || "W").toUpperCase();
                          setFeed((prev) =>
                            prev.map((item) =>
                              isMyPost(item)
                                ? { ...item, user: trimmed, name: trimmed, init: cleanInit, avatar: undefined }
                                : item
                            )
                          );
                          setPosts((prev) =>
                            prev.map((p) =>
                              isMyPost(p)
                                ? { ...p, user: trimmed, name: trimmed, init: cleanInit }
                                : p
                            )
                          );
                          setIsEditProfileOpen(false);
                          showToast(`Nama pengguna berhasil diperbarui: @${trimmed}`);
                        }
                      }
                    }}
                    placeholder="nama_kamu"
                    className="w-full py-2.5 pl-1 pr-3 bg-transparent text-sm font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-normal outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Maksimal 13 karakter huruf/angka.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="save-username-btn"
                  type="button"
                  disabled={!newUserNameInput.trim().replace(/^@/, "")}
                  onClick={() => {
                    const trimmed = newUserNameInput.trim().replace(/^@/, "").slice(0, 13);
                    if (trimmed) {
                      setUserName(trimmed);
                      if (currentUser) {
                        localStorage.setItem(`karebata_custom_username_${currentUser.uid}`, trimmed);
                        saveUserProfile(currentUser.uid, trimmed).catch(() => {});
                      }
                      localStorage.setItem("karebata_username", trimmed);
                      const cleanInit = (trimmed[0] || "W").toUpperCase();
                      setFeed((prev) =>
                        prev.map((item) =>
                          isMyPost(item)
                            ? { ...item, user: trimmed, name: trimmed, init: cleanInit, avatar: undefined }
                            : item
                        )
                      );
                      setPosts((prev) =>
                        prev.map((p) =>
                          isMyPost(p)
                            ? { ...p, user: trimmed, name: trimmed, init: cleanInit }
                            : p
                        )
                      );
                      setIsEditProfileOpen(false);
                      showToast(`Nama pengguna berhasil diperbarui: @${trimmed}`);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                    newUserNameInput.trim().replace(/^@/, "")
                      ? "bg-[#00632B] hover:bg-[#004f22] text-white cursor-pointer active:scale-95"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HALAMAN KOMENTAR LAYAR PENUH (FULL SCREEN) */}
        {activeCommentItem && (
          <div
            id="comments-fullscreen-page"
            className="fixed inset-0 z-50 bg-white flex flex-col w-full h-full overflow-hidden animate-fade-in"
          >
            {/* Header Halaman Komentar Layar Penuh */}
            <header className="px-4 py-3 sm:py-3.5 border-b border-neutral-200 bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveCommentItem(null)}
                  className="p-1.5 -ml-1.5 rounded-full text-neutral-700 hover:bg-neutral-100 transition active:scale-95 shrink-0"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-neutral-900 leading-tight">Komentar</h2>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-neutral-100 text-neutral-600 rounded-full shrink-0">
                      {activeCommentItem.comments?.length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 truncate">Kabar oleh @{activeCommentItem.user}</p>
                </div>
              </div>
            </header>

            {/* Ringkasan Singkat Postingan yang Sedang Dikomentari */}
            <div className="px-4 py-2.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center gap-3 shrink-0">
              {activeCommentItem.img && (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-200 shrink-0 border border-neutral-200">
                  {activeCommentItem.mediaType === "video" ? (
                    <video src={activeCommentItem.img} className="w-full h-full object-cover" />
                  ) : (
                    <img src={activeCommentItem.img} alt="Pratinjau" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {activeCommentItem.name || `@${activeCommentItem.user}`}
                </p>
                <p className="text-xs text-neutral-600 truncate mt-0.5">
                  {activeCommentItem.text}
                </p>
              </div>
            </div>

            {/* List komentar Layar Penuh */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-neutral-50/50">
              {activeCommentItem.comments && activeCommentItem.comments.length > 0 ? (
                activeCommentItem.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] border-2 border-[#E5A000] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs select-none">
                      {c.user[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-bold text-neutral-900 truncate max-w-[150px] sm:max-w-[190px]">
                          {c.user}
                        </span>
                        <span className="text-[10px] text-neutral-400 shrink-0 whitespace-nowrap">
                          {c.time}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700 mt-1 leading-relaxed">{c.text}</p>

                      {/* Aksi Komentar (Like, Balas, Hapus) */}
                      <CommentActions
                        likes={c.likes ?? 0}
                        isLiked={c.isLiked}
                        onLike={() => handleLikeComment(c.id)}
                        onReply={() => handleReplyComment(c.user)}
                        onDelete={() => handleDeleteComment(c.id)}
                        isOwner={c.user === userName}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-400">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600">Belum ada komentar</p>
                  <p className="text-xs text-neutral-400 mt-1">Jadilah yang pertama memberikan tanggapan!</p>
                </div>
              )}
            </div>

            {/* Input komentar baru di bagian bawah layar penuh */}
            {currentBanStatus.isBanned ? (
              <div className="p-3 sm:p-4 border-t border-rose-200 bg-rose-50 flex items-center justify-between gap-3 shrink-0 text-xs text-rose-900">
                <span className="font-semibold">
                  Tabe' akun Anda telah ditangguhkan karena melanggar aturan komunitas.
                </span>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(true)}
                  className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 font-bold rounded-lg transition shrink-0 cursor-pointer"
                >
                  Bantuan
                </button>
              </div>
            ) : (
              <div className="p-3 sm:p-4 border-t border-neutral-200 bg-white flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] border-2 border-[#E5A000] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs select-none">
                  {userName[0].toUpperCase()}
                </div>
                <input
                  id="comment-input-field"
                  type="text"
                  value={commentInputText}
                  onChange={(e) => setCommentInputText(e.target.value)}
                  placeholder={`Tulis komentar sebagai @${userName}...`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmitComment();
                    }
                  }}
                  className="flex-1 bg-neutral-100 border border-neutral-300 rounded-full px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#00632B] focus:bg-white transition"
                />
                <button
                  id="send-comment-btn"
                  type="button"
                  disabled={!commentInputText.trim()}
                  onClick={handleSubmitComment}
                  className="p-2.5 bg-[#00632B] hover:bg-[#004f22] disabled:opacity-40 text-white rounded-full transition shadow-xs active:scale-95 flex items-center justify-center shrink-0"
                  aria-label="Kirim Komentar"
                >
                  <Send className="w-4 h-4 translate-x-0.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODAL PENCARIAN TERARAH: AKUN, LOKASI, DAN BERITA */}
        <SearchModal
          isOpen={isSearchOpen && isSearchSuggestionsOpen}
          onClose={() => setIsSearchSuggestionsOpen(false)}
          feed={feed}
          posts={posts}
          query={searchQuery}
          setQuery={setSearchQuery}
          activeCategory={searchCategory}
          onSelectCategory={(cat) => setSearchCategory(cat)}
          onSelectResult={(selectedText, selectedCat) => {
            const cat = selectedCat || searchCategory;
            setSearchCategory(cat);
            setSearchQuery(cat === "account" ? `@${selectedText.replace(/^@/, "")}` : selectedText);
            setIsSearchSuggestionsOpen(false);
            const container = document.getElementById("feed-vertical-container");
            if (container) {
              container.scrollIntoView({ behavior: "smooth" });
            }
          }}
        />

        {/* MODAL PUSAT BANTUAN & KONTAK WHATSAPP ADMIN DINAMIS */}
        <HelpContactModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          settings={helpSettings}
          onShowToast={showToast}
        />

        {/* MODAL / HALAMAN LOGIN GOOGLE KAREBA'TA */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => {
            setIsLoginModalOpen(false);
            setPendingUploadAction(null);
          }}
          onSuccess={handleLoginSuccess}
          actionContext={pendingUploadAction}
        />

        {/* MODAL / TAMPILAN DETAIL KABAR LAYAR PENUH (FULL SCREEN) UNTUK KARTU KABAR KAMU & KARTU TERSIMPAN */}
        {activeDetailPost && (
          <PostDetailModal
            post={activeDetailPost}
            feedItem={feed.find((f) => f.id === activeDetailPost.id)}
            views={feed.find((f) => f.id === activeDetailPost.id)?.views || activeDetailPost.views || 0}
            onClose={() => setActiveDetailPost(null)}
            onShowToast={showToast}
            isOwner={activeDetailPost ? isMyPost(activeDetailPost) : false}
            isSaved={Boolean(activeDetailPost && savedPostIds.includes(activeDetailPost.id))}
            onToggleSave={handleToggleSave}
            onShare={handlePostShared}
            userName={userName}
            initial={initial}
            isLiked={Boolean(
              feed.find((f) => f.id === activeDetailPost.id)?.isLiked ||
              likedPostIds.includes(activeDetailPost.id)
            )}
            likeCount={
              feed.find((f) => f.id === activeDetailPost.id)?.like || 0
            }
            onToggleLike={(id) => handleToggleLike(id)}
            onDelete={(id) => {
              setPostToDelete({ id, title: activeDetailPost?.title, img: activeDetailPost?.img });
              setActiveDetailPost(null);
            }}
            onReport={(id, user) => {
              handleReportPost(id, user, activeDetailPost?.title || activeDetailPost?.caption);
              setActiveDetailPost(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
