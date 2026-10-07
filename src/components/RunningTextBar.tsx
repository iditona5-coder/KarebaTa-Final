import React, { useState, useRef, useEffect, useCallback } from "react";
import { Pause, Play, ChevronRight, X, Megaphone, MapPin, Clock } from "lucide-react";

export interface BulletinItem {
  id: string;
  category: string;
  text: string;
  location?: string;
  time?: string;
}

interface RunningTextBarProps {
  announcements?: (string | BulletinItem)[];
  onItemClick?: (text: string) => void;
}

const DEFAULT_ANNOUNCEMENTS: BulletinItem[] = [
  {
    id: "b-1",
    category: "LALU LINTAS",
    text: "Arus lalu lintas pesisir dan jalur protokol terpantau lancar dan ramai lancar petang ini.",
    location: "Kawasan Pesisir",
    time: "Terkini",
  },
  {
    id: "b-2",
    category: "IKON KOTA",
    text: "Penerangan dan lampu hias jembatan utama aktif normal mempercantik panorama pesisir pantai.",
    location: "Jembatan Utama",
    time: "15 mnt lalu",
  },
  {
    id: "b-3",
    category: "PRAKIRAAN CUACA",
    text: "BMKG Wilayah: Suhu 26°C - 31°C, hembusan angin laut sepoi-sepoi dan potensi gerimis ringan di lereng perbukitan.",
    location: "Kawasan Sekitar",
    time: "30 mnt lalu",
  },
  {
    id: "b-4",
    category: "KULINER",
    text: "Festival aneka olahan tradisional dan kuliner hangat diserbu pengunjung di area sentra kuliner.",
    location: "Sentra Kuliner",
    time: "1 jam lalu",
  },
  {
    id: "b-5",
    category: "AGENDA WARGA",
    text: "Aksi gotong royong peduli pesisir bersama komunitas relawan Minggu pagi 06.30 WITA.",
    location: "Area Pesisir",
    time: "2 jam lalu",
  },
];

export const RunningTextBar: React.FC<RunningTextBarProps> = ({
  announcements = DEFAULT_ANNOUNCEMENTS,
  onItemClick,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);

  // Normalisasi data pengumuman
  const items: BulletinItem[] = announcements.map((item, idx) => {
    if (typeof item === "string") {
      return {
        id: `ann-${idx}`,
        category: "KABAR WARGA",
        text: item,
        time: "Baru",
      };
    }
    return item;
  });

  // Ref untuk Custom Animation Engine (Bukan Bawaan Browser / Tag Marquee)
  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<number>(0);
  const halfWidthRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const isHoveredRef = useRef<boolean>(false);

  // Hitung separuh lebar konten untuk seamless infinite wrap
  const measureHalfWidth = useCallback(() => {
    if (trackRef.current) {
      const fullWidth = trackRef.current.scrollWidth;
      halfWidthRef.current = fullWidth / 2;
    }
  }, []);

  // Update posisi transform secara langsung di DOM (60/120fps hardware accelerated)
  const applyTransform = useCallback((x: number) => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-x}px, 0, 0)`;
    }
  }, []);

  // Custom Tick Engine menggunakan requestAnimationFrame
  useEffect(() => {
    measureHalfWidth();

    // Pantau perubahan ukuran jendela
    window.addEventListener("resize", measureHalfWidth);

    const speed = 36; // Kecepatan gerak: 36 piksel per detik

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Jalankan animasi jika tidak sedang di-pause atau di-hover
      if (!isPaused && !isHoveredRef.current) {
        const half = halfWidthRef.current;
        if (half > 0) {
          offsetRef.current += speed * delta;
          if (offsetRef.current >= half) {
            offsetRef.current = offsetRef.current % half;
          }
          applyTransform(offsetRef.current);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", measureHalfWidth);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPaused, measureHalfWidth, applyTransform, items]);

  // Jalankan animasi otomatis tanpa drag manual
  const handleItemPress = (item: BulletinItem) => {
    if (onItemClick) {
      onItemClick(item.text);
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* Papan Teks Berjalan Mandiri (Custom Engine Tanpa Tag Marquee Bawaan Browser & Tanpa Native Tooltip) */}
      <div
        id="running-text-board"
        className="w-full max-w-full bg-neutral-900 border-b border-neutral-800 text-white flex items-center h-7 sm:h-7.5 overflow-hidden relative select-none shadow-2xs z-30"
        style={{ touchAction: "pan-y" }}
      >
        {/* Label Badge Statis Kiri - Merah Kontras Modern */}
        <div className="bg-red-600 text-white h-full px-2 sm:px-2.5 flex items-center gap-1.5 shrink-0 z-20 font-black text-[9px] sm:text-[10px] tracking-wider uppercase shadow-xs pointer-events-none">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          <span className="whitespace-nowrap font-extrabold tracking-tight">INFO</span>
        </div>

        {/* Area Viewport Marquee (Teks mengalir murni otomatis, sentuhan layar tidak akan menyeret teks) */}
        <div
          ref={containerRef}
          className="flex-1 min-w-0 overflow-hidden relative h-full flex items-center pointer-events-auto"
          onMouseEnter={() => {
            isHoveredRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveredRef.current = false;
          }}
        >
          {/* Efek Gradien Tepi Halus Kiri & Kanan (Vignette Fade) */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-neutral-900 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-neutral-900 to-transparent z-10" />

          {/* Jalur Teks Bergerak - Digeser dengan translate3d custom RAF */}
          <div
            ref={trackRef}
            className="flex items-center h-full whitespace-nowrap will-change-transform"
            style={{ transform: "translate3d(0px, 0, 0)" }}
          >
            {/* Set Pertama */}
            {items.map((item, idx) => (
              <div
                key={`m1-${item.id}-${idx}`}
                onClick={() => handleItemPress(item)}
                className="inline-flex items-center gap-1.5 px-3 text-[11px] text-neutral-300 hover:text-white transition whitespace-nowrap leading-none cursor-pointer"
              >
                <span className="text-[9px] font-bold text-amber-300 bg-neutral-800/90 px-1 py-0.5 rounded border border-neutral-700/60 leading-none">
                  {item.category}
                </span>
                <span className="font-normal">{item.text}</span>
                <span className="text-neutral-600 text-[10px] mx-1">•</span>
              </div>
            ))}

            {/* Set Kedua (Duplikasi untuk loop tanpa jeda patah) */}
            {items.map((item, idx) => (
              <div
                key={`m2-${item.id}-${idx}`}
                onClick={() => handleItemPress(item)}
                className="inline-flex items-center gap-1.5 px-3 text-[11px] text-neutral-300 hover:text-white transition whitespace-nowrap leading-none cursor-pointer"
              >
                <span className="text-[9px] font-bold text-amber-300 bg-neutral-800/90 px-1 py-0.5 rounded border border-neutral-700/60 leading-none">
                  {item.category}
                </span>
                <span className="font-normal">{item.text}</span>
                <span className="text-neutral-600 text-[10px] mx-1">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tombol Kontrol Kustom Kanan: Jeda/Lanjut & Buka Semua (Tanpa Title Native Browser) */}
        <div className="flex items-center h-full bg-neutral-900 border-l border-neutral-800 shrink-0 z-20 px-1">
          <button
            id="running-text-toggle-btn"
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
            aria-label="Jeda atau lanjutkan teks berjalan"
          >
            {isPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
          </button>
          <button
            id="running-text-list-btn"
            type="button"
            onClick={() => setIsListOpen(true)}
            className="px-1.5 py-0.5 text-[9px] font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer whitespace-nowrap hidden sm:flex items-center gap-0.5"
            aria-label="Lihat seluruh daftar info"
          >
            <span>Semua</span>
            <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Modal Daftar Lengkap Info Terkini (In-App Custom Modal, Tanpa Browser Alert/Prompt) */}
      {isListOpen && (
        <div
          id="running-text-bulletin-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 max-w-md mx-auto animate-fade-in"
          onClick={() => setIsListOpen(false)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-900 leading-tight">
                    Info & Warta Terkini
                  </h3>
                  <p className="text-[11px] text-neutral-500">Pembaruan info penting seputar kabar warga terkini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsListOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-neutral-100 space-y-1">
              {items.map((b) => (
                <div
                  key={`bulletin-modal-${b.id}`}
                  onClick={() => {
                    handleItemPress(b);
                    setIsListOpen(false);
                  }}
                  className="py-3 px-1 hover:bg-neutral-50 rounded-xl transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      {b.category}
                    </span>
                    {b.time && (
                      <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{b.time}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-medium group-hover:text-[#00632B] transition">
                    {b.text}
                  </p>
                  {b.location && (
                    <p className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-yellow-500" />
                      <span>{b.location}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsListOpen(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
