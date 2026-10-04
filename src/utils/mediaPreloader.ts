/**
 * Utilitas Preloading Media Beranda Khas Facebook / Instagram
 * Mengunduh dan mendecode gambar/thumbnail di memori latar belakang (background memory)
 * sehingga saat pengguna melakukan scroll, gambar sudah 100% matang di memori cache GPU
 * tanpa kedipan tirai (curtain rendering) atau muncul setengah.
 */

const decodedMediaCache = new Set<string>();

/**
 * Cek apakah media sudah selesai didecode di memori browser
 */
export function isMediaCached(url: string | undefined): boolean {
  if (!url) return false;
  return decodedMediaCache.has(url);
}

/**
 * Tandai URL media sebagai sudah terdecode
 */
export function markMediaCached(url: string) {
  if (url) decodedMediaCache.add(url);
}

/**
 * Preload dan decode satu gambar secara asinkronus ke memori browser
 */
export function preloadImage(url: string): Promise<void> {
  if (!url || typeof window === "undefined") return Promise.resolve();
  if (decodedMediaCache.has(url)) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";

    let finished = false;
    const onComplete = () => {
      if (finished) return;
      finished = true;
      decodedMediaCache.add(url);
      resolve();
    };

    img.onload = onComplete;
    img.onerror = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    img.src = url;

    if (typeof img.decode === "function") {
      img.decode().then(onComplete).catch(() => {
        // Abaikan error decoding, fallback ke onload
      });
    }
  });
}

/**
 * Preload sekelompok media postingan beranda ke memori (prioritaskan 15 pertama)
 */
export function preloadFeedMedia(urls: (string | undefined)[]) {
  if (typeof window === "undefined") return;

  const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === "string"));

  // Eksekusi preload secara bertahap agar tidak membebani koneksi awal
  const immediateBatch = validUrls.slice(0, 10);
  const nextBatch = validUrls.slice(10, 25);

  immediateBatch.forEach((url) => {
    preloadImage(url);
  });

  if (nextBatch.length > 0) {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => {
        nextBatch.forEach((url) => preloadImage(url));
      });
    } else {
      setTimeout(() => {
        nextBatch.forEach((url) => preloadImage(url));
      }, 300);
    }
  }
}
