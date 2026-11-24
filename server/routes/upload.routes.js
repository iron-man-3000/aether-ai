import { Router } from 'express';
import multer from 'multer';
import { uploadLimiter } from '../middleware/rate-limiter.js';
import { DocumentParser } from '../services/documents/document-parser.js';

export const uploadRouter = Router();

// Memory storage: validate and process without touching disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

uploadRouter.post('/', uploadLimiter, upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const parsed = await DocumentParser.parse(req.file);
    res.json(parsed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
