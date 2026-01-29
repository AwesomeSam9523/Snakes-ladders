const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const prisma = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();
const API_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || 'local';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://snakes.ieeemuj.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Snakes and Ladders API' });
});

app.get('/api/version', (req, res) => {
  res.json({ version: API_VERSION });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('✓ Auto-sync enabled: Team positions will sync every 30 seconds');
    console.log('✓ Connection pooling: 20 concurrent connections max');
  });
}

module.exports = app;
