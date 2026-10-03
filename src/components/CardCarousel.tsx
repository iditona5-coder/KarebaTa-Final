import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardCarouselProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * CardCarousel:
 * Wadah geser kartu custom dengan proteksi ketat anti-klik saat scrolling/dragging.
 * 
 * Karakteristik utama:
 * 1. Tidak akan pernah membuka kartu (detail/modal/tirai media) saat pengguna sedang scrolling vertikal maupun horizontal.
 * 2. Menggunakan event capturing 'click' untuk membatalkan klik kartu jika terjadi pergerakan jari/kursor lebih dari 6px.
 * 3. Halaman utama tetap bisa di-scroll ke atas/bawah secara bebas tanpa tersangkut atau memicu pembukaan kartu tak sengaja.
 */
export function CardCarousel({
  id = "custom-card-carousel",
  children,
  className = "",
}: CardCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Update visibilitas tombol panah kiri / kanan
  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollIndicators();
    window.addEventListener("resize", updateScrollIndicators);

    const observer = new MutationObserver(updateScrollIndicators);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", updateScrollIndicators);
      observer.disconnect();
    };
  }, [updateScrollIndicators]);

  // Tombol navigasi panah kiri/kanan
  const scrollStep = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const step = 145; // ~1 kartu + gap
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
    setTimeout(updateScrollIndicators, 250);
  };

  // Custom Touch & Pointer Drag System dengan proteksi anti-klik saat scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isCardTouch = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let hasDeterminedDirection = false;
    let isHorizontalDrag = false;
    let hasMovedAnyDirection = false;
    let blockClickUntil = 0;
    let momentumAnimationId: number | null = null;
    let touchHistory: { x: number; time: number }[] = [];

    const stopMomentum = () => {
      if (momentumAnimationId !== null) {
        cancelAnimationFrame(momentumAnimationId);
        momentumAnimationId = null;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      stopMomentum();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const card = target.closest('[data-card-item="true"]');
      const isButton = target.closest("button");

      if (!card || isButton) {
        isCardTouch = false;
        return;
      }

      isCardTouch = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startScrollLeft = el.scrollLeft;
      hasDeterminedDirection = false;
      isHorizontalDrag = false;
      hasMovedAnyDirection = false;
      touchHistory = [{ x: startX, time: Date.now() }];
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isCardTouch) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;
      const dist = Math.hypot(dx, dy);

      // JIKA JARI BERGERAK > 6px KE ARAH MANA PUN (VERTIKAL ATAU HORIZONTAL):
      // Ini adalah gestur scrolling, BUKAN tap/klik! Blokir klik kartu!
      if (dist > 6) {
        hasMovedAnyDirection = true;
        blockClickUntil = Date.now() + 500;
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = true;
      }

      // Tentukan arah gestur
      if (!hasDeterminedDirection) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          hasDeterminedDirection = true;
          if (Math.abs(dx) >= Math.abs(dy)) {
            // Gerakan horizontal pada kartu
            isHorizontalDrag = true;
          } else {
            // Gerakan vertikal: Pengguna scrolling halaman atas/bawah
            // Kunci: JANGAN izinkan klik kartu terbuka saat jari diangkat!
            isHorizontalDrag = false;
            return;
          }
        }
      }

      if (isHorizontalDrag) {
        if (e.cancelable) {
          e.preventDefault();
        }
        el.scrollLeft = startScrollLeft - dx;
        updateScrollIndicators();

        const now = Date.now();
        touchHistory.push({ x: currentX, time: now });
        if (touchHistory.length > 5) {
          touchHistory.shift();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isCardTouch) return;
      isCardTouch = false;

      // Jika jari sempat bergeser saat scrolling (vertikal maupun horizontal),
      // tahan flag pemblokir klik agar onClick kartu TIDAK terpicu sama sekali
      if (hasMovedAnyDirection) {
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = true;
        blockClickUntil = Date.now() + 500;
        setTimeout(() => {
          (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
        }, 500);
      } else {
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
      }

      if (isHorizontalDrag && hasMovedAnyDirection) {
        if (touchHistory.length >= 2) {
          const first = touchHistory[0];
          const last = touchHistory[touchHistory.length - 1];
          const dt = last.time - first.time;
          const dist = last.x - first.x;
          if (dt > 0 && dt < 200) {
            let velocity = (dist / dt) * 14;
            const friction = 0.94;

            const step = () => {
              if (Math.abs(velocity) < 0.5) {
                momentumAnimationId = null;
                updateScrollIndicators();
                return;
              }
              el.scrollLeft -= velocity;
              velocity *= friction;
              updateScrollIndicators();
              momentumAnimationId = requestAnimationFrame(step);
            };
            momentumAnimationId = requestAnimationFrame(step);
          }
        }
      }

      isHorizontalDrag = false;
      hasDeterminedDirection = false;
      updateScrollIndicators();
    };

    // Mouse drag untuk desktop
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseStartScrollLeft = 0;
    let mouseHasMoved = false;

    const handleMouseDown = (e: MouseEvent) => {
      stopMomentum();
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const card = target.closest('[data-card-item="true"]');
      const isButton = target.closest("button");
      if (!card || isButton) return;

      isMouseDown = true;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      mouseStartScrollLeft = el.scrollLeft;
      mouseHasMoved = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;
      const dist = Math.hypot(dx, dy);

      if (dist > 6) {
        mouseHasMoved = true;
        blockClickUntil = Date.now() + 500;
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = true;
        el.scrollLeft = mouseStartScrollLeft - dx;
        updateScrollIndicators();
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      if (mouseHasMoved) {
        blockClickUntil = Date.now() + 500;
        setTimeout(() => {
          (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
        }, 500);
      } else {
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
      }
      updateScrollIndicators();
    };

    // CAPTURING CLICK HANDLER: KUNCI UTAMA MENCEGAH KARTU TERBUKA SAAT SCROLLING
    const handleCaptureClick = (e: MouseEvent) => {
      if (hasMovedAnyDirection || Date.now() < blockClickUntil || (window as any).__KAREBATA_IS_DRAGGING_CARD__) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Pasang capture click handler pada fase capturing (true) agar mendahului onClick anak elemen
    el.addEventListener("click", handleCaptureClick, true);

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const card = target.closest('[data-card-item="true"]');
      if (!card) return;

      if (e.deltaX !== 0) {
        el.scrollLeft += e.deltaX;
        updateScrollIndicators();
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      stopMomentum();
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);

      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("click", handleCaptureClick, true);
      el.removeEventListener("wheel", handleWheel);
    };
  }, [updateScrollIndicators]);

  return (
    <div className="relative w-full group">
      {/* Tombol Navigasi Kiri */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollStep("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white/95 hover:bg-white text-neutral-800 rounded-full shadow-md border border-neutral-200 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer backdrop-blur-xs"
          aria-label="Geser ke kiri"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      {/* Container Kartu */}
      <div
        id={id}
        ref={containerRef}
        className={`flex gap-2.5 overflow-x-hidden pl-2.5 pr-4 pb-1 select-none ${className}`}
        style={{
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>

      {/* Tombol Navigasi Kanan */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollStep("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white/95 hover:bg-white text-neutral-800 rounded-full shadow-md border border-neutral-200 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer backdrop-blur-xs"
          aria-label="Geser ke kanan"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
