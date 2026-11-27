import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// POST /api/upload - Upload file to Supabase storage
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const bucket = req.body.bucket || 'notes';
    const originalName = req.file.originalname || 'document.pdf';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${req.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ success: false, error: uploadError.message });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

    res.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      bucket,
      fileName: originalName,
      fileSize: req.file.size,
      fileType: ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? 'image' : 'doc',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/upload - Delete file from Supabase storage
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { bucket = 'notes', path } = req.body;
    if (!path) {
      return res.status(400).json({ success: false, error: 'File path required' });
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'File deleted from storage' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
