# 商品审核后端系统 - API 服务

## 项目结构

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
├── .env                # 环境变量（不提交到版本控制）
├── .env.example        # 环境变量模板
├── package.json
└── tsconfig.json
```

## 安装依赖

```bash
npm install
```

## 配置环境变量

复制 `.env.example` 到 `.env` 并填写实际配置：

```bash
cp .env.example .env
```

## 开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

## 运行生产版本

```bash
npm start
```

## 测试

```bash
npm test
```
