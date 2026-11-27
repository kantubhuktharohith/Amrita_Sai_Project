import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/comments - Get comments for a content item
router.get('/', async (req, res) => {
  try {
    const { content_id, content_type = 'note' } = req.query;

    if (!content_id) {
      return res.status(400).json({ success: false, error: 'content_id is required' });
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Attach user profile information
    if (comments && comments.length > 0) {
      const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const map = new Map();
        profiles?.forEach((p) => map.set(p.user_id, p));

        comments.forEach((c) => {
          const prof = map.get(c.user_id);
          c.user_name = prof?.full_name || 'Anonymous Student';
          c.user_avatar = prof?.avatar_url || null;
        });
      }
    }

    res.json({ success: true, data: comments || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/comments - Add a comment
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content_id, content_type = 'note', body } = req.body;

    if (!content_id || !body?.trim()) {
      return res.status(400).json({ success: false, error: 'content_id and body are required' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: req.user.id,
        content_id,
        content_type,
        body: body.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', req.user.id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        ...data,
        user_name: profile?.full_name || req.user.email?.split('@')[0] || 'Anonymous Student',
        user_avatar: profile?.avatar_url || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/comments/:id - Delete a comment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      // Check admin
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', req.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this comment' });
      }
    }

    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
