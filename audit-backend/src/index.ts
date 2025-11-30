import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import databaseManager from './utils/database';
import { corsMiddleware } from './middleware/cors';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import auditRecordsRouter from './routes/auditRecords';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import proxyRouter from './routes/proxy';
import systemSettingsRouter from './routes/systemSettings';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3000;

// 配置 helmet 中间件（设置安全响应头）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// 配置 rate limiter（限制每个IP的请求频率）
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 默认15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 默认每个窗口最多100个请求
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // 返回 RateLimit-* 头部
  legacyHeaders: false, // 禁用 X-RateLimit-* 头部
});

// 应用 rate limiter 到所有请求
app.use(limiter);

// 配置 compression 中间件（压缩响应）
app.use(compression({
  filter: (req, res) => {
    // 只压缩可压缩的内容类型
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // 压缩级别 (0-9)，6 是默认值，平衡压缩率和速度
  threshold: 1024, // 只压缩大于 1KB 的响应
}));

// 注册中间件
app.use(corsMiddleware);
app.use(express.json());
app.use(loggerMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 注册路由
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/audit-records', auditRecordsRouter);
app.use('/api/settings', systemSettingsRouter);

// 注册错误处理中间件（必须在所有路由之后）
app.use(errorHandler);

// 初始化数据库连接并启动服务器
async function startServer() {
  try {
    // 连接数据库
    await databaseManager.connect({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'audit_system',
      connectionLimit: 10,
    });

    // 启动服务器
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await databaseManager.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  try {
    await databaseManager.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// 启动服务器
startServer();

export default app;
