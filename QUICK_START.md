# 快速开始 - 测试登录功能

## 步骤 1: 启动后端服务

```bash
cd audit-backend
npm run dev
```

确保看到：`Server running on port 3000`

## 步骤 2: 创建测试用户

在 `audit-backend` 目录运行：

```bash
node setup-admin.js
```

这会创建一个管理员账号：
- 用户名: `admin`
- 密码: `admin123`

## 步骤 3: 重新构建插件

在项目根目录运行：

```bash
npm run dev
```

## 步骤 4: 重新加载插件

1. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
2. 找到 "Product Audit Assistant"
3. 点击刷新按钮 🔄

## 步骤 5: 访问目标网站

访问：`https://admin.pinhaopin.com`

## 步骤 6: 查看登录界面

应该会看到一个登录弹窗，包含：
- 🛡️ 图标
- "商品审核助手" 标题
- 用户名输入框
- 密码输入框
- 登录按钮

## 步骤 7: 登录

输入：
- 用户名: `admin`
- 密码: `admin123`

点击"登录"按钮

## 步骤 8: 验证登录成功

登录成功后应该：
1. 登录界面消失
2. 显示控制面板
3. 右上角显示用户名 "admin"
4. 控制台显示 `[Audit] 登录成功！`

## 调试工具

如果遇到问题，打开浏览器控制台（F12），复制粘贴 `debug-login.js` 的内容并运行。

### 快速命令

```javascript
// 清除登录状态
clearAuth();

// 设置 API URL
setApiUrl('http://localhost:3000');

// 手动登录测试
manualLogin('admin', 'admin123', 'http://localhost:3000');
```

## 常见问题

### Q: 看不到登录界面？

**检查清单：**
- [ ] 后端服务是否运行？
- [ ] 插件是否重新加载？
- [ ] 浏览器控制台有错误吗？
- [ ] 是否在正确的网站（admin.pinhaopin.com）？

**解决方法：**
```javascript
// 在控制台运行
console.log('Panel:', document.querySelector('product-audit-panel'));
```

### Q: 登录按钮无响应？

**检查清单：**
- [ ] 后端服务运行在 http://localhost:3000？
- [ ] 网络请求是否被 CORS 阻止？
- [ ] 控制台有网络错误吗？

**解决方法：**
1. 打开 Network 标签
2. 点击登录
3. 查看 `/api/auth/login` 请求

### Q: 登录成功但界面不变？

**解决方法：**
```javascript
// 手动刷新页面
location.reload();
```

## 完整测试流程

```bash
# 1. 启动后端
cd audit-backend
npm run dev

# 2. 新终端，启动插件开发
cd ..
npm run dev

# 3. 在浏览器中
# - 重新加载插件
# - 访问 https://admin.pinhaopin.com
# - 应该看到登录界面
# - 输入 admin / admin123
# - 点击登录
# - 看到控制面板
```

## 成功标志

✅ 看到登录界面
✅ 输入凭据后可以登录
✅ 登录后显示控制面板
✅ 右上角显示用户名
✅ 可以点击退出登录
✅ 刷新页面后保持登录状态

## 需要帮助？

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整日志
2. Network 标签的截图
3. 后端服务的日志输出
