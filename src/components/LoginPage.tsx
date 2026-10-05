import React, { useState } from "react";
import { 
  Copy, Check, ShieldAlert, ArrowRight, Newspaper, Users, ShieldCheck
} from "lucide-react";
import { KarebaPinIcon } from "./KarebaTaLogo";
import { loginWithGoogle, loginAsSimulatedUser, PRIMARY_ADMIN_EMAIL, User } from "../services/firebase";

interface LoginPageProps {
  onLoginSuccess: (user?: User | null) => void;
  onContinueAsGuest?: () => void;
  initialMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  initialMessage = null,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDomainError, setIsDomainError] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

  const handleCopyHost = () => {
    if (navigator?.clipboard && currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsDomainError(false);
    try {
      sessionStorage.setItem("karebata_active_session", "true");
      const res = await loginWithGoogle();
      if (res.user) {
        onLoginSuccess(res.user);
      } else if (res.error) {
        sessionStorage.removeItem("karebata_active_session");
        if (res.error.includes("popup-closed-by-user")) {
          setErrorMessage("Jendela masuk Google ditutup. Silakan coba kembali.");
        } else if (res.error.includes("unauthorized-domain") || res.error.includes("auth/unauthorized-domain")) {
          setIsDomainError(true);
          setErrorMessage(
            `Domain "${currentHost}" belum dimasukkan ke Authorized Domains Firebase Authentication Console.`
          );
        } else {
          setErrorMessage(res.error || "Gagal masuk dengan akun Google.");
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("unauthorized-domain") || err?.code === "auth/unauthorized-domain") {
        setIsDomainError(true);
        setErrorMessage(
          `Domain "${currentHost}" belum dimasukkan ke Authorized Domains Firebase Authentication Console.`
        );
      } else {
        setErrorMessage(err?.message || "Terjadi kendala saat menghubungkan ke akun Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPreviewLogin = (asAdmin: boolean = false) => {
    sessionStorage.setItem("karebata_active_session", "true");
    const simulated = loginAsSimulatedUser(asAdmin ? PRIMARY_ADMIN_EMAIL : "warga.kareba@gmail.com");
    onLoginSuccess(simulated);
  };

  return (
    <div
      className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] bg-white text-neutral-900 flex flex-col justify-between overflow-hidden touch-none select-none overscroll-none selection:bg-[#E5A000] selection:text-neutral-900"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Spacer Header */}
      <div className="h-2 sm:h-4 shrink-0" />

      {/* Main Content Area */}
      <main className="w-full max-w-sm sm:max-w-md mx-auto px-6 py-2 my-auto flex flex-col justify-center shrink-0">
        {/* Logo Showcase dengan Gaya Bersih & Elegan */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
          <div className="relative mb-2 group">
            <div className="w-20 h-24 sm:w-24 sm:h-28 flex items-center justify-center filter drop-shadow-md">
              <KarebaPinIcon className="w-20 h-24 sm:w-24 sm:h-28" />
            </div>
          </div>

          <h1
            className="text-3xl sm:text-4xl font-[900] tracking-tight leading-none"
            style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            <span className="text-[#00632B]">Kareba'</span>
            <span className="text-[#E5A000]">Ta</span>
          </h1>

          <p
            className="text-xs sm:text-sm font-extrabold tracking-[0.12em] text-[#E5A000] mt-1.5 uppercase"
            style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
          >
            beritamu suaramu
          </p>

          <p className="text-xs text-neutral-600 mt-2.5 max-w-xs leading-relaxed font-normal">
            Pilih masuk dengan Akun Google untuk kirim kabar warga, atau langsung jelajahi Kabar Warga.
          </p>
        </div>

        {/* Info Banner Khusus (Jika dialihkan dari tombol kamera / galeri media) */}
        {initialMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium shadow-xs animate-fade-in text-center leading-snug">
            <span>{initialMessage}</span>
          </div>
        )}

        {/* Panel Bantuan Khusus Unauthorized Domain */}
        {isDomainError ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-left text-xs space-y-2.5 animate-fade-in">
            <div className="flex items-start gap-2 text-amber-900 font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>Domain pratinjau belum diizinkan di Firebase Console</span>
            </div>
            <p className="text-neutral-700 text-[11px] leading-relaxed">
              Google membatasi autentikasi di domain ini. Anda dapat menyalin nama domain untuk didaftarkan di Firebase Console, atau langsung masuk lewat <b>Mode Uji Coba Pratinjau</b>:
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
                <span>Masuk Cepat Sebagai Warga</span>
              </button>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left font-medium">
            {errorMessage}
          </div>
        ) : null}

        {/* 2 PILIHAN UTAMA: TOMBOL LOGIN GOOGLE DAN TOMBOL KABAR WARGA */}
        <div className="space-y-3.5">
          {/* PILIHAN 1: Tombol Masuk dengan Akun Google */}
          <button
            id="login-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 px-5 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 border-2 border-neutral-300 hover:border-neutral-400 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full border-2 border-neutral-400 border-t-[#00632B] animate-spin" />
                <span className="text-neutral-700 text-sm font-semibold">Menghubungkan Akun Google...</span>
              </div>
            ) : (
              <>
                {/* Google G Logo Asli */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <span>Masuk dengan Akun Google</span>
              </>
            )}
          </button>

          {/* Garis Pembatas "atau" */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-neutral-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-neutral-400 uppercase tracking-wider font-semibold shrink-0">
              atau
            </span>
            <div className="border-t border-neutral-200 w-full" />
          </div>

          {/* PILIHAN 2: Tombol Masuk sebagai Warga Kareba (Langsung Masuk Beranda) */}
          <button
            id="login-warga-kareba-btn"
            type="button"
            onClick={onContinueAsGuest}
            className="w-full py-4 px-5 bg-[#00632B] hover:bg-[#004f22] text-white rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Users className="w-5 h-5 text-[#E5A000]" />
            <span>Warga Kareba</span>
            <ArrowRight className="w-4 h-4 ml-auto text-emerald-200" />
          </button>
        </div>
      </main>

      {/* Footer Bersih */}
      <footer className="w-full max-w-md mx-auto px-6 py-3 text-center shrink-0">
        <p className="text-[11px] text-neutral-500">
          © {new Date().getFullYear()} Kareba'Ta — Beritamu Suaramu
        </p>
      </footer>
    </div>
  );
};
