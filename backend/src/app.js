const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { syncAllTeamPositions } = require('./modules/superadmin/superadmin.service');

const app = express();
const API_VERSION_TIME = Date.now().toString();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 30, // 30 requests per 15 seconds per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 login attempts per minute
  message: { error: 'Too many login attempts, please try again later.' },
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Snakes and Ladders API' });
});

app.get('/version', (req, res) => {
  res.json({ version: API_VERSION_TIME });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

// Auto-sync team positions every 15 seconds (optimized for load)
setInterval(async () => {
  try {
    await syncAllTeamPositions();
  } catch (error) {
    console.error('Error in auto-sync:', error.message);
  }
}, 15000);

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('✓ Auto-sync enabled: Team positions will sync every 15 seconds');
    console.log('✓ Rate limiting enabled: 30 req/15s for API, 10 req/min for auth');
  });
}

module.exports = app;
