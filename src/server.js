// server.js
require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // DB connect first
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('SIGINT received. Closing server...');
      server.close(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Closing server...');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
