# 登录功能说明

## 功能概述

插件现在支持使用账号密码登录，通过后端服务进行身份认证。登录后，所有审核记录将使用 JWT token 进行认证。

## 新增文件

1. **components/LoginPanel.vue** - 登录界面组件
2. **utils/auth.ts** - 认证工具函数

## 修改文件

1. **entrypoints/content.ts** - 集成登录检查和状态管理
2. **components/ControlPanel.vue** - 添加用户信息显示和退出登录按钮
3. **utils/auditApi.ts** - 使用 JWT token 替代 API Key

## 使用流程

### 1. 首次使用

当用户打开插件时，如果未登录，会自动显示登录界面：

- 输入用户名和密码
- 点击"登录"按钮
- 登录成功后自动进入主界面

### 2. 配置后端 API 地址

在主界面点击设置按钮，配置：
- **API URL**: 后端服务地址（例如：`http://localhost:3000`）

### 3. 使用审核功能

登录后即可正常使用所有审核功能，审核记录会自动发送到后端。

### 4. 退出登录

点击右上角的退出登录按钮，清除本地认证信息。

## 技术实现

### 认证流程

1. 用户输入用户名和密码
2. 调用后端 `/api/auth/login` 接口
3. 后端验证成功后返回 JWT token 和用户信息
4. 插件将 token 和用户信息保存到本地存储
5. 后续所有 API 请求在 Header 中携带 `Authorization: Bearer <token>`

### 数据存储

使用 WXT 的 storage API 存储：
- `local:auth_token` - JWT 认证令牌
- `local:user_info` - 用户信息（id, username, role）

### 安全性

- 密码在传输前不进行客户端加密（依赖 HTTPS）
- Token 存储在浏览器本地存储中
- Token 有效期为 24 小时（由后端配置）
- 退出登录时清除所有认证信息

## 后端接口要求

### 登录接口

**POST** `/api/auth/login`

请求体：
```json
{
  "username": "string",
  "password": "string"
}
```

成功响应：
```json
{
  "success": true,
  "token": "jwt-token-string",
  "user": {
    "id": "user-id",
    "username": "username",
    "role": "user|admin"
  }
}
```

失败响应：
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 审核记录接口

**POST** `/api/audit-records`

请求头：
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

请求体：
```json
{
  "productId": "string",
  "productTitle": "string",
  "productImage": "string",
  "submitTime": "ISO-8601 datetime",
  "aiProcessingTime": "number (ms)",
  "rejectionReason": "string",
  "auditStage": "text|image|business_scope",
  "apiError": "string (optional)",
  "textRequest": "string (optional)",
  "textResponse": "string (optional)",
  "imageRequest": "string (optional)",
  "imageResponse": "string (optional)",
  "scopeRequest": "string (optional)",
  "scopeResponse": "string (optional)"
}
```

## 开发和测试

### 本地开发

1. 启动后端服务：
```bash
cd audit-backend
npm run dev
```

2. 启动插件开发模式：
```bash
npm run dev
```

3. 在浏览器中加载插件

4. 访问 `https://admin.pinhaopin.com`

5. 使用测试账号登录（需要先在后端创建用户）

### 创建测试用户

使用后端提供的 setup-admin.js 脚本：
```bash
cd audit-backend
node setup-admin.js
```

或通过 API 注册（需要管理员权限）：
```bash
POST /api/auth/register
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "role": "user"
}
```

## 常见问题

### Q: 登录后刷新页面需要重新登录吗？
A: 不需要。Token 保存在本地存储中，刷新页面后会自动恢复登录状态。

### Q: Token 过期后会怎样？
A: Token 过期后，API 请求会返回 401 错误。用户需要重新登录。

### Q: 可以同时登录多个账号吗？
A: 不可以。每次登录会覆盖之前的认证信息。

### Q: 忘记密码怎么办？
A: 目前没有密码重置功能，需要联系管理员重置密码。

## 未来改进

- [ ] 添加"记住我"功能
- [ ] 添加密码重置功能
- [ ] 添加 Token 自动刷新机制
- [ ] 添加多账号切换功能
- [ ] 添加登录历史记录
