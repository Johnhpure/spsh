# 登录功能测试指南

## 问题排查步骤

### 1. 检查插件是否加载

打开浏览器控制台（F12），查看是否有以下日志：
```
Product Audit Extension Loaded
```

### 2. 检查登录界面是否显示

- 如果看到登录界面，说明功能正常
- 如果没有看到，检查控制台是否有错误

### 3. 检查后端服务

确保后端服务正在运行：
```bash
cd audit-backend
npm run dev
```

应该看到：
```
Server running on port 3000
```

### 4. 测试登录

1. 在登录界面输入用户名和密码
2. 打开浏览器控制台，查看日志：
   - `[Login] API URL: http://localhost:3000`
   - `[Login] Attempting login to: http://localhost:3000/api/auth/login`
   - `[Login] Response status: 200`
   - `[Login] Login successful, token saved`

### 5. 常见问题

#### 问题1: 看不到登录界面

**可能原因：**
- 插件未正确加载
- Shadow DOM 未正确创建
- CSS 样式问题

**解决方法：**
1. 重新加载插件
2. 检查控制台错误
3. 检查页面 DOM 中是否有 `product-audit-panel` 元素

#### 问题2: 登录按钮无响应

**可能原因：**
- 后端服务未启动
- API URL 配置错误
- CORS 问题

**解决方法：**
1. 确认后端服务运行在 http://localhost:3000
2. 检查控制台网络请求
3. 检查后端 CORS 配置

#### 问题3: 登录成功但界面不切换

**可能原因：**
- Vue 响应式更新问题
- emit 事件未正确触发

**解决方法：**
1. 检查控制台是否有 `[Login] Login successful, token saved`
2. 检查是否有 `登录成功！` 日志
3. 手动刷新页面

### 6. 手动测试登录 API

使用 curl 或 Postman 测试：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

预期响应：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

### 7. 清除缓存重新测试

如果遇到问题，尝试清除本地存储：

```javascript
// 在浏览器控制台执行
chrome.storage.local.remove(['auth_token', 'user_info']);
```

或者手动清除：
1. 打开 Chrome 扩展管理页面
2. 找到插件，点击"详细信息"
3. 点击"清除存储"

### 8. 调试技巧

在控制台执行以下命令查看存储状态：

```javascript
// 查看认证状态
chrome.storage.local.get(['auth_token', 'user_info'], (result) => {
  console.log('Auth Token:', result.auth_token);
  console.log('User Info:', result.user_info);
});
```

### 9. 重新构建插件

如果修改了代码，确保重新构建：

```bash
npm run dev
```

然后在浏览器中重新加载插件。

### 10. 检查网络请求

在浏览器开发者工具的 Network 标签中：
1. 筛选 XHR/Fetch 请求
2. 查找 `/api/auth/login` 请求
3. 检查请求头、请求体和响应

## 预期行为

1. **首次打开插件**：显示登录界面
2. **输入凭据并登录**：界面切换到控制面板
3. **刷新页面**：自动恢复登录状态，直接显示控制面板
4. **点击退出登录**：返回登录界面

## 如果还是不行

请提供以下信息：
1. 浏览器控制台的完整日志
2. Network 标签中的请求详情
3. 后端服务的日志
4. 插件是否正确加载（在扩展管理页面查看）
