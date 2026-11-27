import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/admin/all-uploads - Get all notes and exam papers
router.get('/all-uploads', requireAdmin, async (_req, res) => {
  try {
    const { data: notes, error: notesErr } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (notesErr) throw notesErr;

    const { data: papers, error: papersErr } = await supabase
      .from('exam_papers')
      .select('*')
      .order('created_at', { ascending: false });

    if (papersErr) throw papersErr;

    res.json({
      success: true,
      data: {
        notes: notes || [],
        examPapers: papers || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/notes/:id/status - Update note status (approve/reject)
router.put('/notes/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'

    const { data, error } = await supabase
      .from('notes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/exam-papers/:id/status - Update exam paper status
router.put('/exam-papers/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('exam_papers')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
