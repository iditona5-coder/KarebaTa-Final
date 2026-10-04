import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  ExternalLink,
  ShieldCheck,
  Megaphone,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { HelpSettings } from "../types";

interface HelpContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HelpSettings;
  onShowToast?: (msg: string) => void;
}

export const HelpContactModal: React.FC<HelpContactModalProps> = ({
  isOpen,
  onClose,
  settings,
  onShowToast,
}) => {
  // Lock body scroll saat halaman pasang iklan aktif
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  // Format nomor WhatsApp untuk URL wa.me internasional (+62)
  const rawNumber = settings.whatsappNumber || "085351037179";
  const cleanDigits = rawNumber.replace(/\D/g, "");
  const waNumber = cleanDigits.startsWith("0")
    ? `62${cleanDigits.slice(1)}`
    : cleanDigits.startsWith("62")
    ? cleanDigits
    : `62${cleanDigits}`;

  const greetingMessage =
    settings.whatsappGreeting ||
    "Halo Admin Kareba'Ta, saya pemilik usaha/UMKM yang ingin memasang kabar sponsor atau spanduk promosi di aplikasi Kareba'Ta. Mohon informasi tarif dan persyaratannya. Terima kasih.";

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(greetingMessage)}`;

  const handleOpenWhatsApp = () => {
    try {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = waUrl;
    }
    if (onShowToast) {
      onShowToast("Membuka chat WhatsApp Admin Kareba'Ta...");
    }
  };

  return createPortal(
    <div
      id="pasang-iklan-fullpage-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-page-title"
      className="fixed inset-0 z-[99999] bg-neutral-100 flex justify-center w-full h-full overflow-hidden select-none animate-fade-in"
    >
      {/* Kolom Halaman Mandiri Penuh (Solid Opaque, Beranda Belakang 100% Tertutup) */}
      <div className="w-full max-w-md bg-neutral-50 h-full flex flex-col shadow-2xl overflow-hidden relative">
        {/* TOP APP BAR (Sticky Header) */}
        <header className="bg-gradient-to-r from-[#00632B] via-[#004d22] to-[#003818] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shadow-md shrink-0 border-b border-emerald-900/50 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-1 text-white/90 hover:text-white hover:bg-white/10 active:scale-95 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-semibold"
              aria-label="Kembali ke Beranda"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Kembali</span>
            </button>

            <div className="h-6 w-px bg-white/20" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 backdrop-blur-xs border border-amber-300/40 flex items-center justify-center shadow-inner">
                <Megaphone className="w-4 h-4 text-[#E5A000]" />
              </div>
              <div>
                <h1 id="help-page-title" className="text-sm font-extrabold tracking-tight leading-tight">
                  Pasang Iklan Sponsor
                </h1>
                <p className="text-[10px] text-emerald-200 font-medium">
                  {settings.adminName || "Admin Resmi Kareba'Ta"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY (Scrollable Standalone Content) */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:py-8 bg-neutral-50">
          <div className="max-w-xl mx-auto space-y-5">
            {/* BADGE HERO KEMITRAAN */}
            <div className="text-center space-y-2 pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                <span>Kemitraan Promosi Usaha & UMKM</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                Promosikan Usaha Anda ke Seluruh Warga
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
                Tingkatkan penjualan dan jangkauan pelanggan lokal ke seluruh warga dan wilayah sekitar melalui aplikasi berita warga Kareba'Ta.
              </p>
            </div>

            {/* KOTAK DESKRIPSI LAYANAN RESMI */}
            <div className="bg-amber-50/90 border border-amber-300/80 rounded-3xl p-5 shadow-xs flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                  Layanan Pasang Iklan Sponsor:
                </h3>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                  Warga atau pemilik UMKM / usaha lokal yang ingin memasang kabar sponsor atau spanduk promosi dapat menghubungi Admin melalui jalur WhatsApp resmi.
                </p>
              </div>
            </div>

            {/* KARTU JAM RESPON ADMIN */}
            <div className="bg-white border border-neutral-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] uppercase font-bold text-neutral-400 block tracking-wider">
                    Jam Respon Admin:
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-neutral-800 block truncate">
                    {settings.workingHours || "Setiap Hari: 08.00 - 21.00 WITA"}
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Siap Melayani</span>
              </span>
            </div>

            {/* TOMBOL UTAMA WHATSAPP: HANYA TOMBOL SAJA (TANPA NOMOR HP MUNCUL) */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-sm">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Layanan Pasang Iklan Sponsor</span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-neutral-900">
                  Kirim Pesan Langsung ke Admin Pengelola
                </h3>
                <p className="text-xs text-neutral-600 max-w-md mx-auto">
                  Klik tombol di bawah untuk langsung membuka ruang pesan WhatsApp dan menghubungi Admin.
                </p>
              </div>

              <button
                id="whatsapp-contact-admin-btn"
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full py-4 px-6 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition cursor-pointer"
              >
                {/* WhatsApp SVG Logo */}
                <svg
                  className="w-6 h-6 fill-current shrink-0"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.979-.275-.1-.475-.15-.675.15-.2.301-.776.979-.951 1.179-.176.201-.351.226-.652.076-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.783-1.676-2.084-.176-.3-.019-.462.132-.612.136-.135.301-.35.452-.525.15-.175.2-.3.301-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.628-.925-2.228-.244-.585-.492-.505-.676-.514-.175-.009-.375-.011-.575-.011-.2 0-.525.075-.8.375-.276.301-1.052 1.028-1.052 2.507 0 1.48 1.077 2.91 1.228 3.111.15.201 2.119 3.236 5.134 4.54.717.311 1.278.496 1.715.635.722.23 1.379.197 1.899.12.58-.087 1.78-.727 2.03-1.428.25-.702.25-1.303.175-1.428-.075-.125-.275-.201-.576-.351zM12.04 2C6.54 2 2.08 6.46 2.08 11.96c0 1.98.58 3.82 1.6 5.37L2 22l4.82-1.57c1.48.91 3.22 1.44 5.22 1.44 5.5 0 9.96-4.46 9.96-9.96C22 6.46 17.54 2 12.04 2zm0 18.25c-1.74 0-3.35-.49-4.73-1.35l-.34-.21-2.86.93.94-2.78-.23-.37a8.204 8.204 0 0 1-1.28-4.51c0-4.55 3.7-8.25 8.25-8.25s8.25 3.7 8.25 8.25-3.7 8.25-8.25 8.25z" />
                </svg>
                <span>Hubungi via WhatsApp</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-90" />
              </button>
            </div>

            {/* FORMAT PROMOSI YANG TERSEDIA */}
            <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <span className="text-xs font-black text-neutral-800 uppercase tracking-wider block">
                Format Iklan & Promosi di Kareba'Ta:
              </span>
              <div className="space-y-2.5 text-xs text-neutral-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Banner Spanduk Sponsor</span>
                    <span className="text-neutral-500">Tampil menonjol di beranda kabar warga utama di antara berita lokal.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Tautan Langsung ke Toko</span>
                    <span className="text-neutral-500">Tombol aksi yang mengarahkan pembaca langsung ke WhatsApp jualan atau web usaha Anda.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Teks Berjalan</span>
                    <span className="text-neutral-500">Pemberitahuan promo singkat yang bergulir di bagian atas layar aplikasi.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* INFORMASI RESMI */}
            <div className="pt-6 pb-2 text-center text-xs text-neutral-400">
              Kareba'Ta © 2026 • Layanan Resmi
            </div>
          </div>
        </main>
      </div>
    </div>,
    document.body
  );
};
