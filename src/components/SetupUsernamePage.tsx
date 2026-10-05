import React, { useState } from "react";
import { User } from "firebase/auth";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { KarebaTaLogo } from "./KarebaTaLogo";

interface SetupUsernamePageProps {
  currentUser: User | null;
  initialValue?: string;
  onSaveUsername: (username: string) => void;
  onLogout?: () => void;
}

export const SetupUsernamePage: React.FC<SetupUsernamePageProps> = ({
  currentUser,
  initialValue = "",
  onSaveUsername,
}) => {
  // Biarkan input awal kosong agar tulisan @nama_kamu langsung terlihat di papan edit nama
  const [usernameInput, setUsernameInput] = useState(
    initialValue && initialValue.trim() && initialValue !== "warga_kareba"
      ? initialValue.replace(/^@/, "").slice(0, 13)
      : ""
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Otomatis hilangkan spasi dan batasi 13 huruf
    const val = e.target.value.replace(/^@/, "").replace(/\s+/g, "_").slice(0, 13);
    setUsernameInput(val);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSave = () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setErrorMessage("Silakan ketik nama pengguna Anda.");
      return;
    }
    if (trimmed.length < 2) {
      setErrorMessage("Nama pengguna minimal 2 huruf.");
      return;
    }
    if (trimmed.includes("@")) {
      setErrorMessage("Jangan gunakan tanda '@' atau alamat email sebagai nama.");
      return;
    }
    onSaveUsername(trimmed.slice(0, 13));
  };

  const userInitial = currentUser?.displayName
    ? currentUser.displayName[0].toUpperCase()
    : currentUser?.email
    ? currentUser.email[0].toUpperCase()
    : "U";

  const isReady = usernameInput.trim().length >= 2;

  return (
    <div
      className="fixed inset-0 w-full max-w-full h-full h-[100dvh] max-h-[100dvh] bg-white text-neutral-900 flex flex-col justify-between overflow-y-auto overflow-x-hidden overscroll-none selection:bg-[#E5A000] selection:text-neutral-900"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Header Atas Full Width (Tanpa tombol ganti akun) */}
      <header className="w-full border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          <KarebaTaLogo showSubtitle={true} />
        </div>
      </header>

      {/* Main Content Area - Full Screen Seamless Flow */}
      <main className="w-full max-w-lg mx-auto px-5 sm:px-6 py-6 flex-1 flex flex-col justify-center space-y-6">
          {/* Info Status Akun Google Terhubung */}
          {currentUser && (
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00632B] to-[#004f22] text-white font-extrabold text-lg flex items-center justify-center shrink-0 border-2 border-[#E5A000] select-none">
                {(usernameInput.trim().replace(/^@/, "")[0] || userInitial || "W").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Akun Google Terhubung</span>
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
          )}

          {/* Judul Bersih */}
          <div className="space-y-1 text-left">
            <h1
              className="text-xl sm:text-2xl font-[900] text-neutral-900 tracking-tight"
              style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
            >
              Nama Pengguna
            </h1>
          </div>

          {/* Form Input Nama Pengguna (Tanpa Cincin / Bayangan Ring) */}
          <div className="space-y-2">
            <div className="relative flex items-center bg-neutral-50 rounded-2xl border-2 border-neutral-300 focus-within:border-[#00632B] focus-within:bg-white transition-all">
              <span className="pl-4 text-base sm:text-lg font-semibold select-none text-neutral-400">
                @
              </span>
              <input
                id="username-setup-input"
                type="text"
                autoFocus
                maxLength={13}
                value={usernameInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSave();
                  }
                }}
                placeholder="nama_kamu"
                className="w-full py-3.5 pl-0.5 pr-4 bg-transparent text-base sm:text-lg font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-normal outline-none"
              />
              <span className={`pr-4 text-xs font-semibold ${usernameInput.length >= 13 ? "text-amber-600" : "text-neutral-400"}`}>
                {usernameInput.length}/13
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-xs text-rose-600 font-semibold pt-0.5 animate-shake">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Tombol Simpan */}
          <button
            id="submit-username-btn"
            type="button"
            onClick={handleSave}
            disabled={!isReady}
            className={`w-full py-3.5 px-5 font-bold text-base rounded-2xl flex items-center justify-center gap-2 transition-all ${
              isReady
                ? "bg-[#00632B] hover:bg-[#004f22] text-white shadow-lg shadow-emerald-950/20 active:scale-[0.98] cursor-pointer"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
            }`}
          >
            <span>Simpan & Masuk ke Beranda</span>
            <ArrowRight className={`w-4 h-4 ${isReady ? "text-white" : "text-neutral-400"}`} />
          </button>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-100 py-3.5 text-center bg-white">
        <p className="text-[11px] text-neutral-500">
          © {new Date().getFullYear()} Kareba'Ta — Beritamu Suaramu
        </p>
      </footer>
    </div>
  );
};
