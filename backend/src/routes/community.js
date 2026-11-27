import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

const COMMUNITY_QUESTIONS_ID = '00000000-0000-0000-0000-000000000001';
const COMMUNITY_ANSWERS_ID = '00000000-0000-0000-0000-000000000002';

export const SUB_COMMUNITIES = [
  { id: "r/all", label: "r/all", desc: "All-in-One Community Feed", icon: "🌐" },
  { id: "r/cse", label: "r/cse", desc: "Computer Science & Engineering", icon: "💻" },
  { id: "r/aiml", label: "r/aiml", desc: "CSE (AI & Machine Learning)", icon: "🤖" },
  { id: "r/datascience", label: "r/datascience", desc: "CSE (Data Science & Analytics)", icon: "📊" },
  { id: "r/cybersec", label: "r/cybersec", desc: "CSE (Cyber Security & Defense)", icon: "🛡️" },
  { id: "r/bigdata", label: "r/bigdata", desc: "CSE (Big Data Analytics)", icon: "🗄️" },
  { id: "r/ece", label: "r/ece", desc: "Electronics & Communication", icon: "⚡" },
  { id: "r/eee", label: "r/eee", desc: "Electrical & Electronics", icon: "🔋" },
  { id: "r/mech", label: "r/mech", desc: "Mechanical Engineering", icon: "⚙️" },
  { id: "r/civil", label: "r/civil", desc: "Civil Engineering", icon: "🏗️" },
  { id: "r/placements", label: "r/placements", desc: "Placements, Resumes & Drives", icon: "💼" },
  { id: "r/general", label: "r/general", desc: "General Campus & Student Life", icon: "🎓" },
];

// GET /api/community/subcommunities
router.get('/subcommunities', (_req, res) => {
  res.json({ success: true, data: SUB_COMMUNITIES });
});

// GET /api/community/info
router.get('/info', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Amrita Sai Peer Learning Community',
      subCommunitiesCount: SUB_COMMUNITIES.length,
      rules: [
        'Be respectful and constructive in discussions',
        'Provide clear questions with subject & year context',
        'Tag your code snippets and provide relevant context',
        'No academic dishonesty or exam leaks',
      ],
    },
  });
});

// GET /api/community/posts - Get community questions / posts
router.get('/posts', async (req, res) => {
  try {
    const { subCommunity } = req.query;
    let mapped = [];

    // Try fetching from dedicated public.community_posts table
    const { data: dedicatedPosts, error: dedicatedError } = await supabase
      .from('community_posts')
      .select('*, community_answers(*)')
      .order('created_at', { ascending: false });

    if (!dedicatedError && dedicatedPosts && dedicatedPosts.length > 0) {
      mapped = dedicatedPosts.map((p) => ({
        id: p.id,
        authorId: p.user_id,
        authorUsername: p.author_username || 'Student',
        authorDepartment: p.author_department || 'General',
        authorYear: p.author_year || '',
        authorFlair: p.author_flair || 'Student',
        subCommunity: p.sub_community,
        title: p.title,
        content: p.content,
        tags: p.tags || [],
        votes: p.votes || 0,
        answerCount: p.community_answers?.length || 0,
        createdAt: p.created_at,
        pinned: p.pinned || false,
        answers: (p.community_answers || []).map((a) => ({
          id: a.id,
          authorId: a.user_id,
          authorUsername: a.author_username || 'Student',
          authorDepartment: a.author_department || 'General',
          authorYear: a.author_year || '',
          content: a.content,
          votes: a.votes || 0,
          createdAt: a.created_at,
          isAccepted: a.is_accepted || false,
        })),
      }));
    } else {
      // Fallback to comments table
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('content_type', 'note')
        .eq('content_id', COMMUNITY_QUESTIONS_ID)
        .order('created_at', { ascending: false });

      if (commentsData && commentsData.length > 0) {
        commentsData.forEach((row) => {
          try {
            const parsed = JSON.parse(row.body);
            mapped.push({
              ...parsed,
              id: parsed.id || row.id,
              authorId: row.user_id || parsed.authorId,
              createdAt: parsed.createdAt || row.created_at,
              answers: parsed.answers || [],
            });
          } catch {
            // ignore malformed row
          }
        });
      }
    }

    if (subCommunity && subCommunity !== 'r/all') {
      mapped = mapped.filter((p) => p.subCommunity === subCommunity || p.sub_community === subCommunity);
    }

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

// POST /api/community/posts - Create new question
router.post('/posts', requireAuth, async (req, res) => {
  try {
    const { title, content, subCommunity, tags, authorFlair } = req.body;

    if (!title || !content || !subCommunity) {
      return res.status(400).json({ success: false, error: 'Title, content, and sub-community required' });
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, department, year')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const postPayload = {
      user_id: req.user.id,
      author_username: profile?.full_name || req.user.email?.split('@')[0] || 'Student',
      author_department: profile?.department || 'General',
      author_year: profile?.year || '1st Year',
      author_flair: authorFlair || 'Question',
      sub_community: subCommunity,
      title: title.trim(),
      content: content.trim(),
      tags: tags || [],
      votes: 0,
      created_at: new Date().toISOString(),
    };

    // Try insert into dedicated table
    const { data, error } = await supabase
      .from('community_posts')
      .insert(postPayload)
      .select()
      .maybeSingle();

    if (!error && data) {
      return res.json({ success: true, data });
    }

    // Fallback to comments table
    const newId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullPost = {
      id: newId,
      ...postPayload,
      answers: [],
    };

    await supabase.from('comments').insert({
      content_type: 'note',
      content_id: COMMUNITY_QUESTIONS_ID,
      user_id: req.user.id,
      body: JSON.stringify(fullPost),
    });

    res.json({ success: true, data: fullPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/community/posts/:id/answers - Submit an answer
router.post('/posts/:id/answers', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Answer content required' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, department, year')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const answerPayload = {
      post_id: id,
      user_id: req.user.id,
      author_username: profile?.full_name || req.user.email?.split('@')[0] || 'Student',
      author_department: profile?.department || 'General',
      author_year: profile?.year || '',
      content: content.trim(),
      votes: 0,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('community_answers')
      .insert(answerPayload)
      .select()
      .maybeSingle();

    if (!error && data) {
      return res.json({ success: true, data });
    }

    // Fallback
    const ansId = `ans-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullAns = {
      id: ansId,
      questionId: id,
      ...answerPayload,
    };

    await supabase.from('comments').insert({
      content_type: 'note',
      content_id: COMMUNITY_ANSWERS_ID,
      user_id: req.user.id,
      body: JSON.stringify(fullAns),
    });

    res.json({ success: true, data: fullAns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/community/vote - Upvote post or answer
router.post('/vote', requireAuth, async (req, res) => {
  try {
    const { targetId, targetType, delta = 1 } = req.body;
    const table = targetType === 'answer' ? 'community_answers' : 'community_posts';

    const { data: item } = await supabase
      .from(table)
      .select('votes')
      .eq('id', targetId)
      .maybeSingle();

    if (item) {
      const newVotes = (item.votes || 0) + delta;
      await supabase.from(table).update({ votes: newVotes }).eq('id', targetId);
      return res.json({ success: true, votes: newVotes });
    }

    res.json({ success: true, votes: delta });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
