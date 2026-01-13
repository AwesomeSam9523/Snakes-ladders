const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    let server;
    if (process.env.VERCEL !== '1') {
      server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      });

      // Graceful shutdown
      const shutdown = async (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(async () => {
          await disconnectDB();
          console.log('Server closed');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    }

    module.exports = server;

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

