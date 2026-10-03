import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers with large limit for compressed photos and video thumbnails
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// ImageKit credentials (configured securely on backend)
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/rdyi1j1sg';
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || 'public_WEwv7Q9gV4tFyZzV0obqGnKfT94=';
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || 'private_Hfxv7O6OPu7fA8wOA03WgNaxMKY=';

// Endpoint to upload base64 or media directly to ImageKit
app.post('/api/upload', async (req, res) => {
  try {
    const { file, fileName, folder = '/karebata', tags = ['karebata'] } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const authHeader = 'Basic ' + Buffer.from(IMAGEKIT_PRIVATE_KEY + ':').toString('base64');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName || `karebata_${Date.now()}.jpg`);
    formData.append('folder', folder);
    formData.append('useUniqueFileName', 'true');
    if (tags && Array.isArray(tags)) {
      formData.append('tags', tags.join(','));
    }

    const ikResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const ikData = await ikResponse.json();

    if (!ikResponse.ok) {
      console.error('ImageKit API error:', ikData);
      return res.status(ikResponse.status).json({
        error: ikData.message || 'ImageKit upload failed',
        details: ikData,
      });
    }

    return res.json({
      success: true,
      url: ikData.url,
      thumbnailUrl: ikData.thumbnailUrl || ikData.url,
      fileId: ikData.fileId,
      name: ikData.name,
      filePath: ikData.filePath,
      fileType: ikData.fileType,
      size: ikData.size,
    });
  } catch (error: any) {
    console.error('Server upload error:', error);
    return res.status(500).json({ error: error.message || 'Internal upload error' });
  }
});

// Endpoint to delete media from ImageKit CDN
app.delete('/api/media/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId required' });
    }

    const authHeader = 'Basic ' + Buffer.from(IMAGEKIT_PRIVATE_KEY + ':').toString('base64');
    const ikResponse = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    return res.status(ikResponse.status).json({ success: ikResponse.ok });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal delete error' });
  }
});

// ImageKit client authentication token endpoint
app.get('/api/imagekit/auth', (_req, res) => {
  try {
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes validity
    const signature = crypto
      .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
      .update(token + expire)
      .digest('hex');

    res.json({
      token,
      expire,
      signature,
      publicKey: IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'KarebaTa API',
    imagekitEndpoint: IMAGEKIT_URL_ENDPOINT,
    configured: true,
  });
});

// Mount Vite in development or serve static build in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get(['/admin', '/admin/*'], (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'admin.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev mode, route /admin and /admin/* to /admin.html
    app.use((req, _res, next) => {
      const urlPath = req.url.split('?')[0];
      if (urlPath === '/admin' || urlPath.startsWith('/admin/')) {
        const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
        req.url = '/admin.html' + query;
      }
      next();
    });
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
