# 商品审核管理前端

## 项目结构

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
├── public/             # 静态资源
├── .env                # 环境变量（不提交到版本控制）
├── .env.example        # 环境变量模板
├── package.json
└── vite.config.ts
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

## 预览生产版本

```bash
npm run preview
```
