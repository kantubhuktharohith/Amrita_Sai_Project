import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, optionalAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/notes - Get notes with optional filtering
router.get('/', async (req, res) => {
  try {
    const { department, semester, subject, search, userId, status, limit = 50, offset = 0, orderBy } = req.query;

    let query = supabase
      .from('notes')
      .select('*', { count: 'exact' });

    if (orderBy === 'downloads') {
      query = query.order('downloads', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (department && typeof department === 'string') {
      query = query.eq('department', department);
    }
    if (semester && !isNaN(Number(semester))) {
      query = query.eq('semester', Number(semester));
    }
    if (subject && typeof subject === 'string') {
      query = query.ilike('subject', `%${subject}%`);
    }
    if (userId && typeof userId === 'string') {
      query = query.eq('user_id', userId);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    // Fetch uploader profiles
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((n) => n.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map();
        profiles?.forEach((p) => profileMap.set(p.user_id, p));

        data.forEach((note) => {
          const profile = profileMap.get(note.user_id);
          note.uploader_name = profile?.full_name || 'Anonymous Student';
          note.uploader_avatar = profile?.avatar_url || null;
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

// GET /api/notes/:id - Get a single note by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Fetch uploader profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', note.user_id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        ...note,
        uploader_name: profile?.full_name || 'Anonymous Student',
        uploader_avatar: profile?.avatar_url || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notes - Create a new note (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, subject, department, semester, description, file_url, file_type, file_size } = req.body;

    if (!title || !subject || !file_url) {
      return res.status(400).json({ success: false, error: 'Title, subject, and file URL are required' });
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: req.user.id,
        title: title.trim(),
        subject: subject.trim(),
        department: department || null,
        semester: semester ? Number(semester) : null,
        description: description?.trim() || null,
        file_url,
        file_type: file_type || 'pdf',
        file_size: file_size || null,
        status: 'approved', // auto-approve notes for peer sharing
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

// PUT /api/notes/:id - Update note metadata
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, department, semester, description, status } = req.body;

    // Check ownership or admin
    const { data: note } = await supabase
      .from('notes')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    if (note.user_id !== req.user.id) {
      // Check if admin
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        return res.status(403).json({ success: false, error: 'Unauthorized to update this note' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (department !== undefined) updates.department = department;
    if (semester !== undefined) updates.semester = Number(semester);
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('notes')
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

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: note } = await supabase
      .from('notes')
      .select('user_id, file_url')
      .eq('id', id)
      .maybeSingle();

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    if (note.user_id !== req.user.id) {
      // Check admin
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this note' });
      }
    }

    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notes/:id/download - Increment download count
router.post('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: note, error: fetchErr } = await supabase
      .from('notes')
      .select('downloads')
      .eq('id', id)
      .single();

    if (fetchErr || !note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const newCount = (note.downloads || 0) + 1;
    const { error: updateErr } = await supabase
      .from('notes')
      .update({ downloads: newCount })
      .eq('id', id);

    if (updateErr) throw updateErr;

    res.json({ success: true, downloads: newCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
