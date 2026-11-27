import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import statsRouter from './routes/stats.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import notesRouter from './routes/notes.js';
import examPapersRouter from './routes/examPapers.js';
import communityRouter from './routes/community.js';
import commentsRouter from './routes/comments.js';
import ratingsRouter from './routes/ratings.js';
import adminRouter from './routes/admin.js';
import careerRouter from './routes/career.js';
import profilesRouter from './routes/profiles.js';
import newsRouter from './routes/news.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// CORS configuration
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'],
  credentials: true,
}));

// Middlewares
app.use(express.json());

// Request logger middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/stats', statsRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notes', notesRouter);
app.use('/api/exam-papers', examPapersRouter);
app.use('/api/community', communityRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/career', careerRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/news', newsRouter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Amrita Sai Study Hub Backend API',
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      auth: '/api/auth',
      upload: '/api/upload',
      notes: '/api/notes',
      examPapers: '/api/exam-papers',
      community: '/api/community',
      comments: '/api/comments',
      ratings: '/api/ratings',
      admin: '/api/admin',
      career: '/api/career',
      profiles: '/api/profiles',
      news: '/api/news',
    },
    docs: 'https://github.com/amrita-study-hub',
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Amrita Sai Study Hub Backend Server running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Allowed Client: ${CLIENT_URL}`);
  console.log(`=========================================`);
});

export default app;
