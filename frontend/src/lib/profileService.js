import { api } from "@/lib/api";
import { getCommunityQuestions } from "./communityQueries";

const PUBLIC_PROFILES_KEY = "amrita_community_user_profiles_v1";

const getStoredProfilesMap = () => {
  try {
    const raw = localStorage.getItem(PUBLIC_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to read public profiles from localStorage", e);
    return {};
  }
};

const setStoredProfilesMap = (map) => {
  try {
    localStorage.setItem(PUBLIC_PROFILES_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to write public profiles to localStorage", e);
  }
};

/**
 * Fetch a profile by user_id from Backend and local cache
 */
export const getUserProfile = async (userId, fallbackMeta) => {
  if (!userId) return null;
  const localMap = getStoredProfilesMap();
  const cached = localMap[userId];

  try {
    const res = await api.profiles.get(userId);
    if (res.data) {
      localMap[userId] = res.data;
      setStoredProfilesMap(localMap);
      return res.data;
    }
  } catch (err) {
    console.warn("Could not fetch remote profile, using cached/fallback:", err);
  }

  if (cached) return cached;

  if (fallbackMeta?.username || fallbackMeta?.department) {
    return {
      user_id: userId,
      full_name: fallbackMeta.username ? fallbackMeta.username.replace(/^u\//, "") : "Community Member",
      department: fallbackMeta.department || "Computer Science & Engineering",
      year: fallbackMeta.year || 3,
      avatar_url: null,
      bio: `Student at Amrita Sai Institute of Science & Technology (${fallbackMeta.department || "Engineering"}).`,
      skills: ["Problem Solving", "Academics", "Peer Learning"],
    };
  }

  return null;
};

/**
 * Save / Update user profile via Backend API
 */
export const saveUserProfile = async (userId, updates) => {
  const localMap = getStoredProfilesMap();
  const existing = localMap[userId] || {
    user_id: userId,
    full_name: "",
    department: null,
    year: null,
    avatar_url: null,
  };

  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await api.profiles.update(userId, updated);
    if (res.data) {
      localMap[userId] = res.data;
      setStoredProfilesMap(localMap);
      return res.data;
    }
  } catch (err) {
    console.error("Backend profile save error:", err);
  }

  localMap[userId] = updated;
  setStoredProfilesMap(localMap);
  return updated;
};

/**
 * Get community activity for a given user (Questions and Answers)
 */
export const getUserCommunityActivity = async (userId) => {
  try {
    const res = await api.profiles.getActivity(userId);
    if (res.data) return res.data;
  } catch {
    // fallback
  }

  const allQuestions = getCommunityQuestions();
  const userQuestions = allQuestions.filter((q) => q.authorId === userId);
  const userAnswers = [];
  allQuestions.forEach((q) => {
    q.answers?.forEach((a) => {
      if (a.authorId === userId) {
        userAnswers.push({
          questionId: q.id,
          questionTitle: q.title,
          answer: a,
        });
      }
    });
  });

  return {
    questions: userQuestions,
    answers: userAnswers,
    totalContributions: userQuestions.length + userAnswers.length,
  };
};
