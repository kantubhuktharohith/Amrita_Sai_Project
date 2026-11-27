import { api } from "@/lib/api";

const STORAGE_KEY = "amrita_community_posts_real_v1";

export const getCommunityQuestions = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((q) => !["q-1", "q-2", "q-3", "q-4", "q-5", "q-6"].includes(q.id));
      }
    }
  } catch (err) {
    console.error("Error reading community questions from localStorage", err);
  }
  return [];
};

export const saveCommunityQuestions = (questions) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (err) {
    console.error("Error saving community questions", err);
  }
};

export const fetchCommunityQuestions = async (subCommunity) => {
  try {
    const res = await api.community.getPosts(subCommunity);
    if (res.data && res.data.length > 0) {
      saveCommunityQuestions(res.data);
      return res.data;
    }
  } catch (err) {
    console.warn("Backend community fetch fallback to cache:", err);
  }
  return getCommunityQuestions();
};

export const getQuestionById = (id) => {
  const all = getCommunityQuestions();
  return all.find((q) => q.id === id) || null;
};

export const fetchQuestionById = async (id) => {
  const all = await fetchCommunityQuestions();
  return all.find((q) => q.id === id) || null;
};

export const createQuestion = async (input) => {
  try {
    const res = await api.community.createPost({
      title: input.title,
      content: input.content,
      subCommunity: input.subCommunity || "r/all",
      tags: input.tags,
      authorFlair: input.authorFlair,
    });

    const newQuestion = res.data;
    const all = getCommunityQuestions();
    saveCommunityQuestions([newQuestion, ...all]);
    return { success: true, question: newQuestion };
  } catch (err) {
    console.error("Error creating community question:", err);
    return { success: false, error: err.message || "Failed to publish question" };
  }
};

export const createAnswer = async (input) => {
  try {
    const res = await api.community.createAnswer(input.questionId, input.content);
    const newAnswer = res.data;

    const all = getCommunityQuestions();
    const qIndex = all.findIndex((q) => q.id === input.questionId);
    if (qIndex !== -1) {
      if (!all[qIndex].answers) all[qIndex].answers = [];
      all[qIndex].answers.push(newAnswer);
      saveCommunityQuestions(all);
    }
    return { success: true, answer: newAnswer };
  } catch (err) {
    console.error("Error creating community answer:", err);
    return { success: false, error: err.message || "Failed to post answer" };
  }
};

export const voteOnQuestion = async (questionId, direction) => {
  try {
    await api.community.vote(questionId, 'post', direction);
  } catch (err) {
    console.warn("Backend vote failed, updating locally:", err);
  }

  const all = getCommunityQuestions();
  const q = all.find((item) => item.id === questionId);
  if (!q) return { upvotes: 0, downvotes: 0, userVote: 0 };

  if (q.userVote === direction) {
    if (direction === 1) q.upvotes = Math.max(0, (q.upvotes || 1) - 1);
    else q.downvotes = Math.max(0, (q.downvotes || 0) - 1);
    q.userVote = 0;
  } else {
    if (direction === 1) {
      q.upvotes = (q.upvotes || 0) + 1;
      q.downvotes = Math.max(0, (q.downvotes || 0) - 1);
    } else {
      q.downvotes = (q.downvotes || 0) + 1;
      q.upvotes = Math.max(0, (q.upvotes || 1) - 1);
    }
    q.userVote = direction;
  }
  saveCommunityQuestions(all);
  return {
    upvotes: q.upvotes,
    downvotes: q.downvotes,
    userVote: q.userVote || 0,
  };
};

export const voteOnAnswer = async (questionId, answerId, delta = 1) => {
  try {
    await api.community.vote(answerId, 'answer', delta);
  } catch (err) {
    console.warn("Backend vote failed:", err);
  }

  const all = getCommunityQuestions();
  const q = all.find((item) => item.id === questionId);
  if (q) {
    const ans = (q.answers || []).find((a) => a.id === answerId);
    if (ans) {
      ans.upvotes = Math.max(0, (ans.upvotes || 0) + delta);
      saveCommunityQuestions(all);
      return ans.upvotes;
    }
  }
  return 0;
};

export const acceptAnswer = (questionId, answerId) => {
  const all = getCommunityQuestions();
  const q = all.find((item) => item.id === questionId);
  if (q) {
    q.isResolved = true;
    q.acceptedAnswerId = answerId;
    (q.answers || []).forEach((a) => {
      a.isAccepted = a.id === answerId;
    });
    saveCommunityQuestions(all);
    return true;
  }
  return false;
};

export const incrementQuestionViews = (questionId) => {
  const all = getCommunityQuestions();
  const q = all.find((item) => item.id === questionId);
  if (q) {
    q.views = (q.views || 0) + 1;
    saveCommunityQuestions(all);
  }
};
