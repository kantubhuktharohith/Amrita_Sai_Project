import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/ratings/summary - Get map of average ratings
router.get('/summary', async (req, res) => {
  try {
    const { content_type = 'note' } = req.query;
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('content_id, rating')
      .eq('content_type', content_type);

    if (error) throw error;

    const map = {};
    const counts = {};
    ratings?.forEach((r) => {
      map[r.content_id] = (map[r.content_id] || 0) + r.rating;
      counts[r.content_id] = (counts[r.content_id] || 0) + 1;
    });

    const result = {};
    Object.keys(map).forEach((id) => {
      result[id] = Number((map[id] / counts[id]).toFixed(1));
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ratings - Get rating stats for an item
router.get('/', async (req, res) => {
  try {
    const { content_id, content_type = 'note', user_id } = req.query;

    if (!content_id) {
      return res.status(400).json({ success: false, error: 'content_id required' });
    }

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('rating, user_id')
      .eq('content_id', content_id)
      .eq('content_type', content_type);

    if (error) throw error;

    const total = ratings?.length || 0;
    const sum = ratings?.reduce((acc, curr) => acc + (curr.rating || 0), 0) || 0;
    const average = total > 0 ? (sum / total).toFixed(1) : 0;

    let userRating = null;
    if (user_id) {
      const found = ratings?.find((r) => r.user_id === user_id);
      userRating = found ? found.rating : null;
    }

    res.json({
      success: true,
      data: {
        average: Number(average),
        count: total,
        userRating,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ratings - Submit or update rating
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content_id, content_type = 'note', rating } = req.body;

    if (!content_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Valid content_id and rating (1-5) required' });
    }

    const { data, error } = await supabase
      .from('ratings')
      .upsert(
        {
          user_id: req.user.id,
          content_id,
          content_type,
          rating: Number(rating),
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,content_id,content_type' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
