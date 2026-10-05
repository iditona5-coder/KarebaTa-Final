import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Cegah error internal assertion Firebase Auth yang tidak berbahaya (misalnya saat popup login Google ditutup/dibatalkan sebelum selesai)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error?.message || '';
    if (
      msg.includes('Pending promise was never set') ||
      msg.includes('INTERNAL ASSERTION FAILED')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('Pending promise was never set') ||
      msg.includes('INTERNAL ASSERTION FAILED')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const firstArg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
    if (
      firstArg.includes('Pending promise was never set') ||
      firstArg.includes('INTERNAL ASSERTION FAILED')
    ) {
      // Redam error internal Firebase Auth assertion
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// 1. Matikan pop-up bawaan browser saat gambar/elemen ditekan lama (Long-press callout menu)
window.addEventListener(
  'contextmenu',
  (e) => {
    const target = e.target as HTMLElement | null;
    // Tetap izinkan pada kolom input dan textarea jika user ingin paste teks
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
  },
  { capture: true }
);

// 2. Matikan dragging bawaan browser pada seluruh elemen (mencegah bayangan ghost saat ditarik)
window.addEventListener(
  'dragstart',
  (e) => {
    e.preventDefault();
  },
  { capture: true }
);

// 3. Matikan seleksi & salin teks (Copy) di seluruh halaman aplikasi, kecuali di dalam input / textarea
window.addEventListener(
  'copy',
  (e) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
  },
  { capture: true }
);

window.addEventListener(
  'selectstart',
  (e) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
  },
  { capture: true }
);

// 4. Matikan pinch-to-zoom gesture (mencubit layar dengan 2 jari)
window.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches && e.touches.length > 1) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  },
  { passive: false }
);

// Matikan gesture zoom bawaan Safari/WebKit (gesturestart / gesturechange / gestureend)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// Matikan zoom dengan tombol keyboard Ctrl + Plus/Minus/0 atau Ctrl + roda scroll mouse
window.addEventListener(
  'keydown',
  (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')
    ) {
      e.preventDefault();
    }
  },
  { capture: true }
);

window.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// 5. Matikan gesture geser tepi layar (Edge swipe) yang memunculkan icon panah kembali bawaan browser
let edgeTouchStartX = 0;
let edgeTouchStartY = 0;

window.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches && e.touches[0]) {
      edgeTouchStartX = e.touches[0].clientX;
      edgeTouchStartY = e.touches[0].clientY;
    }
  },
  { passive: true }
);

window.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches && e.touches[0]) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - edgeTouchStartX;
      const diffY = currentY - edgeTouchStartY;

      // Jika geser ke kanan dimulai dari tepi kiri layar (pemicu icon panah kembali bawaan browser)
      if (edgeTouchStartX < 35 && diffX > 0 && Math.abs(diffX) > Math.abs(diffY)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }

      // Kunci semua gestur geser mendatar di seluruh area aplikasi kecuali di dalam carousel horizontal
      const target = e.target as HTMLElement | null;
      const isInsideCarousel = target?.closest(
        '.horizontal-scroll-container, [data-card-item], #card-media-carousel, #card-berita-carousel'
      );

      if (!isInsideCarousel && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  },
  { passive: false }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
