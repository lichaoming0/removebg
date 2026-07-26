import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.REMOVE_BG_API_KEY;

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from Vite build in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Multer: accept single image file up to 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

app.post('/api/remove-bg', upload.single('image'), async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server not configured: missing API key' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const formData = new FormData();
    formData.append('image_file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const errors = await response.json();
      const message = errors?.errors?.[0]?.title || `remove.bg API error: ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': resultBuffer.length.toString(),
      'X-Original-Name': encodeURIComponent(req.file.originalname),
    });
    res.send(resultBuffer);
  } catch (err) {
    console.error('Error processing image:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback: SPA routing in production
if (fs.existsSync(distPath)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('WARNING: REMOVE_BG_API_KEY not set. API endpoint will fail.');
  }
});
