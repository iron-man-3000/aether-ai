import helmet from 'helmet';
import cors from 'cors';
import { ENV } from '../config/env.js';

export function setupSecurityMiddleware(app) {
  // Helmet for secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible local asset and extension communication
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, extensions)
      if (!origin) return callback(null, true);

      // Allow chrome-extension:// and moz-extension://
      if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
        return callback(null, true);
      }

      if (ENV.ALLOWED_ORIGINS.length === 0 || ENV.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow localhost
      if (ENV.NODE_ENV === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  };

  app.use(cors(corsOptions));
}
