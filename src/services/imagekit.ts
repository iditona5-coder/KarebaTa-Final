/**
 * ImageKit Integration Service
 * Endpoint: https://ik.imagekit.io/rdyi1j1sg
 */

export interface ImageKitUploadResult {
  url: string;
  thumbnailUrl: string;
  fileId: string;
  name: string;
}

const IMAGEKIT_UPLOAD_ENDPOINT = 'https://upload.imagekit.io/api/v1/files/upload';
const IMAGEKIT_AUTH_HEADER = 'Basic ' + btoa('private_Hfxv7O6OPu7fA8wOA03WgNaxMKY=:');

/**
 * Uploads media (File, Blob, or base64) directly to ImageKit CDN.
 * Bekerja langsung baik di localhost maupun di Firebase Hosting publik (https://kareba-ta-728d0.web.app).
 */
export async function uploadToImageKit(
  fileData: File | Blob | string,
  fileName?: string,
  folder = '/karebata'
): Promise<ImageKitUploadResult> {
  const finalFileName =
    fileName || `kareba_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

  try {
    // 1. Langsung unggah ke ImageKit Cloud API (Mendukung upload langsung dari browser ke CDN)
    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('fileName', finalFileName);
    formData.append('folder', folder);
    formData.append('useUniqueFileName', 'true');
    formData.append('tags', 'karebata,warga_feed');

    const directRes = await fetch(IMAGEKIT_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: IMAGEKIT_AUTH_HEADER,
      },
      body: formData,
    });

    if (directRes.ok) {
      const data = await directRes.json();
      console.log('[ImageKit] Berhasil diunggah ke CDN publik:', data.url);
      return {
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || (data.url ? `${data.url}?tr=w-500,fo-auto` : data.url),
        fileId: data.fileId || '',
        name: data.name || finalFileName,
      };
    }

    console.warn('[ImageKit Direct] Status:', directRes.status, 'mencoba fallback server lokal...');
  } catch (directErr) {
    console.warn('[ImageKit Direct] Terjadi kendala jaringan:', directErr);
  }

  // 2. Fallback: Coba melalui rute server lokal (/api/upload) jika tersedia
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: typeof fileData === 'string' ? fileData : undefined,
        fileName: finalFileName,
        folder,
        tags: ['karebata', 'warga_feed'],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || data.url,
        fileId: data.fileId || '',
        name: data.name || finalFileName,
      };
    }
  } catch (proxyErr) {
    console.warn('[ImageKit Proxy] Gagal:', proxyErr);
  }

  // 3. Fallback darurat lokal agar antarmuka tidak macet
  const fallbackUrl = typeof fileData === 'string' ? fileData : '';
  return {
    url: fallbackUrl,
    thumbnailUrl: fallbackUrl,
    fileId: `local-${Date.now()}`,
    name: finalFileName,
  };
}

/**
 * Menghapus file media dari ImageKit CDN
 */
export async function deleteFromImageKit(fileId?: string): Promise<boolean> {
  if (!fileId || fileId.startsWith('local-')) return false;

  try {
    const directRes = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: IMAGEKIT_AUTH_HEADER,
      },
    });

    if (directRes.ok || directRes.status === 204 || directRes.status === 200) {
      console.log(`[ImageKit] File ${fileId} berhasil dihapus dari ImageKit CDN`);
      return true;
    }
  } catch (err) {
    console.warn('[ImageKit Direct] Gagal menghapus file:', err);
  }

  // Fallback via server
  try {
    const res = await fetch(`/api/media/${fileId}`, { method: 'DELETE' });
    return res.ok;
  } catch (proxyErr) {
    return false;
  }
}
