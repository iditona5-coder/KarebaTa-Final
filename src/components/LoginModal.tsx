import React, { useState } from "react";
import { X, ShieldCheck, Video, Camera, Copy, Check, ShieldAlert, ArrowRight, UserCheck, Users } from "lucide-react";
import { KarebaTaLogo } from "./KarebaTaLogo";
import { loginWithGoogle, loginAsSimulatedUser, PRIMARY_ADMIN_EMAIL } from "../services/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionContext?: "camera" | "gallery" | "general" | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionContext = "general",
}) => {
  const [usernameInput, setUsernameInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDomainError, setIsDomainError] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

  const handleCopyHost = () => {
    if (navigator?.clipboard && currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleUsernameLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = usernameInput.trim().replace(/^@/, "").replace(/\s+/g, "_").slice(0, 13);
    if (!clean) {
      setErrorMessage("Silakan ketik nama pengguna Anda");
      return;
    }
    const lower = clean.toLowerCase();
    if (lower === "iditona" || lower === "iditona5" || lower.startsWith("iditona") || lower === "admin" || lower === "pengelola") {
      setErrorMessage("Nama pengguna ini diproteksi khusus untuk Pemilik / Admin Utama.");
      return;
    }
    sessionStorage.setItem("karebata_active_session", "true");
    loginAsSimulatedUser(`${clean.toLowerCase()}@warga.karebata`);
    localStorage.setItem("karebata_username", clean);
    onSuccess();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsDomainError(false);
    try {
      sessionStorage.setItem("karebata_active_session", "true");
      const res = await loginWithGoogle();
      if (res.user) {
        onSuccess();
      } else if (res.error) {
        sessionStorage.removeItem("karebata_active_session");
        if (res.error.includes("popup-closed-by-user")) {
          setErrorMessage("Jendela login Google ditutup. Silakan coba lagi.");
        } else if (res.error.includes("unauthorized-domain") || res.error.includes("auth/unauthorized-domain")) {
          setIsDomainError(true);
          setErrorMessage(
            `Domain pratinjau "${currentHost}" belum didaftarkan di Firebase Console > Authentication > Settings > Authorized domains.`
          );
        } else {
          setErrorMessage(res.error || "Gagal masuk dengan akun Google.");
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("unauthorized-domain") || err?.code === "auth/unauthorized-domain") {
        setIsDomainError(true);
        setErrorMessage(
          `Domain pratinjau "${currentHost}" belum didaftarkan di Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setErrorMessage(err?.message || "Terjadi kesalahan saat menghubungi server Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPreviewLogin = (asAdmin: boolean = false) => {
    sessionStorage.setItem("karebata_active_session", "true");
    loginAsSimulatedUser(asAdmin ? PRIMARY_ADMIN_EMAIL : "warga.kareba@gmail.com");
    onSuccess();
  };

  const getActionTitle = () => {
    if (actionContext === "camera") return "Ambil Foto & Bagikan Kabar";
    if (actionContext === "gallery") return "Unggah Media dari Galeri";
    return "Masuk ke Kareba'Ta";
  };

  const getActionSubtitle = () => {
    if (actionContext === "camera") {
      return "Silakan masuk dengan Akun Google Anda untuk menggunakan kamera dan membagikan momen warga secara langsung.";
    }
    if (actionContext === "gallery") {
      return "Silakan masuk dengan Akun Google Anda untuk memilih dan mempublikasikan foto atau video dari galeri HP.";
    }
    return "Silakan masuk dengan Akun Google Anda untuk berbagi kabar, foto, dan video warga terkini.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div 
        className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 transform transition-all duration-200 animate-scale-up max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        {/* Header Modal dengan Logo Kareba'Ta & Tombol Tutup */}
        <div className="relative px-6 pt-5 pb-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <KarebaTaLogo showSubtitle={true} />
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-200/70 hover:bg-neutral-300 text-neutral-600 hover:text-neutral-900 transition flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Tutup jendela login"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="p-5 sm:p-6 text-center overflow-y-auto">
          {/* Ikon Contextual */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-[#E5A000] shadow-xs">
            {actionContext === "camera" ? (
              <Camera className="w-7 h-7" />
            ) : actionContext === "gallery" ? (
              <Video className="w-7 h-7" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>

          <h2
            id="login-modal-title"
            className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight"
            style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            {getActionTitle()}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
            {getActionSubtitle()}
          </p>

          {/* Banner Informasi: Menonton Tetap Bebas */}
          <div className="mt-3 py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center gap-2 text-[11px] text-emerald-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Menonton kabar warga tetap bebas tanpa perlu login</span>
          </div>

          {/* Pesan Error / Bantuan Khusus Unauthorized Domain */}
          {isDomainError ? (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-left text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-amber-900 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>Domain pratinjau belum diotorisasi di Firebase Console</span>
              </div>
              <p className="text-neutral-700 text-[11px] leading-relaxed">
                Google membatasi login pop-up di domain ini. Anda dapat menyalin domain ini ke Firebase Console, atau langsung masuk menggunakan <b>Mode Pratinjau Cepat</b> di bawah:
              </p>

              {/* Box Salin Domain */}
              <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl p-1.5">
                <span className="text-[11px] font-mono text-neutral-800 truncate flex-1 px-1">
                  {currentHost}
                </span>
                <button
                  type="button"
                  onClick={handleCopyHost}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>

              {/* Tombol Masuk Cepat Sebagai Warga */}
              <div className="pt-1 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickPreviewLogin(false)}
                  className="w-full py-2.5 px-3 bg-[#00632B] hover:bg-[#004f22] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Masuk Sebagai Warga (Mode Pratinjau)</span>
                </button>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium text-left">
              {errorMessage}
            </div>
          ) : null}

          {/* Papan Masuk Langsung dengan Nama Pengguna */}
          <form onSubmit={handleUsernameLogin} className="mt-4 space-y-2.5">
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border-2 border-neutral-300 focus-within:border-[#00632B] focus-within:bg-white transition-all">
              <span className="pl-4 text-sm sm:text-base font-semibold select-none text-neutral-400">
                @
              </span>
              <input
                id="modal-username-input"
                type="text"
                maxLength={13}
                value={usernameInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/^@/, "").replace(/\s+/g, "_").slice(0, 13);
                  setUsernameInput(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="nama_kamu"
                className="w-full py-3 pl-0.5 pr-3 bg-transparent text-sm sm:text-base font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-normal outline-none"
              />
              <span className={`pr-3 text-xs font-semibold ${usernameInput.length >= 13 ? "text-amber-600" : "text-neutral-400"}`}>
                {usernameInput.length}/13
              </span>
            </div>

            <button
              type="submit"
              disabled={!usernameInput.trim()}
              className="w-full py-3 px-4 bg-[#00632B] hover:bg-[#004f22] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </form>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-neutral-200 w-full" />
            <span className="bg-white px-2.5 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold shrink-0">
              atau
            </span>
            <div className="border-t border-neutral-200 w-full" />
          </div>

          {/* Tombol Utama: Masuk dengan Google */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 border-2 border-neutral-300 hover:border-neutral-400 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-neutral-400 border-t-[#E5A000] animate-spin" />
                  <span className="text-neutral-600">Menghubungkan Akun Google...</span>
                </div>
              ) : (
                <>
                  {/* Ikon Resmi Google G */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Lanjutkan dengan Akun Google</span>
                </>
              )}
            </button>

            {/* Tombol Batal / Kembali ke Beranda Menonton */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
            >
              Nanti Saja, Kembali Menonton Kabar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
