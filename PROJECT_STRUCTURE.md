# 商品审核系统项目结构

本项目包含三个主要部分：

## 1. 浏览器插件 (product-audit-extension)
现有的商品审核浏览器扩展程序，用于审核商品信息。

## 2. 后端 API 服务 (audit-backend)
基于 Node.js + Express + TypeScript 构建的 RESTful API 服务。

### 技术栈
- Node.js 18+
- Express.js 4.x
- TypeScript 5.x
- MySQL2 (数据库驱动)
- Winston (日志)
- Joi (数据验证)
- CORS (跨域支持)

### 目录结构
```
audit-backend/
├── src/
│   ├── routes/         # API 路由定义
│   ├── controllers/    # 控制器层
│   ├── services/       # 业务逻辑层
│   ├── models/         # 数据模型
│   ├── middleware/     # 中间件
│   ├── utils/          # 工具函数
│   └── index.ts        # 应用入口
├── dist/               # 编译输出
├── logs/               # 日志文件
└── .env.example        # 环境变量模板
```

## 3. 管理前端 (audit-frontend)
基于 Vue 3 + TypeScript 构建的 Web 管理界面。

### 技术栈
- Vue 3
- TypeScript
- Vite
- Vue Router
- Axios (HTTP 客户端)
- Element Plus (UI 组件库)
- ECharts (数据可视化)

### 目录结构
```
audit-frontend/
├── src/
│   ├── components/     # 可复用组件
│   ├── views/          # 页面组件
│   ├── router/         # 路由配置
│   ├── services/       # API 服务
│   ├── utils/          # 工具函数
│   ├── App.vue         # 根组件
│   └── main.ts         # 应用入口
└── .env.example        # 环境变量模板
```

## 快速开始

### 后端服务
```bash
cd audit-backend
npm install
cp .env.example .env
# 编辑 .env 文件配置数据库连接
npm run dev
```

### 前端服务
```bash
cd audit-frontend
npm install
cp .env.example .env
# 编辑 .env 文件配置 API 地址
npm run dev
```

## 数据库
使用阿里云 MySQL RDS 8.0 进行数据持久化。

## 下一步
参考 `.kiro/specs/audit-backend-system/tasks.md` 继续实现后续功能。
