import React from "react";
import { MessageCircle, ExternalLink, Megaphone, MapPin } from "lucide-react";
import { SponsorAd } from "../types";

interface SponsorAdCardProps {
  ad: SponsorAd;
  onOpenHelp?: () => void;
  onShowToast?: (msg: string) => void;
}

export const SponsorAdCard: React.FC<SponsorAdCardProps> = ({
  ad,
  onOpenHelp,
  onShowToast,
}) => {
  const handleActionClick = () => {
    if (ad.actionType === "whatsapp") {
      const cleanPhone = ad.actionTarget.replace(/[^0-9]/g, "");
      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "62" + formattedPhone.slice(1);
      }
      const greeting = encodeURIComponent(
        `Halo ${ad.advertiserName}, saya melihat promo "${ad.title}" di aplikasi KarebaTa. Saya tertarik untuk info lebih lanjut.`
      );
      const waUrl = `https://wa.me/${formattedPhone}?text=${greeting}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } else {
      let targetUrl = ad.actionTarget.trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const initialLetter = ad.advertiserName ? ad.advertiserName.trim().charAt(0).toUpperCase() : "S";

  return (
    <article
      id={`sponsor-ad-${ad.id}`}
      className="w-full bg-gradient-to-b from-amber-50/40 via-white to-white border-y border-amber-200/70 sm:border sm:border-amber-200/80 sm:rounded-2xl sm:mb-5 shadow-xs overflow-hidden transition-all duration-200"
    >
      {/* HEADER SPONSOR */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar Advertiser */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-600 to-amber-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs border border-amber-300">
            {initialLetter}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-sm text-neutral-900 truncate">
                {ad.advertiserName}
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-500/15 to-yellow-500/20 text-amber-900 border border-amber-300/80">
                <span>{ad.badgeText || "Iklan Bersponsor"}</span>
              </span>
            </div>

            {ad.location && (
              <p className="text-[11px] text-neutral-500 flex items-center gap-1 truncate mt-0.5">
                <MapPin className="w-3 h-3 text-yellow-500 shrink-0" />
                <span className="truncate">{ad.location}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* GAMBAR BANNER / POSTER IKLAN (Dimensi stabil anti loncat/kedip) */}
      {ad.imageUrl && (
        <div className="w-full relative bg-neutral-900 overflow-hidden cursor-pointer group aspect-[16/9] sm:aspect-[2/1] min-h-[220px] max-h-[460px]" onClick={handleActionClick}>
          <img
            src={ad.imageUrl}
            alt={ad.title}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover sm:object-contain bg-neutral-950 transition duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-white text-xs font-bold drop-shadow">
              Ketuk untuk membuka promosi &rarr;
            </span>
          </div>
        </div>
      )}

      {/* BODY PROMO & CALL TO ACTION */}
      <div className="p-4 space-y-3 bg-white">
        <div>
          <h3 className="font-bold text-base text-neutral-900 leading-snug">
            {ad.title}
          </h3>
          <p className="text-xs text-neutral-700 mt-1 leading-relaxed whitespace-pre-line">
            {ad.description}
          </p>
        </div>

        {/* TOMBOL AKSI UTAMA (CTA) */}
        <div className="pt-1 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleActionClick}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer ${
              ad.actionType === "whatsapp"
                ? "bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-900/20"
                : "bg-neutral-900 hover:bg-neutral-800 text-white shadow-neutral-900/20"
            }`}
          >
            {ad.actionType === "whatsapp" ? (
              <MessageCircle className="w-4 h-4" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>{ad.actionButtonText || (ad.actionType === "whatsapp" ? "Hubungi WhatsApp Toko" : "Kunjungi Website")}</span>
          </button>

          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3 py-2.5 rounded-xl transition cursor-pointer shrink-0"
              aria-label="Mau Pasang Iklan? Hubungi Admin"
            >
              Mau Pasang Iklan?
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
