/**
 * Unified Client API module for Amrita Sai Study Hub.
 * All requests route through the Express Backend (http://localhost:5000/api via Vite proxy /api).
 */

const API_BASE = '/api';
const TOKEN_KEY = 'amrita_auth_token';
const SESSION_KEY = 'amrita_auth_session';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setStoredSession(session) {
  if (session?.access_token) {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to JSON content-type
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({ error: res.statusText }));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Generic methods
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, body) => request(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),

  // Health & Stats
  checkHealth: () => request('/health'),
  getStats: () => request('/stats'),

  // Auth API
  auth: {
    async signup({ email, password, fullName, department, year }) {
      const res = await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName, department, year }),
      });
      if (res.session) setStoredSession(res.session);
      return res;
    },

    async login({ email, password }) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.session) setStoredSession(res.session);
      return res;
    },

    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        setStoredSession(null);
      }
    },

    async getSession() {
      const token = getStoredToken();
      if (!token) return { user: null, session: null };
      try {
        const res = await request('/auth/session');
        if (res.session) {
          setStoredSession(res.session);
        } else {
          setStoredSession(null);
        }
        return res;
      } catch {
        setStoredSession(null);
        return { user: null, session: null };
      }
    },

    async isAdmin() {
      const token = getStoredToken();
      if (!token) return false;
      try {
        const res = await request('/auth/is-admin');
        return !!res.isAdmin;
      } catch {
        return false;
      }
    },

    async resetPassword(email) {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
  },

  // Upload API (Multipart)
  upload: {
    async uploadFile(file, bucket = 'notes') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);

      return request('/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async deleteFile(path, bucket = 'notes') {
      return request('/upload', {
        method: 'DELETE',
        body: JSON.stringify({ path, bucket }),
      });
    },
  },

  // Notes API
  notes: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      return request(`/notes?${query.toString()}`);
    },
    get: (id) => request(`/notes/${id}`),
    create: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
    download: (id) => request(`/notes/${id}/download`, { method: 'POST' }),
  },

  // Exam Papers API
  examPapers: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      return request(`/exam-papers?${query.toString()}`);
    },
    get: (id) => request(`/exam-papers/${id}`),
    create: (data) => request('/exam-papers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/exam-papers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/exam-papers/${id}`, { method: 'DELETE' }),
    download: (id) => request(`/exam-papers/${id}/download`, { method: 'POST' }),
  },

  // Profiles API
  profiles: {
    list: () => request('/profiles'),
    get: (userId) => request(`/profiles/${userId}`),
    update: (userId, data) => request(`/profiles/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
    getActivity: (userId) => request(`/profiles/${userId}/activity`),
  },

  // Community API
  community: {
    getSubCommunities: () => request('/community/subcommunities'),
    getInfo: () => request('/community/info'),
    getPosts: (subCommunity) => {
      const query = subCommunity ? `?subCommunity=${encodeURIComponent(subCommunity)}` : '';
      return request(`/community/posts${query}`);
    },
    createPost: (data) => request('/community/posts', { method: 'POST', body: JSON.stringify(data) }),
    createAnswer: (postId, content) => request(`/community/posts/${postId}/answers`, { method: 'POST', body: JSON.stringify({ content }) }),
    vote: (targetId, targetType, delta = 1) => request('/community/vote', { method: 'POST', body: JSON.stringify({ targetId, targetType, delta }) }),
  },

  // Comments API
  comments: {
    list: (contentId, contentType = 'note') => request(`/comments?content_id=${contentId}&content_type=${contentType}`),
    create: (contentId, contentType, body) => request('/comments', { method: 'POST', body: JSON.stringify({ content_id: contentId, content_type: contentType, body }) }),
    delete: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  },

  // Ratings API
  ratings: {
    getSummary: (contentType = 'note') => request(`/ratings/summary?content_type=${contentType}`),
    get: (contentId, contentType = 'note', userId) => {
      let q = `/ratings?content_id=${contentId}&content_type=${contentType}`;
      if (userId) q += `&user_id=${userId}`;
      return request(q);
    },
    set: (contentId, contentType, rating) => request('/ratings', { method: 'POST', body: JSON.stringify({ content_id: contentId, content_type: contentType, rating }) }),
  },

  // Admin API
  admin: {
    allUploads: () => request('/admin/all-uploads'),
    updateNoteStatus: (id, status) => request(`/admin/notes/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    updatePaperStatus: (id, status) => request(`/admin/exam-papers/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },

  // Career API
  career: {
    getCategories: () => request('/career/categories'),
    getCategoryById: (id) => request(`/career/categories/${id}`),
    getRoadmaps: () => request('/career/roadmaps'),
    getInterviewPrep: () => request('/career/interview-prep'),
  },

  // News API
  news: {
    getFeed: () => request('/news'),
    getVideos: () => request('/news/videos'),
  },
};
