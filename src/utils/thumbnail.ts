/**
 * Utilitas untuk mengekstrak thumbnail pratinjau dari file video atau URL video
 */

export function extractVideoThumbnail(source: string | File, seekTime = 0.8): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      let objectUrl: string | null = null;
      if (typeof source === "string") {
        video.src = source;
      } else {
        objectUrl = URL.createObjectURL(source);
        video.src = objectUrl;
      }

      let captured = false;
      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        video.remove();
      };

      const captureFrame = () => {
        if (captured) return;
        captured = true;
        try {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn("Gagal mengekstrak frame video ke canvas (kemungkinan CORS):", e);
        }
        cleanup();
        resolve(getFallbackVideoThumbnail());
      };

      video.onloadeddata = () => {
        const duration = video.duration || 1;
        const target = Math.min(seekTime, Math.max(0.1, duration / 2));
        video.currentTime = target;
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        cleanup();
        resolve(getFallbackVideoThumbnail());
      };

      // Batas waktu timeout 3.5 detik jika video lambat merespons
      setTimeout(() => {
        if (!captured) {
          captureFrame();
        }
      }, 3500);
    } catch {
      resolve(getFallbackVideoThumbnail());
    }
  });
}

/**
 * Fallback thumbnail jika browser memblokir frame (misal CORS remote URL)
 */
export function getFallbackVideoThumbnail(): string {
  // SVG poster data URL yang elegan dengan ikon pemutar video Kareba'Ta
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#00632B"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)"/>
    <circle cx="320" cy="180" r="44" fill="#000000" fill-opacity="0.5" stroke="#ffffff" stroke-width="2"/>
    <polygon points="312,165 336,180 312,195" fill="#ffffff"/>
    <text x="320" y="250" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">VIDEO KAREBA'TA</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
