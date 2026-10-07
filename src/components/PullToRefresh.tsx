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

  // Ambang batas tarikan yang responsif, nyaman, dan mudah dijangkau jempol
  const THRESHOLD = 52;
  // Deadzone awal kecil (8px) agar indikator langsung merespons saat ditarik ke bawah
  const DEADZONE = 8;

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
      // Mulai mendengarkan jika posisi layar di puncak atas (<= 5px)
      if (scrollTop <= 5) {
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

      // Jika jari bergerak mendatar, batalkan tarikan
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 12) {
        isGestureLockedRef.current = true;
        isDraggingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setCanPull(false);
        return;
      }

      // Pastikan posisi tetap di puncak dan ditarik ke bawah melampaui deadzone awal
      if (diffY > DEADZONE && scrollTop <= 5) {
        const effectivePull = diffY - DEADZONE;
        // Damping yang responsif dan elastis
        const damped = Math.min(80, effectivePull * 0.6);

        pullDistanceRef.current = damped;
        setPullDistance(damped);
        setCanPull(damped >= THRESHOLD);

        // Cegah scroll browser jika tarikan ke bawah sudah jelas
        if (damped > 25 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        if (diffY < 0) {
          isDraggingRef.current = false;
          isGestureLockedRef.current = true;
        }
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

      // Hanya segarkan jika tarikan melampaui ambang batas THRESHOLD
      if (finalDistance >= THRESHOLD) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(50);
        pullDistanceRef.current = 50;

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch {
            // Abaikan
          }
        }

        try {
          await Promise.all([
            Promise.resolve(onRefreshRef.current()),
            new Promise((resolve) => setTimeout(resolve, 900)),
          ]);
          setIsCompleted(true);
          // Tampilkan notifikasi pill sukses selama 1.2 detik agar terbaca jelas oleh pengguna
          setTimeout(() => {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            setIsCompleted(false);
            pullDistanceRef.current = 0;
            setPullDistance(0);
            setCanPull(false);
          }, 1200);
        } catch {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setIsCompleted(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
          setCanPull(false);
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setCanPull(false);
      }
    };

    // Dukungan drag mouse untuk pengujian di komputer desktop & pratinjau AI Studio
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || isRefreshingRef.current || isModalOrFullscreenActive()) return;
      if (getScrollTop() <= 5) {
        startXRef.current = e.clientX;
        startYRef.current = e.clientY;
        isDraggingRef.current = true;
        isGestureLockedRef.current = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || isRefreshingRef.current || isGestureLockedRef.current) return;
      const diffX = e.clientX - startXRef.current;
      const diffY = e.clientY - startYRef.current;
      if (diffY > DEADZONE && getScrollTop() <= 5) {
        const effectivePull = diffY - DEADZONE;
        const damped = Math.min(80, effectivePull * 0.6);
        pullDistanceRef.current = damped;
        setPullDistance(damped);
        setCanPull(damped >= THRESHOLD);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        handleTouchEnd();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const rotationDeg = Math.min(360, (pullDistance / THRESHOLD) * 270);
  // Indikator muncul segera setelah ditarik melampaui 12px
  const isVisible = pullDistance >= 12 || isRefreshing || isCompleted;
  const translateY = isVisible ? Math.min(pullDistance, 55) : -60;

  return (
    <div className="relative w-full">
      {/* INDIKATOR PULL-TO-REFRESH DI BAWAH BAR STICKY HEADER */}
      <div
        className="fixed top-[88px] left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-150 ease-out max-w-[calc(100%-32px)]"
        style={{
          transform: `translate(-50%, ${translateY}px)`,
          opacity: isRefreshing || isCompleted ? 1 : isVisible ? Math.min(1, Math.max(0, (pullDistance - 10) / 20)) : 0,
        }}
        aria-live="polite"
      >
        {isCompleted ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-white text-neutral-800 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.18)] border border-neutral-200/90 backdrop-blur-md animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-bounce" />
            <span className="text-xs font-semibold text-emerald-600">
              Kabar berhasil diperbarui!
            </span>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white text-neutral-800 shadow-[0_10px_25px_rgba(0,0,0,0.18)] border border-neutral-200/90 backdrop-blur-md flex items-center justify-center">
            {isRefreshing ? (
              /* Indikator bulat berputar persis seperti loading */
              <div className="w-5 h-5 rounded-full border-2 border-[#00632B]/20 border-t-[#00632B] animate-spin" />
            ) : (
              <div
                className="w-5 h-5 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${canPull ? 180 : rotationDeg}deg)` }}
              >
                <ArrowDown className={`w-4 h-4 ${canPull ? "text-[#00632B]" : "text-neutral-500"}`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Konten Halaman: Tetap kokoh tanpa bergeser sedikitpun */}
      <div>
        {children}
      </div>
    </div>
  );
};
