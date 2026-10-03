import React, { useState, useEffect, useRef } from "react";
import { ArrowDown, CheckCircle2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [canPull, setCanPull] = useState(false);

  // Gunakan refs agar listener tidak perlu di-remove dan di-attach berulang kali
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isGestureLockedRef = useRef(false); // Terkunci jika terdeteksi gerakan horizontal/scroll biasa
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Ambang batas tarikan yang mantap dan disengaja (tidak gampang terpicu oleh scroll tak sengaja)
  const THRESHOLD = 80;
  // Deadzone awal: abaikan gerakan di bawah 20px agar scroll ringan tidak memicu tarikan
  const DEADZONE = 20;

  const isModalOrFullscreenActive = () => {
    if (typeof document === "undefined") return false;
    return Boolean(
      document.getElementById("custom-fullscreen-viewer") ||
      document.getElementById("post-detail-modal-overlay") ||
      document.getElementById("comments-fullscreen-page") ||
      document.getElementById("report-post-modal-overlay") ||
      document.getElementById("edit-profile-modal-overlay") ||
      document.body.style.overflow === "hidden"
    );
  };

  useEffect(() => {
    const getScrollTop = () => {
      return (
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current || isModalOrFullscreenActive()) {
        isDraggingRef.current = false;
        return;
      }
      const scrollTop = getScrollTop();
      // Hanya mulai mendengarkan jika posisi layar benar-benar di puncak paling atas (<= 1)
      if (scrollTop <= 1) {
        const touch = e.touches[0];
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        isDraggingRef.current = true;
        isGestureLockedRef.current = false;
      } else {
        isDraggingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isModalOrFullscreenActive()) {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setPullDistance(0);
          pullDistanceRef.current = 0;
          setCanPull(false);
        }
        return;
      }

      if (!isDraggingRef.current || isRefreshingRef.current || isGestureLockedRef.current) return;

      const touch = e.touches[0];
      const diffX = touch.clientX - startXRef.current;
      const diffY = touch.clientY - startYRef.current;
      const scrollTop = getScrollTop();

      // Jika jari bergerak mendatar (misal geser carousel atau swipe layar), batalkan tarikan
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 12) {
        isGestureLockedRef.current = true;
        isDraggingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setCanPull(false);
        return;
      }

      // Pastikan posisi tetap di puncak dan ditarik ke bawah melampaui deadzone awal
      if (diffY > DEADZONE && scrollTop <= 1) {
        const effectivePull = diffY - DEADZONE;
        // Hambatan elastis (resistance) tegas: butuh tarikan jempol ~200px agar mencapai THRESHOLD 80
        const damped = Math.min(95, effectivePull * 0.4);

        pullDistanceRef.current = damped;
        setPullDistance(damped);
        setCanPull(damped >= THRESHOLD);

        // Hanya cegah scroll browser jika tarikan sudah jelas dan disengaja (> 40px)
        if (damped > 40 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setCanPull(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDraggingRef.current || isRefreshingRef.current) {
        isDraggingRef.current = false;
        return;
      }
      isDraggingRef.current = false;

      const finalDistance = pullDistanceRef.current;

      // Hanya segarkan jika tarikan benar-benar melampaui batas mantap (THRESHOLD)
      if (finalDistance >= THRESHOLD) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(52);
        pullDistanceRef.current = 52;

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(20);
          } catch {
            // Abaikan
          }
        }

        try {
          await Promise.all([
            Promise.resolve(onRefreshRef.current()),
            new Promise((resolve) => setTimeout(resolve, 1100)),
          ]);
          setIsCompleted(true);
          setTimeout(() => {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            setIsCompleted(false);
            pullDistanceRef.current = 0;
            setPullDistance(0);
            setCanPull(false);
          }, 600);
        } catch {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setIsCompleted(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
          setCanPull(false);
        }
      } else {
        // Jika tidak mencapai batas tarikan (misal tidak sengaja tergeser sedikit), kembalikan posisi tanpa memuat ulang
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setCanPull(false);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const rotationDeg = Math.min(360, (pullDistance / THRESHOLD) * 270);
  // Indikator hanya mulai terlihat jika tarikan sudah mencapai jarak minimal 25px (mencegah kedipan saat scroll biasa)
  const isVisible = (pullDistance >= 25) || isRefreshing;
  const translateY = isVisible ? Math.min(pullDistance, 70) : -60;

  return (
    <div className="relative w-full">
      {/* INDIKATOR PULL-TO-REFRESH DI BAWAH BAR STICKY HEADER */}
      <div
        className="fixed top-[88px] left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-100 ease-out"
        style={{
          transform: `translate(-50%, ${translateY}px)`,
          opacity: isRefreshing ? 1 : isVisible ? Math.min(1, Math.max(0, (pullDistance - 25) / 25)) : 0,
        }}
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white text-neutral-800 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.18)] border border-neutral-200/90 backdrop-blur-md">
          {isRefreshing ? (
            <>
              {/* Spinner Melingkar Berputar Khas Aplikasi Berita Modern */}
              <div className="w-5 h-5 rounded-full border-2 border-[#00632B]/20 border-t-[#00632B] animate-spin" />
              <span className="text-xs font-semibold text-[#00632B]">
                Memuat kabar terkini...
              </span>
            </>
          ) : isCompleted ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-bounce" />
              <span className="text-xs font-semibold text-emerald-600">
                Kabar berhasil diperbarui!
              </span>
            </>
          ) : (
            <>
              {/* Panah berputar dinamis saat ditarik ke bawah */}
              <div
                className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${canPull ? 180 : rotationDeg}deg)` }}
              >
                <ArrowDown className={`w-3.5 h-3.5 ${canPull ? "text-[#00632B]" : "text-neutral-500"}`} />
              </div>
              <span className={`text-xs ${canPull ? "text-[#00632B] font-bold" : "text-neutral-600 font-medium"}`}>
                {canPull ? "Lepaskan untuk memperbarui" : "Tarik lebih ke bawah..."}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Konten Halaman: bergeser ke bawah sedikit saat ditarik secara elastis */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.35, 28)}px)` : "none",
          transition: isDraggingRef.current ? "none" : "transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
};
