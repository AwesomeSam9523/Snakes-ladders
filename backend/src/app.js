const express = require('express');
const cors = require('cors');
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

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Snakes and Ladders API' });
});

app.get('/api/version', (req, res) => {
  res.json({ version: API_VERSION_TIME });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

// Auto-sync team positions every 30 seconds (optimized for load)
setInterval(async () => {
  try {
    await syncAllTeamPositions();
  } catch (error) {
    console.error('Error in auto-sync:', error.message);
  }
}, 30000);

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('✓ Auto-sync enabled: Team positions will sync every 30 seconds');
    console.log('✓ Connection pooling: 20 concurrent connections max');
  });
}

module.exports = app;
