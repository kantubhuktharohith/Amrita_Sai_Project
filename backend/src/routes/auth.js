import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/signup - Register new user
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, department, year } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || '',
          department: department || '',
          year: year || '',
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Auto-create/upsert profile in public.profiles table
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          full_name: fullName?.trim() || '',
          department: department || null,
          year: year || null,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.error('Profile creation error during signup:', profileErr);
      }
    }

    res.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login - Login user with password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/logout - Logout user
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/session - Verify session token and get user
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: true, user: null, session: null });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.json({ success: true, user: null, session: null });
    }

    res.json({
      success: true,
      user,
      session: {
        access_token: token,
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/is-admin - Check if current authenticated user is an admin
router.get('/is-admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error || !data) {
      return res.json({ success: true, isAdmin: false });
    }

    res.json({ success: true, isAdmin: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/reset-password - Request password reset email
router.post('/reset-password', async (req, res) => {
  try {
    const { email, redirectTo } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectTo || undefined,
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Password reset link sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
