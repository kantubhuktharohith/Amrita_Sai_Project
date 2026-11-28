import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/exam-papers - Get exam papers with filtering
router.get('/', async (req, res) => {
  try {
    const { department, semester, examType, year, search, userId, status, limit = 50, offset = 0, orderBy } = req.query;

    let query = supabase
      .from('exam_papers')
      .select('*', { count: 'exact' });

    if (orderBy === 'downloads') {
      query = query.order('downloads', { ascending: false });
    } else {
      query = query.order('year', { ascending: false });
    }

    if (department && typeof department === 'string') {
      query = query.eq('department', department);
    }
    if (semester && !isNaN(Number(semester))) {
      query = query.eq('semester', Number(semester));
    }
    if (examType && typeof examType === 'string') {
      query = query.eq('exam_type', examType);
    }
    if (year && !isNaN(Number(year))) {
      query = query.eq('year', Number(year));
    }
    if (userId && typeof userId === 'string') {
      query = query.eq('user_id', userId);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    // Fetch uploader profiles
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p) => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map();
        profiles?.forEach((p) => profileMap.set(p.user_id, p));

        data.forEach((paper) => {
          const profile = profileMap.get(paper.user_id);
          paper.uploader_name = profile?.full_name || 'Anonymous Student';
          paper.uploader_avatar = profile?.avatar_url || null;
        });
      }
    }

    res.json({
      success: true,
      count,
      data: data || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/exam-papers/:id - Get a single exam paper by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: paper, error } = await supabase
      .from('exam_papers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !paper) {
      return res.status(404).json({ success: false, error: 'Exam paper not found' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', paper.user_id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        ...paper,
        uploader_name: profile?.full_name || 'Anonymous Student',
        uploader_avatar: profile?.avatar_url || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/exam-papers - Create new exam paper (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, subject, department, semester, exam_type, year, file_url, file_type, file_size } = req.body;

    if (!title || !subject || !file_url) {
      return res.status(400).json({ success: false, error: 'Title, subject, and file URL are required' });
    }

    const { data, error } = await supabase
      .from('exam_papers')
      .insert({
        user_id: req.user.id,
        title: title.trim(),
        subject: subject.trim(),
        department: department || null,
        semester: semester ? Number(semester) : null,
        exam_type: exam_type || 'regular',
        year: year ? Number(year) : new Date().getFullYear(),
        file_url,
        file_type: file_type || 'pdf',
        file_size: file_size || null,
        status: 'approved',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/exam-papers/:id - Update exam paper
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, department, semester, exam_type, year, status } = req.body;

    const { data: paper } = await supabase
      .from('exam_papers')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Exam paper not found' });
    }

    if (paper.user_id !== req.user.id) {
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        return res.status(403).json({ success: false, error: 'Unauthorized to update this paper' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (department !== undefined) updates.department = department;
    if (semester !== undefined) updates.semester = Number(semester);
    if (exam_type !== undefined) updates.exam_type = exam_type;
    if (year !== undefined) updates.year = Number(year);
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('exam_papers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/exam-papers/:id - Delete exam paper
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: paper } = await supabase
      .from('exam_papers')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Exam paper not found' });
    }

    if (paper.user_id !== req.user.id) {
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this paper' });
      }
    }

    const { error } = await supabase.from('exam_papers').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Exam paper deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/exam-papers/:id/download - Increment download count
router.post('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: paper, error: fetchErr } = await supabase
      .from('exam_papers')
      .select('downloads')
      .eq('id', id)
      .single();

    if (fetchErr || !paper) {
      return res.status(404).json({ success: false, error: 'Exam paper not found' });
    }

    const newCount = (paper.downloads || 0) + 1;
    const { error: updateErr } = await supabase
      .from('exam_papers')
      .update({ downloads: newCount })
      .eq('id', id);

    if (updateErr) throw updateErr;

    res.json({ success: true, downloads: newCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
