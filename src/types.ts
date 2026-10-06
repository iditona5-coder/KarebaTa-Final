export interface PostItem {
  id: string;
  title: string;
  loc: string;
  img: string;
  thumbnail?: string;
  fileId?: string;
  thumbFileId?: string;
  mediaType?: "image" | "video";
  caption?: string;
  createdAt?: string;
  name?: string;
  email?: string;
  user?: string;
  init?: string;
  avatar?: string;
  isMyPost?: boolean;
  shares?: number;
  saves?: number;
  views?: number;
}

export interface CommentItem {
  id: string;
  user: string;
  text: string;
  time: string;
  likes?: number;
  isLiked?: boolean;
}

export interface FeedItem {
  id: string;
  user: string;
  init: string;
  name?: string;
  email?: string;
  avatar?: string;
  time: string;
  text: string;
  img: string;
  thumbnail?: string;
  fileId?: string;
  thumbFileId?: string;
  mediaType?: "image" | "video";
  like: number;
  likedBy?: string[];
  isLiked?: boolean;
  comments?: CommentItem[];
  location?: string;
  isMyPost?: boolean;
  shares?: number;
  saves?: number;
  views?: number;
  isHidden?: boolean;
  category?: string;
}

export interface ReportItem {
  id: string;
  postId: string;
  targetUser: string;
  postText?: string;
  reason: string;
  details?: string;
  reporterName?: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: number;
  timeString: string;
}

export interface HelpSettings {
  whatsappNumber: string;
  whatsappGreeting: string;
  adminName?: string;
  workingHours?: string;
  helpEmail?: string;
  helpInfo?: string;
  updatedAt?: number;
}

export const DEFAULT_HELP_SETTINGS: HelpSettings = {
  whatsappNumber: "085351037179",
  whatsappGreeting: "Halo Admin Kareba, saya ingin bertanya dan butuh informasi bantuan...",
  adminName: "Admin Layanan Kareba",
  workingHours: "Setiap Hari: 08.00 - 21.00 WITA",
  helpEmail: "iditona5@gmail.com",
  helpInfo: "Layanan resmi bantuan warga Kareba: pengaduan warga, konfirmasi kabar darurat, bantuan teknis, dan pemasangan iklan sponsor.",
};

export interface BannedUser {
  id: string;
  identifier: string;
  userName?: string;
  email?: string;
  reason: string;
  bannedAt: string;
  timestamp: number;
  bannedBy?: string;
}

export interface SponsorAd {
  id: string;
  title: string;
  advertiserName: string;
  badgeText?: string;
  description: string;
  imageUrl: string;
  actionType: "whatsapp" | "link";
  actionTarget: string; // Nomor WhatsApp atau URL website
  actionButtonText: string;
  isActive: boolean;
  createdAt: number;
  expiryDate?: string;
  location?: string;
}

export interface AdSettings {
  isEnabled: boolean;
  frequency: number; // Muncul setiap N postingan di feed
  ads: SponsorAd[];
  updatedAt?: number;
}

export const DEFAULT_AD_SETTINGS: AdSettings = {
  isEnabled: false,
  frequency: 4,
  ads: [],
};

export interface UserProfile {
  uid: string;
  userName: string;
  email: string;
  displayName?: string;
  createdAt: number;
  status: "active" | "suspended" | "banned";
  suspendReason?: string;
  suspendedUntil?: string;
  postCount?: number;
  initial: string;
}

export interface AdminAuditLog {
  id: string;
  type: "LOGIN" | "LOGOUT" | "EDIT_DATA" | "DELETE_DATA" | "SETTINGS_CHANGE" | "BAN_USER" | "UNBAN_USER";
  description: string;
  adminEmail: string;
  timestamp: number;
  timeString: string;
}

export interface AdminAppConfig {
  appName: string;
  appLogoUrl: string;
  adminEmail: string;
  adminWhatsapp: string;
  adminWorkingHours?: string;
  privacyPolicyText: string;
  termsOfServiceText: string;
  adminPasscode: string; // Kunci rahasia tambahan
  updatedAt?: number;
}

export const DEFAULT_ADMIN_APP_CONFIG: AdminAppConfig = {
  appName: "Kareba'Ta",
  appLogoUrl: "",
  adminEmail: "iditona5@gmail.com",
  adminWhatsapp: "085351037179",
  adminWorkingHours: "Setiap Hari: 08.00 - 21.00 WITA",
  privacyPolicyText: "Kareba'Ta menghormati privasi seluruh warga masyarakat pengguna. Seluruh data pengguna disimpan secara aman di Google Firebase dan hanya digunakan untuk kepentingan verifikasi akun serta ketertiban interaksi komunitas warga.",
  termsOfServiceText: "1. Pengguna wajib menyajikan informasi yang jujur, tidak mengandung unsur hoaks, fitnah, ujaran kebencian, atau pornografi.\n2. Admin berhak menghapus konten yang melanggar aturan dan menangguhkan/memblokir akun pelanggar.\n3. Hak cipta foto dan video tetap milik pengguna yang mengunggah.",
  adminPasscode: "123456", // Default passcode cadangan, dapat diubah oleh admin kapan saja
};


