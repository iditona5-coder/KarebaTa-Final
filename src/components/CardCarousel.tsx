import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardCarouselProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * CardCarousel:
 * Wadah geser kartu media horisontal yang mulus dan responsif di HP (touch) maupun desktop (mouse/wheel/panah).
 * 
 * Keunggulan:
 * 1. Native smooth scrolling (overflow-x-auto, touch-action: pan-x pan-y) - bebas digeser tanpa macet.
 * 2. Proteksi ketat anti-klik saat menggeser: Mengusap kartu tidak akan memicu klik pembukaan modal.
 * 3. Halaman utama tetap bisa di-scroll vertikal secara bebas tanpa hambatan.
 */
export function CardCarousel({
  id = "custom-card-carousel",
  children,
  className = "",
}: CardCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);

  // Update visibilitas tombol panah kiri / kanan
  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < maxScroll - 6);
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
    const step = 150;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
    setTimeout(updateScrollIndicators, 250);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let hasMoved = false;
    let dragLockTimeout: any = null;
    let scrollTimeout: any = null;

    // Mendeteksi event scroll native (baik dari touch swipe, momentum, trackpad, atau scrollbar)
    const handleScroll = () => {
      updateScrollIndicators();
      // Tandai sedang menggeser agar kartu tidak terklik saat jari menyentuh sambil bergerak
      (window as any).__KAREBATA_IS_DRAGGING_CARD__ = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
      }, 180);
    };

    // Deteksi sentuhan / klik mouse
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("button")) return;

      isDown = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;

      if (e.pointerType === "mouse") {
        setIsPointerDown(true);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (dist > 5 && Math.abs(dx) > Math.abs(dy)) {
        hasMoved = true;
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = true;
        el.scrollLeft = startScrollLeft - dx;
        updateScrollIndicators();
      }
    };

    const handlePointerUp = () => {
      if (!isDown) return;
      isDown = false;
      setIsPointerDown(false);

      if (hasMoved) {
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = true;
        if (dragLockTimeout) clearTimeout(dragLockTimeout);
        dragLockTimeout = setTimeout(() => {
          (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
          hasMoved = false;
        }, 250);
      } else {
        (window as any).__KAREBATA_IS_DRAGGING_CARD__ = false;
      }
    };

    // Cegah klik kartu jika baru saja terjadi geseran jari/mouse
    const handleCaptureClick = (e: MouseEvent) => {
      if (hasMoved || (window as any).__KAREBATA_IS_DRAGGING_CARD__) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Mouse wheel & trackpad horizontal scroll
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) {
        el.scrollLeft += e.deltaX;
        updateScrollIndicators();
      } else if (Math.abs(e.deltaY) > 0) {
        const canScroll =
          (e.deltaY > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth - 2) ||
          (e.deltaY < 0 && el.scrollLeft > 2);
        if (canScroll) {
          el.scrollLeft += e.deltaY;
          updateScrollIndicators();
        }
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    el.addEventListener("click", handleCaptureClick, true);
    el.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      if (dragLockTimeout) clearTimeout(dragLockTimeout);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
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

      {/* Container Kartu: overflow-x-auto native + touchAction pan-x pan-y */}
      <div
        id={id}
        ref={containerRef}
        className={`flex gap-2.5 overflow-x-auto no-scrollbar pl-2.5 pr-4 pb-1 select-none ${
          isPointerDown ? "cursor-grabbing" : "cursor-grab"
        } ${className}`}
        style={{
          touchAction: "pan-x pan-y",
          overscrollBehaviorX: "contain",
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
