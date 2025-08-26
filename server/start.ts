// Server startup file
import { createServer } from './index';
import { setupAIWebSocket } from './routes/ai';
import { createDatabasePool } from './routes/auth';
import { Server } from 'http';

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    const server = createServer();
    const { app } = server;
    
    const httpServer: Server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API documentation available at http://localhost:${PORT}/api/docs`);
      console.log(`❤️ Health check available at http://localhost:${PORT}/api/status`);
      console.log(`🤖 AI WebSocket available at ws://localhost:${PORT}/api/ai/stream`);
      console.log(`🔌 Realtime WebSocket available at ws://localhost:${PORT}/socket.io`);
    });

    // Initialize WebSocket server
    server.initializeWebSocket(httpServer);

    // Setup AI WebSocket for streaming
    const dbPool = createDatabasePool();
    setupAIWebSocket(httpServer, dbPool);

    // Handle shutdown gracefully
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received.');
      httpServer.close(() => {
        console.log('HTTP server closed.');
      });
      await server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received.');
      httpServer.close(() => {
        console.log('HTTP server closed.');
      });
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();