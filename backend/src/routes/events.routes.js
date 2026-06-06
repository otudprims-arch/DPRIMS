// src/routes/events.routes.js
import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

/*
  هذا المسار مخصص لعرض صور الأحداث المحفوظة من Python AI
  مثال:
  /api/events/image?path=D:\0x\dprims-project\python-ai\events\abc_front.jpg
*/

const PROJECT_ROOT = process.cwd();

/*
  لو شغال من فولدر backend:
  process.cwd() = D:\0x\dprims-project\backend
  لذلك نطلع خطوة ونروح python-ai/events
*/
const EVENTS_DIR = path.resolve(PROJECT_ROOT, '..', 'python-ai', 'events');

function normalizeImagePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }

  const decoded = decodeURIComponent(inputPath);

  // لو جاي absolute path من Python زي D:\...
  const absolutePath = path.resolve(decoded);

  // حماية: ممنوع نقرأ أي صورة خارج فولدر events
  const safeEventsDir = path.resolve(EVENTS_DIR);

  if (!absolutePath.startsWith(safeEventsDir)) {
    return null;
  }

  return absolutePath;
}

router.get('/image', (req, res) => {
  try {
    const imagePath = normalizeImagePath(req.query.path);

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image path',
      });
    }

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        path: imagePath,
      });
    }

    const ext = path.extname(imagePath).toLowerCase();

    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    return fs.createReadStream(imagePath).pipe(res);
  } catch (err) {
    console.error('[EVENT IMAGE ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to load image',
    });
  }
});

export default router;