/**
 * Utilitas Pengompresan Gambar di Sisi Klien (HP Pengguna)
 * 
 * Manfaat:
 * 1. Gudang ImageKit & Firebase tidak cepat penuh
 * 2. Upload tetap secepat kilat meski sinyal HP selelet siput (3G/EDGE)
 * 3. Sangat hemat kuota internet bagi pengunggah maupun pembaca
 * 4. Resolusi gambar tetap jernih dan tajam di layar ponsel
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 - 1.0 (default 0.82)
}

export function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = options;

  return new Promise((resolve) => {
    // Jika bukan gambar, kembalikan URL biasa
    if (!file.type.startsWith("image/")) {
      resolve(URL.createObjectURL(file));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Hitung skala rasio agar tidak melebihi batas resolusi maksimal
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // Buat canvas untuk render ulang dan kompresi
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback jika canvas gagal
        resolve(URL.createObjectURL(file));
        return;
      }

      // Gambar dengan penajaman standar
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi ke format JPEG terkompresi dengan kualitas optimal
      try {
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn("Gagal mengompres gambar:", err);
        resolve(URL.createObjectURL(file));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(URL.createObjectURL(file));
    };

    img.src = objectUrl;
  });
}
