import cors from 'cors';

// 配置 CORS 中间件
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];

    // 允许没有 origin 的请求（如 Postman）
    if (!origin) {
      return callback(null, true);
    }

    // 检查是否允许所有来源
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // 检查来源是否在允许列表中
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Explicitly allow the admin site origin
    if (origin === 'https://admin.pinhaopin.com') {
      return callback(null, true);
    }

    // Allow Chrome Extension
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
};

export const corsMiddleware = cors(corsOptions);
