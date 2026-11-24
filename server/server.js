import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import { setupSecurityMiddleware } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';
import { chatRouter } from './routes/chat.routes.js';
import { modelsRouter } from './routes/models.routes.js';
import { uploadRouter } from './routes/upload.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();

// Security & Parsing Middleware
setupSecurityMiddleware(app);
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use('/shared', express.static(path.join(rootDir, 'shared')));
app.use(express.static(path.join(rootDir, 'website')));

// API Routes
app.use('/api/chat', chatRouter);
app.use('/api/models', modelsRouter);
app.use('/api/upload', uploadRouter);

// Fallback to website index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'website', 'index.html'));
});

// Centralized error handling
app.use(errorHandler);

// Start server
const server = app.listen(ENV.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  AETHER AI Server running on http://localhost:${ENV.PORT}`);
  console.log(`  Environment: ${ENV.NODE_ENV}`);
  console.log(`======================================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => console.log('HTTP server closed'));
});
